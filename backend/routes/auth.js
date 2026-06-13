const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../db");

const router = express.Router();

const SECRET = process.env.JWT_SECRET || "easybuy_secret_key";

const FEES = {
    seller: 500,
    affiliate: 100
};

const REFERRAL_BONUS = {
    seller: 150,
    affiliate: 30
};

// REGISTER
router.post("/register", async (req, res) => {
    const { name, email, password, role, referral_code } = req.body;

    const client = await db.connect();
    try {
        await client.query("BEGIN");

        const hashedPassword = await bcrypt.hash(password, 10);
        const newReferralCode = "REF" + Date.now();

        // Insert user
        const userResult = await client.query(
            `INSERT INTO users (name, email, password, role, referral_code, referred_by)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id`,
            [name, email, hashedPassword, role || "buyer", newReferralCode, referral_code || null]
        );
        const userId = userResult.rows[0].id;

        // Auto-create wallet starting at 0
        await client.query(
            "INSERT INTO wallets (user_id, balance) VALUES ($1, 0)",
            [userId]
        );

        // Handle referral bonus for seller or affiliate registration
        if (referral_code && (role === "seller" || role === "affiliate")) {
            const referrerResult = await client.query(
                "SELECT id FROM users WHERE referral_code = $1",
                [referral_code]
            );
            const referrer = referrerResult.rows[0];

            if (referrer) {
                const bonus = REFERRAL_BONUS[role] || 0;

                // Credit referrer wallet
                await client.query(
                    "UPDATE wallets SET balance = balance + $1 WHERE user_id = $2",
                    [bonus, referrer.id]
                );

                // Log transaction
                await client.query(
                    `INSERT INTO wallet_transactions (user_id, type, amount, description)
                     VALUES ($1, 'referral_bonus', $2, $3)`,
                    [referrer.id, bonus, `Referral bonus — new ${role} registered with your code`]
                );
            }
        }

        await client.query("COMMIT");

        res.json({
            message: "User registered successfully",
            userId,
            referral_code: newReferralCode,
            fee_required: FEES[role] || 0
        });

    } catch (err) {
        await client.query("ROLLBACK");
        if (err.code === "23505") {
            return res.status(400).json({ message: "Email already in use" });
        }
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
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

        if (user.status === 'banned') {
            return res.status(403).json({ message: "Your account has been banned. Contact support." });
        }

        if (user.status === 'restricted') {
            return res.status(403).json({ message: "Your account is restricted. Contact support." });
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