import express from "express";
import {
  registerUser,
  loginUser,
  getCurrentUser,
} from "../controller/authController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/getUser", authenticate, getCurrentUser);

export default router;
