const express = require("express");
const db = require("../db");
const { verifyToken } = require("../middleware/authMiddleware");
const { creditReferrerOnActivation } = require("./auth");
const router = express.Router();
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

async function sendOrderEmails(seller, buyer, product, order) {
    const dashboardUrl = "https://easybuy-platform.vercel.app/seller";

    // Email to seller
    await transporter.sendMail({
        from: `"EasyBuy" <${process.env.EMAIL_USER}>`,
        to: seller.email,
        subject: `🛒 New order received — ${product.name}`,
        html: `
            <div style="font-family:sans-serif;max-width:480px;margin:auto;background:#0f1117;color:#e2e8f0;padding:32px;border-radius:12px;">
                <h2 style="color:#5dd6a3;">EasyBuy — New Order!</h2>
                <p>Hi <b>${seller.name}</b>, you just received a new order.</p>
                <div style="background:#161b27;border-radius:10px;padding:16px;margin:20px 0;">
                    <div style="margin-bottom:8px;"><span style="color:#8892a4;">Product:</span> <b>${product.name}</b></div>
                    <div style="margin-bottom:8px;"><span style="color:#8892a4;">Quantity:</span> <b>${order.quantity}</b></div>
                    <div style="margin-bottom:8px;"><span style="color:#8892a4;">Order total:</span> <b>KES ${order.amount.toLocaleString()}</b></div>
                    <div style="margin-bottom:8px;"><span style="color:#8892a4;">Your earnings (90%):</span> <b style="color:#5dd6a3;">KES ${order.sellerAmount.toLocaleString()}</b></div>
                    <div><span style="color:#8892a4;">Buyer:</span> <b>${buyer.name}</b></div>
                </div>
                <p style="color:#8892a4;">Please prepare the order and mark it as delivered once done.</p>
                <a href="${dashboardUrl}" style="display:block;background:#5dd6a3;color:#0f2820;padding:12px;border-radius:8px;text-align:center;text-decoration:none;font-weight:600;margin-top:16px;">
                    Go to Seller Dashboard →
                </a>
                <p style="color:#5a6480;font-size:12px;margin-top:20px;">Order #${order.id} · EasyBuy Platform</p>
            </div>
        `,
    });

    // Email to buyer
    await transporter.sendMail({
        from: `"EasyBuy" <${process.env.EMAIL_USER}>`,
        to: buyer.email,
        subject: `✅ Order confirmed — ${product.name}`,
        html: `
            <div style="font-family:sans-serif;max-width:480px;margin:auto;background:#0f1117;color:#e2e8f0;padding:32px;border-radius:12px;">
                <h2 style="color:#7c6ef7;">EasyBuy — Order Confirmed!</h2>
                <p>Hi <b>${buyer.name}</b>, your order has been placed successfully.</p>
                <div style="background:#161b27;border-radius:10px;padding:16px;margin:20px 0;">
                    <div style="margin-bottom:8px;"><span style="color:#8892a4;">Product:</span> <b>${product.name}</b></div>
                    <div style="margin-bottom:8px;"><span style="color:#8892a4;">Quantity:</span> <b>${order.quantity}</b></div>
                    <div style="margin-bottom:8px;"><span style="color:#8892a4;">Amount paid:</span> <b style="color:#7c6ef7;">KES ${order.amount.toLocaleString()}</b></div>
                    <div><span style="color:#8892a4;">Order ID:</span> <b>#${order.id}</b></div>
                </div>
                <p style="color:#8892a4;">The seller has been notified and will prepare your order shortly.</p>
                <p style="color:#5a6480;font-size:12px;margin-top:20px;">Thank you for shopping on EasyBuy 🛍</p>
            </div>
        `,
    });
}
// ACTIVATION FEES per role
const ACTIVATION_FEE = { seller: 500, affiliate: 100 };

// BUY PRODUCT
router.post("/buy", verifyToken, async (req, res) => {
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

        // Credit affiliate 10% commission
        // Priority: buyer's referred_by on account first, then ref_code from request
        const buyerResult = await client.query(
            "SELECT referred_by FROM users WHERE id = $1", [buyer_id]
        );
        const buyer = buyerResult.rows[0];
        const effectiveRefCode = buyer?.referred_by || ref_code || null;

        if (effectiveRefCode) {
            const referrerResult = await client.query(
                "SELECT id FROM users WHERE referral_code = $1", [effectiveRefCode]
            );
            const referrer = referrerResult.rows[0];
            if (referrer && referrer.id !== buyer_id) {
                const commission = amount * 0.10;
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

        // Send order emails to seller and buyer (non-blocking — don't fail the order if email fails)
        try {
            const sellerResult = await db.query(
                "SELECT name, email FROM users WHERE id = $1", [product.seller_id]
            );
            const buyerResult = await db.query(
                "SELECT name, email FROM users WHERE id = $1", [buyer_id]
            );
            if (sellerResult.rows[0] && buyerResult.rows[0]) {
                await sendOrderEmails(
                   sellerResult.rows[0],
                   buyerResult.rows[0],
                   product,
                  { id: orderId, amount, quantity, sellerAmount }
                );
            }
        } catch (emailErr) {
            console.error("Order email error:", emailErr.message);
            // Don't fail the request if email fails
        }

        res.json({ message: "Purchase successful", order_id: orderId, amount, quantity });

    } catch (err) {
        await client.query("ROLLBACK");
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// GET MY ORDERS
router.get("/my-orders", verifyToken, async (req, res) => {
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
router.get("/wallet", verifyToken, async (req, res) => {
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
// For sellers and affiliates this also handles account activation:
// - If they are inactive and deposit >= their activation fee, mark them active
//   and credit their referrer the correct bonus (KES 150 for seller, KES 30 for affiliate)
router.post("/deposit", verifyToken, async (req, res) => {
    const { amount } = req.body;
    const user_id = req.user.id;

    if (!amount || isNaN(amount) || amount <= 0) {
        return res.status(400).json({ message: "Valid amount required" });
    }

    const client = await db.connect();
    try {
        await client.query("BEGIN");

        // Fetch user to check role, activation status, and referrer
        const userResult = await client.query(
            "SELECT id, name, role, is_active, referred_by FROM users WHERE id = $1",
            [user_id]
        );
        const user = userResult.rows[0];

        await client.query(
            "UPDATE wallets SET balance = balance + $1 WHERE user_id = $2", [amount, user_id]
        );
        await client.query(
            `INSERT INTO wallet_transactions (user_id, type, amount, description) VALUES ($1, 'deposit', $2, $3)`,
            [user_id, amount, `Wallet deposit of KES ${amount}`]
        );

        let activated = false;
        const fee = ACTIVATION_FEE[user.role];

        // Activate account if: paid role + not yet active + deposited enough
        if (fee && !user.is_active && parseFloat(amount) >= fee) {
            await client.query(
                "UPDATE users SET is_active = true WHERE id = $1", [user_id]
            );
            activated = true;
        }

        await client.query("COMMIT");

        // Credit referrer AFTER commit so it's a separate clean transaction
        if (activated && user.referred_by) {
            await creditReferrerOnActivation(user.referred_by, user.name, user.role);
        }

        res.json({
            message: activated
                ? `Account activated! Welcome to EasyBuy as a ${user.role}.`
                : "Deposit successful",
            amount,
            activated,
        });

    } catch (err) {
        await client.query("ROLLBACK");
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

module.exports = router;