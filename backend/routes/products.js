const express = require("express");
const db = require("../db");
const { verifyToken } = require("../middleware/authMiddleware");

const router = express.Router();

// CREATE PRODUCT (SELLER ONLY)
router.post("/add", verifyToken, async (req, res) => {
    const seller_id = req.user.id;
    const { name, description, price, image, stock, category, specifications } = req.body;

    if (!name || !price) {
        return res.status(400).json({ message: "Name and price are required" });
    }

    if (isNaN(price) || price <= 0) {
        return res.status(400).json({ message: "Price must be a valid number greater than 0" });
    }

    try {
        const result = await db.query(
            `INSERT INTO products (seller_id, name, description, price, image, stock, category, specifications)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING id`,
            [seller_id, name, description, price, image, stock || 0, category || 'general', specifications || '']
        );

        res.json({
            message: "Product added successfully",
            product_id: result.rows[0].id
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET SELLER'S OWN PRODUCTS
router.get("/my-products", verifyToken, async (req, res) => {
    try {
        const result = await db.query(
            "SELECT * FROM products WHERE seller_id = $1",
            [req.user.id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// TOP PRODUCTS (SELLER ANALYTICS)
router.get("/top-products", verifyToken, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT p.id, p.name, SUM(se.amount) as total_earned
             FROM seller_earnings se
             JOIN orders o ON se.order_id = o.id
             JOIN products p ON o.product_id = p.id
             WHERE se.seller_id = $1
             GROUP BY p.id, p.name
             ORDER BY total_earned DESC
             LIMIT 5`,
            [req.user.id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET ALL PRODUCTS (PUBLIC) with search and category filter
router.get("/", async (req, res) => {
    const { search, category } = req.query;
    try {
        let query = "SELECT * FROM products WHERE 1=1";
        const params = [];

        if (search) {
            params.push(`%${search}%`);
            query += ` AND (name ILIKE $${params.length} OR description ILIKE $${params.length})`;
        }

        if (category && category !== 'all') {
            params.push(category);
            query += ` AND category = $${params.length}`;
        }

        query += " ORDER BY created_at DESC";
        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET SINGLE PRODUCT (PUBLIC)
router.get("/:id", async (req, res) => {
    try {
        const result = await db.query(
            "SELECT * FROM products WHERE id = $1",
            [req.params.id]
        );
        const product = result.rows[0];

        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        res.json(product);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// UPDATE PRODUCT (SELLER)
router.put("/:id", verifyToken, async (req, res) => {
    const { name, description, price, image, stock, category, specifications } = req.body;
    try {
        await db.query(
            `UPDATE products SET name=$1, description=$2, price=$3, image=$4, stock=$5, category=$6, specifications=$7
             WHERE id=$8 AND seller_id=$9`,
            [name, description, price, image, stock, category || 'general', specifications || '', req.params.id, req.user.id]
        );
        res.json({ message: "Product updated successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE PRODUCT (SELLER)
router.delete("/:id", verifyToken, async (req, res) => {
    try {
        await db.query(
            `DELETE FROM products WHERE id=$1 AND seller_id=$2`,
            [req.params.id, req.user.id]
        );
        res.json({ message: "Product deleted successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// UPDATE STOCK (SELLER)
router.patch("/:id/stock", verifyToken, async (req, res) => {
    const { stock } = req.body;
    try {
        await db.query(
            `UPDATE products SET stock=$1 WHERE id=$2 AND seller_id=$3`,
            [stock, req.params.id, req.user.id]
        );
        res.json({ message: "Stock updated successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
