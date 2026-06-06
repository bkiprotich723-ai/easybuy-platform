const express = require("express");
const db = require("../db");
const { verifyToken } = require("../middleware/authMiddleware");

const router = express.Router();

// ADD REVIEW
router.post("/add", verifyToken, async (req, res) => {
    const { product_id, rating, comment } = req.body;
    const buyer_id = req.user.id;

    if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }

    try {
        await db.query(
            `INSERT INTO reviews (buyer_id, product_id, rating, comment)
             VALUES ($1, $2, $3, $4)`,
            [buyer_id, product_id, rating, comment]
        );
        res.json({ message: "Review added successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET REVIEWS FOR A PRODUCT
router.get("/:product_id", async (req, res) => {
    try {
        const result = await db.query(
            `SELECT r.*, u.name as buyer_name
             FROM reviews r
             JOIN users u ON r.buyer_id = u.id
             WHERE r.product_id = $1
             ORDER BY r.created_at DESC`,
            [req.params.product_id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET MY REVIEWS
router.get("/my/reviews", verifyToken, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT r.*, p.name as product_name
             FROM reviews r
             JOIN products p ON r.product_id = p.id
             WHERE r.buyer_id = $1
             ORDER BY r.created_at DESC`,
            [req.user.id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;