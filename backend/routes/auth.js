const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../db");
const router = express.Router();

const SECRET = process.env.JWT_SECRET || "easybuy_secret_key";

// ── Email transporter (Gmail) ─────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

async function sendVerificationEmail(email, name, code) {
    await transporter.sendMail({
        from: `"EasyBuy" <${process.env.SMTP_USER}>`,
        to: email,
        subject: "Verify your EasyBuy account",
        html: `
            <div style="font-family:sans-serif;max-width:480px;margin:auto;background:#0f1117;color:#e2e8f0;padding:32px;border-radius:12px;">
                <h2 style="color:#7c6ef7;">EasyBuy</h2>
                <p>Hi <b>${name}</b>, welcome to EasyBuy!</p>
                <p>Your email verification code is:</p>
                <div style="font-size:36px;font-weight:700;letter-spacing:12px;color:#7c6ef7;margin:20px 0;">${code}</div>
                <p style="color:#8892a4;">This code expires in <b>15 minutes</b>.</p>
                <p style="color:#5a6480;font-size:12px;">If you didn't create this account, ignore this email.</p>
            </div>
        `,
    });
}

// ── Generate unique 8-char referral code ──────────────────────────────────────
function generateReferralCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$!';
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// ── Credit referrer KES 30 on paid registration ───────────────────────────────
async function creditReferrer(referralCode, newUserName) {
    if (!referralCode) return;
    const referrerResult = await db.query(
        "SELECT id FROM users WHERE referral_code = $1", [referralCode]
    );
    if (referrerResult.rows.length === 0) return;

    const referrerId = referrerResult.rows[0].id;
    await db.query(
        "UPDATE wallets SET balance = balance + 30 WHERE user_id = $1", [referrerId]
    );
    await db.query(
        `INSERT INTO wallet_transactions (user_id, type, amount, description)
         VALUES ($1, 'referral_commission', 30, $2)`,
        [referrerId, `Referral commission — ${newUserName} registered`]
    );
}

// ── POST /api/auth/register ───────────────────────────────────────────────────
router.post("/register", async (req, res) => {
    const { name, email, password, role, referral_code, payment_confirmed } = req.body;

    const userRole = role || "buyer";
    const PAID_ROLES = ["affiliate", "seller"];

    if (PAID_ROLES.includes(userRole) && !payment_confirmed) {
        return res.status(402).json({
            message: "A registration fee of KES 100 is required.",
            fee_required: 100,
        });
    }

    try {
        if (referral_code) {
            const referrerCheck = await db.query(
                "SELECT id FROM users WHERE referral_code = $1", [referral_code]
            );
            if (referrerCheck.rows.length === 0) {
                return res.status(400).json({ message: "Invalid referral code." });
            }
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Generate unique referral code
        let newReferralCode;
        for (let i = 0; i < 5; i++) {
            const candidate = generateReferralCode();
            const existing = await db.query(
                "SELECT id FROM users WHERE referral_code = $1", [candidate]
            );
            if (existing.rows.length === 0) { newReferralCode = candidate; break; }
        }
        if (!newReferralCode) {
            return res.status(500).json({ message: "Could not generate referral code. Try again." });
        }

        // Generate 6-digit verification code, expires 15 min
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const verificationExpires = new Date(Date.now() + 15 * 60 * 1000);

        const userResult = await db.query(
            `INSERT INTO users (name, email, password, role, referral_code, referred_by,
                is_verified, verification_code, verification_expires)
             VALUES ($1, $2, $3, $4, $5, $6, false, $7, $8) RETURNING id`,
            [name, email, hashedPassword, userRole, newReferralCode,
             referral_code || null, verificationCode, verificationExpires]
        );
        const userId = userResult.rows[0].id;

        await db.query("INSERT INTO wallets (user_id, balance) VALUES ($1, 0)", [userId]);

        // Credit referrer for paid roles immediately
        if (referral_code && PAID_ROLES.includes(userRole)) {
            await creditReferrer(referral_code, name);
        }

        // Send verification email
        await sendVerificationEmail(email, name, verificationCode);

        res.status(201).json({
            message: "Account created! Check your email for a 6-digit verification code.",
            userId,
            referral_code: newReferralCode,
        });

    } catch (err) {
        if (err.code === "23505") {
            return res.status(400).json({ message: "Email already in use" });
        }
        console.error("Register error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// ── POST /api/auth/verify-email ───────────────────────────────────────────────
router.post("/verify-email", async (req, res) => {
    const { user_id, code } = req.body;
    if (!user_id || !code) {
        return res.status(400).json({ message: "user_id and code are required." });
    }
    try {
        const result = await db.query("SELECT * FROM users WHERE id = $1", [user_id]);
        const user = result.rows[0];

        if (!user) return res.status(404).json({ message: "User not found." });
        if (user.is_verified) return res.status(200).json({ message: "Already verified." });
        if (user.verification_code !== code) {
            return res.status(400).json({ message: "Incorrect code. Please try again." });
        }
        if (new Date() > new Date(user.verification_expires)) {
            return res.status(400).json({
                message: "Code has expired. Request a new one.",
                expired: true,
            });
        }

        await db.query(
            `UPDATE users SET is_verified = true, verification_code = NULL,
             verification_expires = NULL WHERE id = $1`,
            [user_id]
        );

        res.json({ message: "Email verified! You can now log in." });

    } catch (err) {
        console.error("Verify error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// ── POST /api/auth/resend-code ────────────────────────────────────────────────
router.post("/resend-code", async (req, res) => {
    const { user_id } = req.body;
    if (!user_id) return res.status(400).json({ message: "user_id is required." });

    try {
        const result = await db.query("SELECT * FROM users WHERE id = $1", [user_id]);
        const user = result.rows[0];

        if (!user) return res.status(404).json({ message: "User not found." });
        if (user.is_verified) return res.status(400).json({ message: "Account already verified." });

        const newCode = Math.floor(100000 + Math.random() * 900000).toString();
        const newExpires = new Date(Date.now() + 15 * 60 * 1000);

        await db.query(
            "UPDATE users SET verification_code = $1, verification_expires = $2 WHERE id = $3",
            [newCode, newExpires, user_id]
        );

        await sendVerificationEmail(user.email, user.name, newCode);
        res.json({ message: "New verification code sent." });

    } catch (err) {
        console.error("Resend error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────
router.post("/login", async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await db.query("SELECT * FROM users WHERE email = $1", [email]);
        const user = result.rows[0];

        if (!user) return res.status(400).json({ message: "User not found" });

        if (user.status === 'banned') {
            return res.status(403).json({ message: "Your account has been banned. Contact support." });
        }
        if (user.status === 'restricted') {
            return res.status(403).json({ message: "Your account is restricted. Contact support." });
        }

        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(400).json({ message: "Invalid password" });

        // Block login if not verified
        if (!user.is_verified) {
            return res.status(403).json({
                message: "Please verify your email before logging in.",
                user_id: user.id,
                needs_verification: true,
            });
        }

        const token = jwt.sign({ id: user.id, role: user.role }, SECRET, { expiresIn: "1d" });
        const { password: _, ...safeUser } = user;
        res.json({ message: "Login successful", token, user: safeUser });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
