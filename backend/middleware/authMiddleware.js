const jwt = require("jsonwebtoken");
const SECRET = process.env.JWT_SECRET || "easybuy_secret_key";

// VERIFY TOKEN
const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ message: "No token provided" });
    }
    const token = authHeader.split(" ")[1];
    try {
        const decoded = jwt.verify(token, SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ message: "Invalid token" });
    }
};

// ROLE-BASED ACCESS CONTROL
const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ message: "Access denied" });
        }
        next();
    };
};

// BLOCK INACTIVE ACCOUNTS (seller/affiliate who haven't paid activation fee)
// Only blocks when is_active is explicitly false — null/undefined passes through
// so that routes without activation requirements are unaffected.
// Do NOT apply this to dashboard routes — inactive users need dashboard access
// to reach the activation/payment UI.
const requireActive = (req, res, next) => {
    if (req.user.is_active === false || req.user.is_active === 0) {
        return res.status(403).json({
            message: "Account not activated. Please pay the activation fee to continue.",
            not_activated: true
        });
    }
    next();
};

module.exports = { verifyToken, authorizeRoles, requireActive };