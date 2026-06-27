if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}
const express = require("express");
const cors = require("cors");
const { router: authRoutes } = require("./routes/auth");  // ← destructure router from auth.js
const transactionRoutes = require("./routes/transactions");
const productRoutes = require("./routes/products");
const adminRoutes = require("./routes/admin");
const withdrawalRoutes = require("./routes/withdrawals");
const sellerRoutes = require("./routes/seller");
const revenueRoutes = require("./routes/revenue");
const sellerDashboardRoutes = require("./routes/sellerDashboard");
const { verifyToken, requireActive } = require("./middleware/authMiddleware");
const reviewRoutes = require("./routes/reviews");
const supportRoutes = require("./routes/support");
const cartRoutes = require("./routes/cart");
const profileRoutes = require("./routes/profile");
const affiliateRoutes = require("./routes/affiliate");
const passwordResetRoutes = require("./routes/passwordReset");
const mpesaRoutes = require("./routes/mpesa");
const app = express();
const statsRoutes = require("./routes/stats");

app.use(cors());
app.use(express.json());

// Public routes
app.use("/api/auth", authRoutes);
app.use("/api/mpesa", mpesaRoutes);
app.use("/api/products", productRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/auth", passwordResetRoutes);
// Protected routes (require JWT)
app.use("/api/transactions", verifyToken, transactionRoutes);
app.use("/api/withdrawals", verifyToken, withdrawalRoutes);
app.use("/api/seller", verifyToken, requireActive, sellerRoutes);
app.use("/api/seller", verifyToken, requireActive, sellerDashboardRoutes);
app.use("/api/revenue", verifyToken, revenueRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/support", supportRoutes); // already registered above, public endpoint handled within
app.use("/api/cart", verifyToken, cartRoutes);
app.use("/api/profile", verifyToken, profileRoutes);
app.use("/api/admin", verifyToken, adminRoutes);

// Affiliate: verifyToken only — NO requireActive here.
// Inactive affiliates need dashboard access to pay the activation fee.
// requireActive is enforced inside individual routes where needed.
app.use("/api/affiliate", verifyToken, affiliateRoutes);

app.get("/", (req, res) => {
    res.send("EasyBuy API is running 🚀");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});