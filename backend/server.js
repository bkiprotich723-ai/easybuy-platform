if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");
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
const app = express();


app.use(cors());
app.use(express.json());

// Public routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);

// Protected routes (require JWT)
app.use("/api/transactions", verifyToken, transactionRoutes);
app.use("/api/withdrawals", verifyToken, withdrawalRoutes);
app.use("/api/seller", verifyToken, requireActive, sellerRoutes);
app.use("/api/seller", verifyToken, requireActive, sellerDashboardRoutes);
app.use("/api/revenue", verifyToken, revenueRoutes);
app.use("/api/affiliate", verifyToken, requireActive, affiliateRoutes);
app.use("/api/admin", verifyToken, adminRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/support", verifyToken, supportRoutes);
app.use("/api/cart", verifyToken, cartRoutes);
app.use("/api/profile", verifyToken, profileRoutes);
app.use("/api/affiliate", verifyToken, affiliateRoutes);
app.get("/", (req, res) => {
    res.send("EasyBuy API is running 🚀");
});

// Use Render's dynamic PORT, fallback to 5000 for local dev
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
