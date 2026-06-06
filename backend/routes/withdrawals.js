const express = require("express");
const db = require("../db");
const { verifyToken, authorizeRoles } = require("../middleware/authMiddleware");

const router = express.Router();

// REQUEST WITHDRAWAL
router.post("/request", verifyToken, async (req, res) => {
    const user_id = req.user.id;
    const { amount } = req.body;

    if (!amount || isNaN(amount) || amount <= 0) {
        return res.status(400).json({ message: "A valid amount is required" });
    }

    const client = await db.connect();
    try {
        await client.query("BEGIN");

        // Lock wallet row to prevent race conditions
        const walletResult = await client.query(
            "SELECT balance FROM wallets WHERE user_id = $1 FOR UPDATE",
            [user_id]
        );
        const wallet = walletResult.rows[0];

        if (!wallet || parseFloat(wallet.balance) < parseFloat(amount)) {
            await client.query("ROLLBACK");
            return res.status(400).json({ message: "Insufficient wallet balance" });
        }

        const result = await client.query(
            "INSERT INTO withdrawals (user_id, amount, status) VALUES ($1, $2, 'pending') RETURNING id",
            [user_id, amount]
        );

        await client.query("COMMIT");

        res.json({
            message: "Withdrawal request submitted",
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
            "SELECT * FROM withdrawals ORDER BY created_at DESC"
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
