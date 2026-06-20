const express = require("express");
const router = express.Router();
const db = require("../db");
const bcrypt = require("bcrypt");
const { verifyToken } = require("../middleware/authMiddleware");

// ─── GET /api/affiliate/dashboard ────────────────────────────────────────────
// verifyToken only — requireActive is intentionally excluded.
// Inactive affiliates must reach the dashboard to pay the activation fee;
// the activation wall is handled in the frontend, not as a hard API block.
router.get("/dashboard", verifyToken, async (req, res) => {
    const userId = req.user.id;
    try {
        const userResult = await db.query(
            "SELECT id, name, email, role, referral_code, profile_picture, is_active FROM users WHERE id = $1",
            [userId]
        );
        const user = userResult.rows[0];
        if (!user || user.role !== "affiliate") {
            return res.status(403).json({ message: "Access denied. Affiliates only." });
        }

        const walletResult = await db.query(
            "SELECT balance FROM wallets WHERE user_id = $1", [userId]
        );
        const wallet_balance = walletResult.rows[0]?.balance || 0;

        const referralsResult = await db.query(
            `SELECT name, role, created_at FROM users
             WHERE referred_by = $1 ORDER BY created_at DESC`,
            [user.referral_code]
        );

        const transactionsResult = await db.query(
            `SELECT type, amount, description, created_at FROM wallet_transactions
             WHERE user_id = $1 ORDER BY created_at DESC`,
            [userId]
        );

        const totalResult = await db.query(
            `SELECT COALESCE(SUM(amount), 0) AS total FROM wallet_transactions
             WHERE user_id = $1 AND amount > 0`,
            [userId]
        );

        const productsResult = await db.query(
            `SELECT id, name, price, image FROM products ORDER BY created_at DESC`
        );

        res.json({
            name: user.name,
            email: user.email,
            referral_code: user.referral_code,
            profile_picture: user.profile_picture || null,
            is_active: user.is_active,   // ← frontend reads this to show/hide activation wall
            wallet_balance,
            total_earned: totalResult.rows[0].total,
            referrals: referralsResult.rows,
            transactions: transactionsResult.rows,
            products: productsResult.rows,
        });

    } catch (err) {
        console.error("Affiliate dashboard error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// ─── PUT /api/affiliate/profile ───────────────────────────────────────────────
router.put("/profile", verifyToken, async (req, res) => {
    const userId = req.user.id;
    const { name, email, profile_picture } = req.body;

    if (!name || !email) {
        return res.status(400).json({ message: "Name and email are required." });
    }

    try {
        // Check email not taken by another user
        const emailCheck = await db.query(
            "SELECT id FROM users WHERE email = $1 AND id != $2", [email, userId]
        );
        if (emailCheck.rows.length > 0) {
            return res.status(400).json({ message: "Email already in use by another account." });
        }

        await db.query(
            `UPDATE users SET name = $1, email = $2, profile_picture = $3 WHERE id = $4`,
            [name, email, profile_picture || null, userId]
        );

        res.json({ message: "Profile updated successfully." });
    } catch (err) {
        console.error("Profile update error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// ─── PUT /api/affiliate/reset-password ───────────────────────────────────────
router.put("/reset-password", verifyToken, async (req, res) => {
    const userId = req.user.id;
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
        return res.status(400).json({ message: "Both current and new password are required." });
    }
    if (new_password.length < 6) {
        return res.status(400).json({ message: "New password must be at least 6 characters." });
    }

    try {
        const result = await db.query("SELECT password FROM users WHERE id = $1", [userId]);
        const user = result.rows[0];

        const match = await bcrypt.compare(current_password, user.password);
        if (!match) {
            return res.status(400).json({ message: "Current password is incorrect." });
        }

        const hashed = await bcrypt.hash(new_password, 10);
        await db.query("UPDATE users SET password = $1 WHERE id = $2", [hashed, userId]);

        res.json({ message: "Password updated successfully." });
    } catch (err) {
        console.error("Reset password error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
