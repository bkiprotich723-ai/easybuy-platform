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

        // APPROVE WITHDRAWAL
router.post("/withdrawals/:id/approve", verifyToken, authorizeRoles("admin"), async (req, res) => {
    const client = await db.connect();
    try {
        await client.query("BEGIN");

        const { id } = req.params;
        const withdrawalResult = await client.query(
            "SELECT * FROM withdrawals WHERE id = $1", [id]
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

        // Just update status — balance already deducted on request
        await client.query(
            "UPDATE withdrawals SET status = 'approved' WHERE id = $1", [id]
        );

        await client.query(
            `INSERT INTO wallet_transactions (user_id, type, amount, description)
             VALUES ($1, 'withdrawal', $2, $3)`,
            [withdrawal.user_id, -withdrawal.amount, `Withdrawal #${id} approved`]
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

// REJECT WITHDRAWAL — refund balance back to user
router.post("/withdrawals/:id/reject", verifyToken, authorizeRoles("admin"), async (req, res) => {
    const client = await db.connect();
    try {
        await client.query("BEGIN");

        const { id } = req.params;
        const withdrawalResult = await client.query(
            "SELECT * FROM withdrawals WHERE id = $1", [id]
        );
        const withdrawal = withdrawalResult.rows[0];

        if (!withdrawal) {
            await client.query("ROLLBACK");
            return res.status(404).json({ message: "Withdrawal not found" });
        }

        if (withdrawal.status !== "pending") {
            await client.query("ROLLBACK");
            return res.json({ message: "Can only reject pending withdrawals" });
        }

        // Refund balance back
        await client.query(
            "UPDATE wallets SET balance = balance + $1 WHERE user_id = $2",
            [withdrawal.amount, withdrawal.user_id]
        );

        await client.query(
            `INSERT INTO wallet_transactions (user_id, type, amount, description)
             VALUES ($1, 'withdrawal_refund', $2, $3)`,
            [withdrawal.user_id, withdrawal.amount, `Withdrawal #${id} rejected — amount refunded`]
        );

        await client.query(
            "UPDATE withdrawals SET status = 'rejected' WHERE id = $1", [id]
        );

        await client.query("COMMIT");
        res.json({ message: "Withdrawal rejected and amount refunded" });

    } catch (err) {
        await client.query("ROLLBACK");
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});   


// BAN / RESTRICT / ACTIVATE USER
router.post("/users/:id/status", verifyToken, authorizeRoles("admin"), async (req, res) => {
    const { status } = req.body;
    if (!['active', 'banned', 'restricted'].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
    }
    try {
        await db.query("UPDATE users SET status = $1 WHERE id = $2", [status, req.params.id]);
        res.json({ message: `User ${status} successfully` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE USER
router.delete("/users/:id", verifyToken, authorizeRoles("admin"), async (req, res) => {
    try {
        await db.query("DELETE FROM users WHERE id = $1", [req.params.id]);
        res.json({ message: "User deleted successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// CREATE ADMIN USER
router.post("/create-admin", verifyToken, authorizeRoles("admin"), async (req, res) => {
    const { name, email, password } = req.body;
    const bcrypt = require("bcrypt");

    if (!name || !email || !password) {
        return res.status(400).json({ message: "Name, email and password are required" });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const referralCode = "REF" + Date.now();

        const result = await db.query(
            `INSERT INTO users (name, email, password, role, referral_code)
             VALUES ($1, $2, $3, 'admin', $4)
             RETURNING id`,
            [name, email, hashedPassword, referralCode]
        );

        await db.query(
            "INSERT INTO wallets (user_id, balance) VALUES ($1, 0)",
            [result.rows[0].id]
        );

        res.json({ message: "Admin created successfully", userId: result.rows[0].id });
    } catch (err) {
        if (err.code === "23505") {
            return res.status(400).json({ message: "Email already in use" });
        }
        res.status(500).json({ error: err.message });
    }
});

// PROMOTE USER TO ADMIN
router.post("/users/:id/promote", verifyToken, authorizeRoles("admin"), async (req, res) => {
    try {
        await db.query(
            "UPDATE users SET role = 'admin' WHERE id = $1",
            [req.params.id]
        );
        res.json({ message: "User promoted to admin successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
