const express = require("express");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const db = require("../db");
const { sendPasswordResetEmail } = require("../utils/mailer");

const router = express.Router();

// REQUEST PASSWORD RESET
router.post("/forgot-password", async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: "Email is required" });
    }

    try {
        const result = await db.query(
            "SELECT id, name FROM users WHERE email = $1", [email]
        );
        const user = result.rows[0];

        // Always return success even if email not found (security best practice)
        if (!user) {
            return res.json({ message: "If that email exists, a reset link has been sent." });
        }

        // Generate reset token
        const token = crypto.randomBytes(32).toString("hex");
        const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        await db.query(
            "UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3",
            [token, expires, user.id]
        );

        const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
        await sendPasswordResetEmail(email, resetLink);

        res.json({ message: "If that email exists, a reset link has been sent." });

    } catch (err) {
        console.error("Password reset error:", err);
        res.status(500).json({ error: err.message });
    }
});

// RESET PASSWORD
router.post("/reset-password", async (req, res) => {
    const { token, password } = req.body;

    if (!token || !password) {
        return res.status(400).json({ message: "Token and password are required" });
    }

    try {
        const result = await db.query(
            `SELECT id FROM users 
             WHERE reset_token = $1 
             AND reset_token_expires > NOW()`,
            [token]
        );
        const user = result.rows[0];

        if (!user) {
            return res.status(400).json({ message: "Reset link is invalid or has expired." });
        }

        const hashed = await bcrypt.hash(password, 10);

        await db.query(
            `UPDATE users 
             SET password = $1, reset_token = NULL, reset_token_expires = NULL 
             WHERE id = $2`,
            [hashed, user.id]
        );

        res.json({ message: "Password reset successfully. You can now log in." });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;