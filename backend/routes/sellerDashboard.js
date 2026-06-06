const express = require("express");
const db = require("../db");
const { verifyToken } = require("../middleware/authMiddleware");

const router = express.Router();

// 📊 TOTAL EARNINGS
router.get("/total-earnings", verifyToken, async (req, res) => {
    try {
        const result = await db.query(
            "SELECT SUM(amount) as total FROM seller_earnings WHERE seller_id = $1",
            [req.user.id]
        );
        res.json({
            total_earnings: parseFloat(result.rows[0].total) || 0
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 📦 TOTAL SALES COUNT
router.get("/total-sales", verifyToken, async (req, res) => {
    try {
        const result = await db.query(
            "SELECT COUNT(*) as total_sales FROM seller_earnings WHERE seller_id = $1",
            [req.user.id]
        );
        res.json({
            total_sales: parseInt(result.rows[0].total_sales) || 0
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 🏆 TOP PRODUCTS (fixed JOIN)
router.get("/top-products", verifyToken, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT p.name, SUM(se.amount) as total_earned
             FROM seller_earnings se
             JOIN orders o ON se.order_id = o.id
             JOIN products p ON o.product_id = p.id
             WHERE se.seller_id = $1
             GROUP BY p.name
             ORDER BY total_earned DESC
             LIMIT 5`,
            [req.user.id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 📜 RECENT EARNINGS
router.get("/recent", verifyToken, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT * FROM seller_earnings
             WHERE seller_id = $1
             ORDER BY created_at DESC
             LIMIT 10`,
            [req.user.id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
