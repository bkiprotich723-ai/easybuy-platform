const express = require("express");
const router = express.Router();
const db = require("../db");

// GET /api/stats/public — real numbers for landing page
router.get("/public", async (req, res) => {
    try {
        const [users, products, payouts] = await Promise.all([
            db.query("SELECT COUNT(*) FROM users"),
            db.query("SELECT COUNT(*) FROM products"),
            db.query("SELECT COALESCE(SUM(amount), 0) AS total FROM seller_earnings"),
        ]);

        const userCount = parseInt(users.rows[0].count);
        const productCount = parseInt(products.rows[0].count);
        const payoutTotal = parseFloat(payouts.rows[0].total);

        // Format nicely
        const formatNum = (n) => n >= 1000 ? `${(n / 1000).toFixed(1)}K+` : `${n}+`;
        const formatKes = (n) => {
            if (n >= 1000000) return `KES ${(n / 1000000).toFixed(1)}M`;
            if (n >= 1000) return `KES ${(n / 1000).toFixed(0)}K`;
            return `KES ${n.toFixed(0)}`;
        };

        res.json({
            users: formatNum(userCount),
            products: formatNum(productCount),
            payouts: formatKes(payoutTotal),
        });
    } catch (err) {
        console.error("Stats error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
