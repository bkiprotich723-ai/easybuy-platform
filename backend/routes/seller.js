const express = require("express");
const db = require("../db");
const { verifyToken } = require("../middleware/authMiddleware");

const router = express.Router();

// VIEW MY EARNINGS
router.get("/earnings", verifyToken, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT * FROM seller_earnings
             WHERE seller_id = $1
             ORDER BY created_at DESC`,
            [req.user.id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
