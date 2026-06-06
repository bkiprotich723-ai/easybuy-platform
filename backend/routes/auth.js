const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../db");

const router = express.Router();

const SECRET = process.env.JWT_SECRET || "easybuy_secret_key";

// REGISTER
router.post("/register", async (req, res) => {
    const { name, email, password, role, referral_code } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const newReferralCode = "REF" + Date.now();

        // Insert user
        const userResult = await db.query(
            `INSERT INTO users (name, email, password, role, referral_code, referred_by)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id`,
            [name, email, hashedPassword, role || "buyer", newReferralCode, referral_code || null]
        );
        const userId = userResult.rows[0].id;

        // Auto-create wallet
        await db.query(
            "INSERT INTO wallets (user_id, balance) VALUES ($1, 0)",
            [userId]
        );

        // Handle referral bonus
        if (referral_code) {
            const referrerResult = await db.query(
                "SELECT id FROM users WHERE referral_code = $1",
                [referral_code]
            );
            const referrer = referrerResult.rows[0];

            if (referrer) {
                // Optional: log referral or credit bonus here
                // e.g. INSERT INTO referrals (referrer_id, referred_user_id) VALUES (...)
            }
        }

        res.json({
            message: "User registered successfully",
            userId,
            referral_code: newReferralCode
        });

    } catch (err) {
        if (err.code === "23505") {
            // Unique violation — email already exists
            return res.status(400).json({ message: "Email already in use" });
        }
        res.status(500).json({ error: err.message });
    }
});

// LOGIN
router.post("/login", async (req, res) => {
    const { email, password } = req.body;

    try {
        const result = await db.query(
            "SELECT * FROM users WHERE email = $1",
            [email]
        );
        const user = result.rows[0];

        if (!user) {
            return res.status(400).json({ message: "User not found" });
        }

        const match = await bcrypt.compare(password, user.password);

        if (!match) {
            return res.status(400).json({ message: "Invalid password" });
        }

        const token = jwt.sign(
            { id: user.id, role: user.role },
            SECRET,
            { expiresIn: "1d" }
        );

        // Don't send password back
        const { password: _, ...safeUser } = user;

        res.json({
            message: "Login successful",
            token,
            user: safeUser
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
