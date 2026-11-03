import { Router } from "express";
import {
  applyForMembership,
  getMembershipApplicationStatus,
} from "../controller/membershipController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/apply", authenticate, applyForMembership);
router.get("/status", authenticate, getMembershipApplicationStatus);

export default router;