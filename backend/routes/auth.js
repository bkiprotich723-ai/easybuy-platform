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

        // If registering as affiliate or seller — charge KES 100 fee
        if (role === "affiliate" || role === "seller") {
            // For now we just record that fee is needed
            // In production this would integrate with M-Pesa
            // We'll deduct from wallet after first deposit
            await db.query(
                `INSERT INTO wallet_transactions (user_id, type, amount, description)
                 VALUES ($1, 'registration_fee', $2, $3)`,
                [userId, -100, `Registration fee for ${role} account`]
            );

            // Set wallet to -100 to indicate fee owed
            await db.query(
                "UPDATE wallets SET balance = -100 WHERE user_id = $1",
                [userId]
            );
        }

        // Handle referral bonus — pay referrer KES 30 if referred user is affiliate or seller
        if (referral_code && (role === "affiliate" || role === "seller")) {
            const referrerResult = await db.query(
                "SELECT id FROM users WHERE referral_code = $1",
                [referral_code]
            );
            const referrer = referrerResult.rows[0];

            if (referrer) {
                // Credit KES 30 to referrer
                await db.query(
                    "UPDATE wallets SET balance = balance + 30 WHERE user_id = $1",
                    [referrer.id]
                );

                await db.query(
                    `INSERT INTO wallet_transactions (user_id, type, amount, description)
                     VALUES ($1, 'referral_bonus', 30, $2)`,
                    [referrer.id, `Referral bonus — new ${role} registered with your code`]
                );
            }
        }

        res.json({
            message: "User registered successfully",
            userId,
            referral_code: newReferralCode,
            fee_required: (role === "affiliate" || role === "seller") ? 100 : 0
        });

    } catch (err) {
        if (err.code === "23505") {
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