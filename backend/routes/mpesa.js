const express = require("express");
const axios = require("axios");
const db = require("../db");
const { verifyToken } = require("../middleware/authMiddleware");

const router = express.Router();

const CONSUMER_KEY = process.env.MPESA_CONSUMER_KEY;
const CONSUMER_SECRET = process.env.MPESA_CONSUMER_SECRET;
const SHORTCODE = process.env.MPESA_SHORTCODE || "174379";
const PASSKEY = process.env.MPESA_PASSKEY || "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919";
const CALLBACK_URL = process.env.MPESA_CALLBACK_URL;
const MPESA_ENV = process.env.MPESA_ENV || "sandbox";

const BASE_URL = MPESA_ENV === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";

// Get OAuth token
async function getToken() {
    const credentials = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString("base64");
    const res = await axios.get(`${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
        headers: { Authorization: `Basic ${credentials}` }
    });
    return res.data.access_token;
}

// Generate password
function generatePassword() {
    const timestamp = new Date().toISOString().replace(/[-T:.Z]/g, "").slice(0, 14);
    const password = Buffer.from(`${SHORTCODE}${PASSKEY}${timestamp}`).toString("base64");
    return { password, timestamp };
}

// STK PUSH — initiate payment
router.post("/stk-push", verifyToken, async (req, res) => {
    const { phone, amount } = req.body;
    const user_id = req.user.id;

    if (!phone || !amount) {
        return res.status(400).json({ message: "Phone and amount are required" });
    }

    // Format phone number — ensure it starts with 254
    let formattedPhone = phone.toString().replace(/\s+/g, "");
    if (formattedPhone.startsWith("0")) {
        formattedPhone = "254" + formattedPhone.slice(1);
    }
    if (formattedPhone.startsWith("+")) {
        formattedPhone = formattedPhone.slice(1);
    }

    try {
        const token = await getToken();
        const { password, timestamp } = generatePassword();

        const response = await axios.post(
            `${BASE_URL}/mpesa/stkpush/v1/processrequest`,
            {
                BusinessShortCode: SHORTCODE,
                Password: password,
                Timestamp: timestamp,
                TransactionType: "CustomerBuyGoodsOnline",
                Amount: Math.ceil(amount),
                PartyA: formattedPhone,
                PartyB: SHORTCODE,
                PhoneNumber: formattedPhone,
                CallBackURL: `${CALLBACK_URL}/api/mpesa/callback`,
                AccountReference: "EasyBuy",
                TransactionDesc: "EasyBuy Wallet Deposit"
            },
            { headers: { Authorization: `Bearer ${token}` } }
        );

        const checkoutRequestId = response.data.CheckoutRequestID;

        // Save pending transaction
        await db.query(
            `INSERT INTO wallet_transactions (user_id, type, amount, description)
             VALUES ($1, 'mpesa_pending', $2, $3)`,
            [user_id, amount, `MPesa STK Push initiated - ${checkoutRequestId}`]
        );

        res.json({
            message: "STK Push sent! Check your phone for the M-Pesa prompt.",
            checkoutRequestId,
            success: true
        });

    } catch (err) {
        console.error("STK Push error:", err.response?.data || err.message);
        res.status(500).json({
            message: "Failed to initiate M-Pesa payment",
            error: err.response?.data || err.message
        });
    }
});

// CALLBACK — Safaricom calls this after payment
router.post("/callback", async (req, res) => {
    const callbackData = req.body?.Body?.stkCallback;

    if (!callbackData) {
        return res.status(400).json({ message: "Invalid callback" });
    }

    const resultCode = callbackData.ResultCode;
    const checkoutRequestId = callbackData.CheckoutRequestID;

    if (resultCode === 0) {
        // Payment successful
        const metadata = callbackData.CallbackMetadata?.Item || [];
        const amount = metadata.find(i => i.Name === "Amount")?.Value;
        const phone = metadata.find(i => i.Name === "PhoneNumber")?.Value;
        const mpesaRef = metadata.find(i => i.Name === "MpesaReceiptNumber")?.Value;

        try {
            // Find user by pending transaction
            const txResult = await db.query(
                `SELECT user_id FROM wallet_transactions 
                 WHERE description LIKE $1 AND type = 'mpesa_pending'
                 ORDER BY created_at DESC LIMIT 1`,
                [`%${checkoutRequestId}%`]
            );

            if (txResult.rows[0]) {
                const user_id = txResult.rows[0].user_id;
                const role = (await db.query("SELECT role, is_active, referred_by, name FROM users WHERE id = $1", [user_id])).rows[0];

                const ACTIVATION_FEES = { seller: 500, affiliate: 100 };
                const REFERRAL_BONUS = { seller: 150, affiliate: 30 };

                // Credit wallet
                await db.query(
                    "UPDATE wallets SET balance = balance + $1 WHERE user_id = $2",
                    [amount, user_id]
                );

                // Log successful deposit
                await db.query(
                    `UPDATE wallet_transactions SET type = 'mpesa_deposit', description = $1
                     WHERE description LIKE $2 AND type = 'mpesa_pending'`,
                    [`M-Pesa deposit KES ${amount} - Ref: ${mpesaRef}`, `%${checkoutRequestId}%`]
                );

                // Check activation
                const activationFee = ACTIVATION_FEES[role.role];
                if (activationFee && !role.is_active) {
                    const totalDeposits = await db.query(
                        `SELECT COALESCE(SUM(amount), 0) as total 
                         FROM wallet_transactions 
                         WHERE user_id = $1 AND type IN ('mpesa_deposit', 'deposit')`,
                        [user_id]
                    );
                    const total = parseFloat(totalDeposits.rows[0].total);

                    if (total >= activationFee) {
                        await db.query("UPDATE users SET is_active = true WHERE id = $1", [user_id]);

                        // Deduct activation fee
                        await db.query(
                            "UPDATE wallets SET balance = balance - $1 WHERE user_id = $2",
                            [activationFee, user_id]
                        );

                        // Credit referrer
                        if (role.referred_by) {
                            const referrerResult = await db.query(
                                "SELECT id FROM users WHERE referral_code = $1", [role.referred_by]
                            );
                            if (referrerResult.rows[0]) {
                                const bonus = REFERRAL_BONUS[role.role] || 0;
                                await db.query(
                                    "UPDATE wallets SET balance = balance + $1 WHERE user_id = $2",
                                    [bonus, referrerResult.rows[0].id]
                                );
                                await db.query(
                                    `INSERT INTO wallet_transactions (user_id, type, amount, description)
                                     VALUES ($1, 'referral_bonus', $2, $3)`,
                                    [referrerResult.rows[0].id, bonus, `Referral bonus — ${role.name} activated as ${role.role}`]
                                );
                            }
                        }
                    }
                }
            }
        } catch (err) {
            console.error("Callback processing error:", err);
        }
    }

    res.json({ ResultCode: 0, ResultDesc: "Success" });
});

// CHECK PAYMENT STATUS
router.get("/status/:checkoutRequestId", verifyToken, async (req, res) => {
    try {
        const token = await getToken();
        const { password, timestamp } = generatePassword();

        const response = await axios.post(
            `${BASE_URL}/mpesa/stkpushquery/v1/query`,
            {
                BusinessShortCode: SHORTCODE,
                Password: password,
                Timestamp: timestamp,
                CheckoutRequestID: req.params.checkoutRequestId
            },
            { headers: { Authorization: `Bearer ${token}` } }
        );

        res.json(response.data);
    } catch (err) {
        res.status(500).json({ error: err.response?.data || err.message });
    }
});

module.exports = router;