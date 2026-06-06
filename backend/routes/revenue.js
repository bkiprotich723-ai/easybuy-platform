const express = require("express");
const db = require("../db");
const { verifyToken, authorizeRoles } = require("../middleware/authMiddleware");

const router = express.Router();

// 📊 ADMIN REVENUE SUMMARY
router.get("/summary", verifyToken, authorizeRoles("admin"), async (req, res) => {
    try {
        const [users, products, orders, revenue, withdrawals] = await Promise.all([
            db.query("SELECT COUNT(*) as total FROM users"),
            db.query("SELECT COUNT(*) as total FROM products"),
            db.query("SELECT COUNT(*) as total FROM orders"),
            db.query("SELECT SUM(amount) as total FROM orders"),
            db.query("SELECT SUM(amount) as total FROM withdrawals WHERE status = 'approved'")
        ]);

        res.json({
            totalUsers:       parseInt(users.rows[0].total),
            totalProducts:    parseInt(products.rows[0].total),
            totalOrders:      parseInt(orders.rows[0].total),
            totalRevenue:     parseFloat(revenue.rows[0].total) || 0,
            totalWithdrawals: parseFloat(withdrawals.rows[0].total) || 0
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 📈 TOP SELLING PRODUCTS (fixed JOIN)
router.get("/top-products", verifyToken, authorizeRoles("admin"), async (req, res) => {
    try {
        const result = await db.query(
            `SELECT p.name, SUM(se.amount) as total_earned
             FROM seller_earnings se
             JOIN orders o ON se.order_id = o.id
             JOIN products p ON o.product_id = p.id
             GROUP BY p.name
             ORDER BY total_earned DESC
             LIMIT 5`
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 💰 DAILY REVENUE
router.get("/daily", verifyToken, authorizeRoles("admin"), async (req, res) => {
    try {
        const result = await db.query(
            `SELECT DATE(created_at) as date, SUM(amount) as revenue
             FROM orders
             GROUP BY DATE(created_at)
             ORDER BY date DESC`
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
