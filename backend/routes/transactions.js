const express = require("express");
const db = require("../db");
const { verifyToken } = require("../middleware/authMiddleware");

const router = express.Router();

// BUY PRODUCT
router.post("/buy", async (req, res) => {
    const { product_id, quantity = 1, ref_code } = req.body;
    const buyer_id = req.user?.id;
    const client = await db.connect();
    try {
        await client.query("BEGIN");

        const productResult = await client.query("SELECT * FROM products WHERE id = $1", [product_id]);
        const product = productResult.rows[0];
        if (!product) {
            await client.query("ROLLBACK");
            return res.status(404).json({ message: "Product not found" });
        }

        if (product.stock < quantity) {
            await client.query("ROLLBACK");
            return res.status(400).json({ message: `Only ${product.stock} item(s) available in stock` });
        }

        const amount = product.price * quantity;

        const orderResult = await client.query(
            "INSERT INTO orders (buyer_id, product_id, amount) VALUES ($1, $2, $3) RETURNING id",
            [buyer_id, product_id, amount]
        );
        const orderId = orderResult.rows[0].id;

        // Deduct from buyer wallet
        const buyerWallet = await client.query(
            "SELECT balance FROM wallets WHERE user_id = $1 FOR UPDATE", [buyer_id]
        );
        if (!buyerWallet.rows[0] || parseFloat(buyerWallet.rows[0].balance) < parseFloat(amount)) {
            await client.query("ROLLBACK");
            return res.status(400).json({ message: "Insufficient wallet balance" });
        }

        await client.query(
            "UPDATE wallets SET balance = balance - $1 WHERE user_id = $2", [amount, buyer_id]
        );
        await client.query(
            `INSERT INTO wallet_transactions (user_id, type, amount, description) VALUES ($1, 'purchase', $2, $3)`,
            [buyer_id, -amount, `Purchase of ${quantity}x product #${product_id}`]
        );

        // Reduce stock
        await client.query(
            "UPDATE products SET stock = stock - $1 WHERE id = $2", [quantity, product_id]
        );

        // Credit seller 90%
        const sellerAmount = amount * 0.90;
        await client.query(
            "INSERT INTO seller_earnings (seller_id, order_id, amount) VALUES ($1, $2, $3)",
            [product.seller_id, orderId, sellerAmount]
        );
        await client.query(
            "UPDATE wallets SET balance = balance + $1 WHERE user_id = $2", [sellerAmount, product.seller_id]
        );
        await client.query(
            `INSERT INTO wallet_transactions (user_id, type, amount, description) VALUES ($1, 'sale', $2, $3)`,
            [product.seller_id, sellerAmount, `Sale of ${quantity}x from order #${orderId}`]
        );

        // ── Credit affiliate 10% commission ──────────────────────────────────
        // Priority: buyer's referred_by on account first, then ref_code from request
        const buyerResult = await client.query(
            "SELECT referred_by FROM users WHERE id = $1", [buyer_id]
        );
        const buyer = buyerResult.rows[0];

        // Use account referral or fallback to ref_code sent from product promo link
        const effectiveRefCode = buyer?.referred_by || ref_code || null;

        if (effectiveRefCode) {
            const referrerResult = await client.query(
                "SELECT id FROM users WHERE referral_code = $1", [effectiveRefCode]
            );
            const referrer = referrerResult.rows[0];
            if (referrer && referrer.id !== buyer_id) {
                const commission = amount * 0.10;

                // Create wallet if somehow missing
                const walletCheck = await client.query(
                    "SELECT id FROM wallets WHERE user_id = $1", [referrer.id]
                );
                if (!walletCheck.rows[0]) {
                    await client.query(
                        "INSERT INTO wallets (user_id, balance) VALUES ($1, 0)", [referrer.id]
                    );
                }

                await client.query(
                    "UPDATE wallets SET balance = balance + $1 WHERE user_id = $2",
                    [commission, referrer.id]
                );
                await client.query(
                    `INSERT INTO wallet_transactions (user_id, type, amount, description) VALUES ($1, 'commission', $2, $3)`,
                    [referrer.id, commission, `10% commission from order #${orderId} — ${product.name}`]
                );
            }
        }

        await client.query("COMMIT");
        res.json({ message: "Purchase successful", order_id: orderId, amount, quantity });

    } catch (err) {
        await client.query("ROLLBACK");
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// GET MY ORDERS
router.get("/my-orders", async (req, res) => {
    try {
        const result = await db.query(
            `SELECT o.*, p.name as product_name 
             FROM orders o
             JOIN products p ON o.product_id = p.id
             WHERE o.buyer_id = $1
             ORDER BY o.created_at DESC`,
            [req.user.id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET WALLET BALANCE
router.get("/wallet", async (req, res) => {
    try {
        const result = await db.query(
            "SELECT balance FROM wallets WHERE user_id = $1", [req.user.id]
        );
        res.json({ balance: result.rows[0]?.balance || 0 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// MARK ORDER AS DELIVERED
router.patch("/:id/deliver", verifyToken, async (req, res) => {
    try {
        await db.query(`UPDATE orders SET status='delivered' WHERE id=$1`, [req.params.id]);
        res.json({ message: "Order marked as delivered" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET SELLER ORDERS
router.get("/seller-orders", verifyToken, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT o.*, p.name as product_name, u.name as buyer_name
             FROM orders o
             JOIN products p ON o.product_id = p.id
             JOIN users u ON o.buyer_id = u.id
             WHERE p.seller_id = $1
             ORDER BY o.created_at DESC`,
            [req.user.id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DEPOSIT TO WALLET
router.post("/deposit", verifyToken, async (req, res) => {
    const { amount } = req.body;
    const user_id = req.user.id;
    if (!amount || isNaN(amount) || amount <= 0) {
        return res.status(400).json({ message: "Valid amount required" });
    }
    const client = await db.connect();
    try {
        await client.query("BEGIN");
        await client.query(
            "UPDATE wallets SET balance = balance + $1 WHERE user_id = $2", [amount, user_id]
        );
        await client.query(
            `INSERT INTO wallet_transactions (user_id, type, amount, description) VALUES ($1, 'deposit', $2, $3)`,
            [user_id, amount, `Wallet deposit of KES ${amount}`]
        );
        await client.query("COMMIT");
        res.json({ message: "Deposit successful", amount });
    } catch (err) {
        await client.query("ROLLBACK");
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

module.exports = router;
