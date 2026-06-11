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

module.exports = router;