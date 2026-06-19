const express = require("express");
const router = express.Router();
const db = require("../db");
const { verifyToken } = require("../middleware/authMiddleware");
// GET /api/affiliate/dashboard
router.get("/dashboard", async (req, res) => {
    const userId = req.user.id;

    try {
        // User info
        const userResult = await db.query(
            "SELECT id, name, email, role, referral_code FROM users WHERE id = $1",
            [userId]
        );
        const user = userResult.rows[0];

        if (!user || user.role !== "affiliate") {
            return res.status(403).json({ message: "Access denied. Affiliates only." });
        }

        // Wallet balance
        const walletResult = await db.query(
            "SELECT balance FROM wallets WHERE user_id = $1",
            [userId]
        );
        const wallet_balance = walletResult.rows[0]?.balance || 0;

        // People they referred (joined via their referral code)
        const referralsResult = await db.query(
            `SELECT name, role, created_at
             FROM users
             WHERE referred_by = $1
             ORDER BY created_at DESC`,
            [user.referral_code]
        );

        // Commission transaction history
        const transactionsResult = await db.query(
            `SELECT type, amount, description, created_at
             FROM wallet_transactions
             WHERE user_id = $1
             ORDER BY created_at DESC`,
            [userId]
        );

        // Total earned (sum of all credits)
        const totalResult = await db.query(
            `SELECT COALESCE(SUM(amount), 0) AS total
             FROM wallet_transactions
             WHERE user_id = $1`,
            [userId]
        );

        // All products to promote
        const productsResult = await db.query(
            `SELECT id, name, price, image
             FROM products
             ORDER BY created_at DESC`
        );

        res.json({
            name: user.name,
            email: user.email,
            referral_code: user.referral_code,
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
router.get("/referral-link", verifyToken, async (req, res) => {

    const result = await db.query(
        "SELECT * FROM users WHERE id = $1",
        [req.user.id]
    );

    const user = result.rows[0];

    if (!user.is_active) {
        return res.status(403).json({
            message: "Activate your affiliate account first"
        });
    }

    res.json({
        referralCode: user.referral_code
    });
});

module.exports = router;