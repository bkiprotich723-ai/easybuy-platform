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

// GET TICKET WITH REPLIES
router.get("/ticket/:id", verifyToken, async (req, res) => {
    try {
        const ticket = await db.query(
            `SELECT t.*, u.name as user_name, u.email as user_email
             FROM support_tickets t
             JOIN users u ON t.user_id = u.id
             WHERE t.id = $1`,
            [req.params.id]
        );

        if (!ticket.rows[0]) {
            return res.status(404).json({ message: "Ticket not found" });
        }

        // Check access — user can only see their own tickets, admin can see all
        if (req.user.role !== 'admin' && ticket.rows[0].user_id !== req.user.id) {
            return res.status(403).json({ message: "Access denied" });
        }

        const replies = await db.query(
            `SELECT * FROM support_replies WHERE ticket_id = $1 ORDER BY created_at ASC`,
            [req.params.id]
        );

        res.json({ ticket: ticket.rows[0], replies: replies.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// REPLY TO TICKET
router.post("/ticket/:id/reply", verifyToken, async (req, res) => {
    const { message } = req.body;
    const ticket_id = req.params.id;

    if (!message) {
        return res.status(400).json({ message: "Message is required" });
    }

    try {
        // Verify ticket exists and user has access
        const ticket = await db.query(
            "SELECT * FROM support_tickets WHERE id = $1", [ticket_id]
        );

        if (!ticket.rows[0]) {
            return res.status(404).json({ message: "Ticket not found" });
        }

        if (req.user.role !== 'admin' && ticket.rows[0].user_id !== req.user.id) {
            return res.status(403).json({ message: "Access denied" });
        }

        await db.query(
            `INSERT INTO support_replies (ticket_id, sender_role, message)
             VALUES ($1, $2, $3)`,
            [ticket_id, req.user.role, message]
        );

        // Reopen ticket if admin replied and it was closed
        if (req.user.role === 'admin' && ticket.rows[0].status === 'closed') {
            await db.query(
                "UPDATE support_tickets SET status = 'open' WHERE id = $1", [ticket_id]
            );
        }

        res.json({ message: "Reply sent successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET ALL TICKETS (ADMIN)
router.get("/all", verifyToken, authorizeRoles("admin"), async (req, res) => {
    try {
        const result = await db.query(
            `SELECT t.*, u.name as user_name, u.email as user_email,
             (SELECT COUNT(*) FROM support_replies WHERE ticket_id = t.id) as reply_count
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
// POST /api/support/public — for non-logged-in users from landing page
router.post("/public", async (req, res) => {
    const { name, email, message } = req.body;
    if (!name || !email || !message) {
        return res.status(400).json({ message: "All fields required." });
    }
    try {
        // Save as a ticket with no user_id
        await db.query(
            `INSERT INTO support_tickets (name, email, subject, message, status)
             VALUES ($1, $2, 'Public enquiry', $3, 'open')
             ON CONFLICT DO NOTHING`,
            [name, email, message]
        );
    } catch {
        // Silently continue — email below is the real delivery
    }
    // Send email notification to your support inbox
    const nodemailer = require("nodemailer");
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: 587, secure: false,
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });
    await transporter.sendMail({
        from: `"EasyBuy Support" <${process.env.EMAIL_USER}>`,
        to: process.env.EMAIL_USER,
        subject: `📩 New support message from ${name}`,
        html: `
            <p><b>Name:</b> ${name}</p>
            <p><b>Email:</b> ${email}</p>
            <p><b>Message:</b><br/>${message}</p>
        `,
    });
    res.json({ message: "Support message sent." });
});

module.exports = router;