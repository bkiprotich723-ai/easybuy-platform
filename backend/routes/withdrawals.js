const express = require("express");
const db = require("../db");
const { verifyToken, authorizeRoles } = require("../middleware/authMiddleware");

const router = express.Router();

// REQUEST WITHDRAWAL — deducts balance immediately to prevent double withdrawal
router.post("/request", verifyToken, async (req, res) => {
    const user_id = req.user.id;
    const { amount } = req.body;

    if (!amount || isNaN(amount) || amount <= 0) {
        return res.status(400).json({ message: "A valid amount is required" });
    }

    const client = await db.connect();
    try {
        await client.query("BEGIN");

        // Lock wallet row
        const walletResult = await client.query(
            "SELECT balance FROM wallets WHERE user_id = $1 FOR UPDATE",
            [user_id]
        );
        const wallet = walletResult.rows[0];

        if (!wallet || parseFloat(wallet.balance) < parseFloat(amount)) {
            await client.query("ROLLBACK");
            return res.status(400).json({ message: `Insufficient wallet balance. Available: KES ${parseFloat(wallet?.balance || 0).toLocaleString()}` });
        }

        // Deduct immediately to prevent double withdrawal
        await client.query(
            "UPDATE wallets SET balance = balance - $1 WHERE user_id = $2",
            [amount, user_id]
        );

        // Log the hold
        await client.query(
            `INSERT INTO wallet_transactions (user_id, type, amount, description)
             VALUES ($1, 'withdrawal_hold', $2, $3)`,
            [user_id, -amount, `Withdrawal request of KES ${amount} — pending approval`]
        );

        // Create withdrawal request
        const result = await client.query(
            "INSERT INTO withdrawals (user_id, amount, status) VALUES ($1, $2, 'pending') RETURNING id",
            [user_id, amount]
        );

        await client.query("COMMIT");
        res.json({
            message: "Withdrawal request submitted. Amount held pending approval.",
            withdrawal_id: result.rows[0].id
        });

    } catch (err) {
        await client.query("ROLLBACK");
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// VIEW MY WITHDRAWALS
router.get("/my", verifyToken, async (req, res) => {
    try {
        const result = await db.query(
            "SELECT * FROM withdrawals WHERE user_id = $1 ORDER BY created_at DESC",
            [req.user.id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// VIEW ALL WITHDRAWALS (ADMIN)
router.get("/", verifyToken, authorizeRoles("admin"), async (req, res) => {
    try {
        const result = await db.query(
            `SELECT w.*, u.name as user_name, u.email as user_email
             FROM withdrawals w
             JOIN users u ON w.user_id = u.id
             ORDER BY w.created_at DESC`
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;