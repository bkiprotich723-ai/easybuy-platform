const express = require("express");
const bcrypt = require("bcrypt");
const db = require("../db");
const { verifyToken } = require("../middleware/authMiddleware");

const router = express.Router();

// GET MY PROFILE
router.get("/", verifyToken, async (req, res) => {
    try {
        const result = await db.query(
            "SELECT id, name, email, role, referral_code, profile_picture, mpesa_number, is_active, created_at FROM users WHERE id = $1",
            [req.user.id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// UPDATE PROFILE
router.put("/update", verifyToken, async (req, res) => {
    const { name, profile_picture, mpesa_number } = req.body;
    try {
        await db.query(
            "UPDATE users SET name=$1, profile_picture=$2, mpesa_number=$3 WHERE id=$4",
            [name, profile_picture, mpesa_number, req.user.id]
        );
        res.json({ message: "Profile updated successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// CHANGE PASSWORD
router.put("/password", verifyToken, async (req, res) => {
    const { current_password, new_password } = req.body;
    try {
        const result = await db.query("SELECT password FROM users WHERE id = $1", [req.user.id]);
        const match = await bcrypt.compare(current_password, result.rows[0].password);
        if (!match) {
            return res.status(400).json({ message: "Current password is incorrect" });
        }
        const hashed = await bcrypt.hash(new_password, 10);
        await db.query("UPDATE users SET password = $1 WHERE id = $2", [hashed, req.user.id]);
        res.json({ message: "Password changed successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
