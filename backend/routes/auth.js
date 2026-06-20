const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../db");
const router = express.Router();

const SECRET = process.env.JWT_SECRET || "easybuy_secret_key";

// ─── Generate unique 8-char referral code ────────────────────────────────────
function generateReferralCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$!';
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// ─── Activation bonuses: paid to referrer ONLY after the new user pays their fee
// seller activates (pays KES 500)  → referrer earns KES 150 (30% of 500)
// affiliate activates (pays KES 100) → referrer earns KES 30  (30% of 100)
const ACTIVATION_BONUS = { seller: 150, affiliate: 30 };

async function creditReferrerOnActivation(referredByCode, newUserName, role) {
    if (!referredByCode) return;
    const bonus = ACTIVATION_BONUS[role];
    if (!bonus) return; // buyers have no activation bonus

    const referrerResult = await db.query(
        "SELECT id FROM users WHERE referral_code = $1", [referredByCode]
    );
    if (referrerResult.rows.length === 0) return;

    const referrerId = referrerResult.rows[0].id;
    await db.query(
        "UPDATE wallets SET balance = balance + $1 WHERE user_id = $2",
        [bonus, referrerId]
    );
    await db.query(
        `INSERT INTO wallet_transactions (user_id, type, amount, description)
         VALUES ($1, 'referral_bonus', $2, $3)`,
        [referrerId, bonus, `Referral bonus — ${newUserName} activated as ${role} (KES ${bonus})`]
    );
}

// ─── POST /api/auth/register ──────────────────────────────────────────────────
router.post("/register", async (req, res) => {
    const { name, email, password, role, referral_code, payment_confirmed } = req.body;

    const userRole = role || "buyer";
    const PAID_ROLES = ["affiliate", "seller"];

    if (PAID_ROLES.includes(userRole) && !payment_confirmed) {
        return res.status(402).json({
            message: "A registration fee is required to register as an affiliate or seller.",
            fee_required: userRole === "seller" ? 500 : 100,
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

        // Generate unique 8-char referral code — retry on collision
        let newReferralCode;
        for (let i = 0; i < 5; i++) {
            const candidate = generateReferralCode();
            const existing = await db.query(
                "SELECT id FROM users WHERE referral_code = $1", [candidate]
            );
            if (existing.rows.length === 0) { newReferralCode = candidate; break; }
        }
        if (!newReferralCode) {
            return res.status(500).json({ message: "Could not generate referral code. Please try again." });
        }

        // Paid roles start inactive — they must deposit the activation fee first.
        // Buyers are active immediately.
        const isActive = !PAID_ROLES.includes(userRole);

        const userResult = await db.query(
            `INSERT INTO users (name, email, password, role, referral_code, referred_by, is_active)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
            [name, email, hashedPassword, userRole, newReferralCode, referral_code || null, isActive]
        );
        const userId = userResult.rows[0].id;

        await db.query("INSERT INTO wallets (user_id, balance) VALUES ($1, 0)", [userId]);

        // ⚠️  Do NOT credit the referrer here.
        // creditReferrerOnActivation() is called from the deposit route
        // only after the seller/affiliate pays their activation fee.

        res.json({ message: "User registered successfully", userId, referral_code: newReferralCode });

    } catch (err) {
        if (err.code === "23505") {
            return res.status(400).json({ message: "Email already in use" });
        }
        res.status(500).json({ error: err.message });
    }
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post("/login", async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await db.query("SELECT * FROM users WHERE email = $1", [email]);
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

        // Include is_active in the token so middleware can gate inactive accounts
        const token = jwt.sign(
            { id: user.id, role: user.role, is_active: user.is_active },
            SECRET,
            { expiresIn: "1d" }
        );
        const { password: _, ...safeUser } = user;
        res.json({ message: "Login successful", token, user: safeUser });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = { router, creditReferrerOnActivation };