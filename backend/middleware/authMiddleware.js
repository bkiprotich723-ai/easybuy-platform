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
const requireActive = (req, res, next) => {
    if (req.user.is_active === false) {
        return res.status(403).json({
            message: "Account not activated",
            not_activated: true
        });
    }
    next();
};

module.exports = { verifyToken, authorizeRoles, requireActive };