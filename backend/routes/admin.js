const express = require("express");
const db = require("../db");
const { verifyToken, authorizeRoles } = require("../middleware/authMiddleware");

const router = express.Router();

// 📊 DASHBOARD STATS
router.get("/stats", verifyToken, authorizeRoles("admin"), async (req, res) => {
    try {
        const [users, products, orders, revenue, commissions] = await Promise.all([
            db.query("SELECT COUNT(*) as total FROM users"),
            db.query("SELECT COUNT(*) as total FROM products"),
            db.query("SELECT COUNT(*) as total FROM orders"),
            db.query("SELECT SUM(amount) as total FROM orders"),
            db.query("SELECT SUM(amount) as total FROM wallet_transactions WHERE type = 'commission'")
        ]);

        res.json({
            total_users: parseInt(users.rows[0].total),
            total_products: parseInt(products.rows[0].total),
            total_orders: parseInt(orders.rows[0].total),
            total_revenue: parseFloat(revenue.rows[0].total) || 0,
            total_commissions: parseFloat(commissions.rows[0].total) || 0
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 📦 ALL PRODUCTS (ADMIN VIEW)
router.get("/products", verifyToken, authorizeRoles("admin"), async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM products ORDER BY created_at DESC");
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 👥 ALL USERS
router.get("/users", verifyToken, authorizeRoles("admin"), async (req, res) => {
    try {
        const result = await db.query("SELECT id, name, email, role, created_at FROM users");
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 💰 ALL ORDERS
router.get("/orders", verifyToken, authorizeRoles("admin"), async (req, res) => {
    try {
        const result = await db.query(`
            SELECT o.*, p.name as product_name
            FROM orders o
            JOIN products p ON o.product_id = p.id
            ORDER BY o.created_at DESC
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 💸 ALL WITHDRAWALS
router.get("/withdrawals", verifyToken, authorizeRoles("admin"), async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM withdrawals ORDER BY created_at DESC");
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ✅ APPROVE WITHDRAWAL
router.post("/withdrawals/:id/approve", verifyToken, authorizeRoles("admin"), async (req, res) => {
    const client = await db.connect();
    try {
        await client.query("BEGIN");

        const { id } = req.params;

        const withdrawalResult = await client.query(
            "SELECT * FROM withdrawals WHERE id = $1",
            [id]
        );
        const withdrawal = withdrawalResult.rows[0];

        if (!withdrawal) {
            await client.query("ROLLBACK");
            return res.status(404).json({ message: "Withdrawal not found" });
        }

        if (withdrawal.status === "approved") {
            await client.query("ROLLBACK");
            return res.json({ message: "Already approved" });
        }

        const walletResult = await client.query(
            "SELECT * FROM wallets WHERE user_id = $1",
            [withdrawal.user_id]
        );
        const wallet = walletResult.rows[0];

        if (!wallet || wallet.balance < withdrawal.amount) {
            await client.query("ROLLBACK");
            return res.status(400).json({ message: "Insufficient balance" });
        }

        // Deduct wallet
        await client.query(
            "UPDATE wallets SET balance = balance - $1 WHERE user_id = $2",
            [withdrawal.amount, withdrawal.user_id]
        );

        // Log transaction
        await client.query(
            "INSERT INTO wallet_transactions (user_id, type, amount, description) VALUES ($1, $2, $3, $4)",
            [withdrawal.user_id, "withdrawal", -withdrawal.amount, "Withdrawal approved"]
        );

        // Update withdrawal status
        await client.query(
            "UPDATE withdrawals SET status = 'approved' WHERE id = $1",
            [id]
        );

        await client.query("COMMIT");
        res.json({ message: "Withdrawal approved successfully" });

    } catch (err) {
        await client.query("ROLLBACK");
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

module.exports = router;
