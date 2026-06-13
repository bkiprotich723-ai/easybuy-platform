const express = require("express");
const db = require("../db");
const { verifyToken } = require("../middleware/authMiddleware");

const router = express.Router();

// ADD TO CART
router.post("/add", verifyToken, async (req, res) => {
    const { product_id } = req.body;
    const user_id = req.user.id;
    try {
        const existing = await db.query(
            "SELECT * FROM cart WHERE user_id = $1 AND product_id = $2",
            [user_id, product_id]
        );

        if (existing.rows[0]) {
            await db.query(
                "UPDATE cart SET quantity = quantity + 1 WHERE user_id = $1 AND product_id = $2",
                [user_id, product_id]
            );
        } else {
            await db.query(
                "INSERT INTO cart (user_id, product_id, quantity) VALUES ($1, $2, 1)",
                [user_id, product_id]
            );
        }
        res.json({ message: "Added to cart" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET MY CART
router.get("/", verifyToken, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT c.*, p.name, p.price, p.image, p.stock, p.description
             FROM cart c
             JOIN products p ON c.product_id = p.id
             WHERE c.user_id = $1`,
            [req.user.id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// REMOVE FROM CART
router.delete("/:product_id", verifyToken, async (req, res) => {
    try {
        await db.query(
            "DELETE FROM cart WHERE user_id = $1 AND product_id = $2",
            [req.user.id, req.params.product_id]
        );
        res.json({ message: "Removed from cart" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// CLEAR CART
router.delete("/", verifyToken, async (req, res) => {
    try {
        await db.query("DELETE FROM cart WHERE user_id = $1", [req.user.id]);
        res.json({ message: "Cart cleared" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// UPDATE QUANTITY
router.patch("/:product_id", verifyToken, async (req, res) => {
    const { quantity } = req.body;
    try {
        if (quantity <= 0) {
            await db.query(
                "DELETE FROM cart WHERE user_id = $1 AND product_id = $2",
                [req.user.id, req.params.product_id]
            );
        } else {
            await db.query(
                "UPDATE cart SET quantity = $1 WHERE user_id = $2 AND product_id = $3",
                [quantity, req.user.id, req.params.product_id]
            );
        }
        res.json({ message: "Cart updated" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// BUY ALL CART ITEMS
router.post("/buyall", verifyToken, async (req, res) => {
    const user_id = req.user.id;
    const client = await db.connect();
    try {
        await client.query("BEGIN");

        const cartResult = await client.query(
            `SELECT c.*, p.price, p.stock, p.seller_id, p.name
             FROM cart c
             JOIN products p ON c.product_id = p.id
             WHERE c.user_id = $1`,
            [user_id]
        );
        const cartItems = cartResult.rows;

        if (cartItems.length === 0) {
            await client.query("ROLLBACK");
            return res.status(400).json({ message: "Cart is empty" });
        }

        // Check stock for all items first
        for (const item of cartItems) {
            if (item.stock < item.quantity) {
                await client.query("ROLLBACK");
                return res.status(400).json({ message: `Only ${item.stock} item(s) of "${item.name}" available` });
            }
        }

        // Calculate total
        const total = cartItems.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0);

        // Check wallet balance
        const walletResult = await client.query(
            "SELECT balance FROM wallets WHERE user_id = $1 FOR UPDATE",
            [user_id]
        );
        if (!walletResult.rows[0] || parseFloat(walletResult.rows[0].balance) < total) {
            await client.query("ROLLBACK");
            return res.status(400).json({ message: "Insufficient wallet balance" });
        }

        // Deduct from buyer wallet
        await client.query("UPDATE wallets SET balance = balance - $1 WHERE user_id = $2", [total, user_id]);
        await client.query(
            `INSERT INTO wallet_transactions (user_id, type, amount, description) VALUES ($1, 'purchase', $2, $3)`,
            [user_id, -total, `Cart purchase of ${cartItems.length} items`]
        );

        // Process each item
        for (const item of cartItems) {
            const amount = parseFloat(item.price) * item.quantity;

            const orderResult = await client.query(
                "INSERT INTO orders (buyer_id, product_id, amount) VALUES ($1, $2, $3) RETURNING id",
                [user_id, item.product_id, amount]
            );
            const orderId = orderResult.rows[0].id;

            // Deduct stock
            await client.query(
                "UPDATE products SET stock = stock - $1 WHERE id = $2",
                [item.quantity, item.product_id]
            );

            // Seller earnings 90%
            const sellerAmount = amount * 0.90;
            await client.query(
                "INSERT INTO seller_earnings (seller_id, order_id, amount) VALUES ($1, $2, $3)",
                [item.seller_id, orderId, sellerAmount]
            );
            await client.query(
                "UPDATE wallets SET balance = balance + $1 WHERE user_id = $2",
                [sellerAmount, item.seller_id]
            );
            await client.query(
                `INSERT INTO wallet_transactions (user_id, type, amount, description) VALUES ($1, 'sale', $2, $3)`,
                [item.seller_id, sellerAmount, `Sale of ${item.quantity}x from order #${orderId}`]
            );
        }

        // Clear cart
        await client.query("DELETE FROM cart WHERE user_id = $1", [user_id]);

        await client.query("COMMIT");
        res.json({ message: "All items purchased successfully", total });

    } catch (err) {
        await client.query("ROLLBACK");
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

module.exports = router;