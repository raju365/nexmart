const jwt = require("jsonwebtoken");
const userModel = require("../models/user.model");
const authMiddleware = (req, res, next) => {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = decoded
    req.user = user;
    next();

  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

module.exports = authMiddleware;