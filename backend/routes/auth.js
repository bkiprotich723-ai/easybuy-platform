const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../db");
const router = express.Router();

const SECRET = process.env.JWT_SECRET || "easybuy_secret_key";

// ─── Generate unique 8-char referral code (letters + numbers + special chars) ─
function generateReferralCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$!';
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}


// ─── POST /api/auth/register ──────────────────────────────────────────────────
router.post("/register", async (req, res) => {
    const { name, email, password, role, referral_code } = req.body;

    const userRole = role || "buyer";
    const PAID_ROLES = ["affiliate", "seller"];

    if (PAID_ROLES.includes(userRole) && !payment_confirmed) {
        return res.status(402).json({
            message: "A registration fee of KES 100 is required to register as an affiliate or seller.",
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

        const userResult = await db.query(
            `INSERT INTO users (name, email, password, role, referral_code,is_active ,activation_fee_paid , referred_by)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
            [name, email, hashedPassword, userRole, newReferralCode, referral_code || null]
        );
        const userId = userResult.rows[0].id;

        await db.query("INSERT INTO wallets (user_id, balance) VALUES ($1, 0)", [userId]);

        
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

        // Account status checks
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

        const token = jwt.sign({ id: user.id, role: user.role }, SECRET, { expiresIn: "1d" });
        const { password: _, ...safeUser } = user;
        res.json({ message: "Login successful", token, user: safeUser });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


router.post("/activate", async (req, res) => {
    const { userId } = req.body;

    try {
        const userResult = await db.query(
            "SELECT * FROM users WHERE id = $1",
            [userId]
        );

        const user = userResult.rows[0];

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        await db.query(
            `UPDATE users
             SET is_active = true,
                 activation_fee_paid = true
             WHERE id = $1`,
            [userId]
        );

        if (user.referred_by) {

            const referrer = await db.query(
                "SELECT id FROM users WHERE referral_code = $1",
                [user.referred_by]
            );

            if (referrer.rows.length > 0) {

                const bonus =
                    user.role === "seller"
                        ? 150
                        : user.role === "affiliate"
                        ? 30
                        : 0;

                if (bonus > 0) {

                    const referrerId = referrer.rows[0].id;

                    await db.query(
                        `UPDATE wallets
                         SET balance = balance + $1
                         WHERE user_id = $2`,
                        [bonus, referrerId]
                    );

                    await db.query(
                        `INSERT INTO wallet_transactions
                         (user_id, type, amount, description)
                         VALUES ($1, 'referral_commission', $2, $3)`,
                        [
                            referrerId,
                            bonus,
                            `${user.name} activated a ${user.role} account`
                        ]
                    );
                }
            }
        }

        res.json({
            message: "Account activated successfully"
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
