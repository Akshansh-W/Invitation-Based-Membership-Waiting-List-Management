import jwt from "jsonwebtoken";
import User from "../models/User.js";

export  const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // Check whether the token exists
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Authentication required. Please log in.",
      });
    }

    const token = authHeader.split(" ")[1];

    // Verify the JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach authenticated user information
    req.user = {
      userId: decoded.userId,
      role: decoded.role,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token.",
    });
  }
};

export const authenticateOptional = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return next();
  }

  try {
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Invalid or expired token.",
      });
    }

    const decoded = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET);
    req.user = {
      userId: decoded.userId,
      role: decoded.role,
    };
    return next();
  } catch {
    return res.status(401).json({
      message: "Invalid or expired token.",
    });
  }
};

export const authorizeAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId).select("role account_status");

    if (!user || user.account_status !== "ACTIVE") {
      return res.status(403).json({
        message: "An active account is required.",
      });
    }

    if (user.role !== "ADMIN") {
      return res.status(403).json({
        message: "Administrator access is required.",
      });
    }

    next();
  } catch (error) {
    console.error("Admin authorization error:", error);
    return res.status(500).json({
      message: "Unable to verify administrator access.",
    });
  }
};
