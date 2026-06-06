const express = require("express");
const db = require("../db");
const { verifyToken, authorizeRoles } = require("../middleware/authMiddleware");

const router = express.Router();

// SUBMIT TICKET
router.post("/ticket", verifyToken, async (req, res) => {
    const { subject, message } = req.body;
    const user_id = req.user.id;

    if (!subject || !message) {
        return res.status(400).json({ message: "Subject and message are required" });
    }

    try {
        const result = await db.query(
            `INSERT INTO support_tickets (user_id, subject, message)
             VALUES ($1, $2, $3) RETURNING id`,
            [user_id, subject, message]
        );
        res.json({ message: "Ticket submitted successfully", ticket_id: result.rows[0].id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET MY TICKETS
router.get("/my-tickets", verifyToken, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT * FROM support_tickets WHERE user_id = $1 ORDER BY created_at DESC`,
            [req.user.id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET ALL TICKETS (ADMIN)
router.get("/all", verifyToken, authorizeRoles("admin"), async (req, res) => {
    try {
        const result = await db.query(
            `SELECT t.*, u.name as user_name, u.email as user_email
             FROM support_tickets t
             JOIN users u ON t.user_id = u.id
             ORDER BY t.created_at DESC`
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// CLOSE TICKET (ADMIN)
router.post("/close/:id", verifyToken, authorizeRoles("admin"), async (req, res) => {
    try {
        await db.query(
            `UPDATE support_tickets SET status = 'closed' WHERE id = $1`,
            [req.params.id]
        );
        res.json({ message: "Ticket closed" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;