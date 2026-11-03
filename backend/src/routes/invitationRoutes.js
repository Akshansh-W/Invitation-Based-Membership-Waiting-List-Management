import express from "express";
import { authenticate } from "../middleware/authMiddleware.js";
import {
  generateInvitation,
  redeemInvitation,
} from "../controller/redeemInvitationController.js";

const router = express.Router();

router.post("/generate", authenticate, generateInvitation);
router.post("/redeem", authenticate, redeemInvitation);

export default router;
