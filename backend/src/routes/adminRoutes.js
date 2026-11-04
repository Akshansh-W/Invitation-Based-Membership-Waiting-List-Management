import { Router } from "express";

import {
  listApplications,
  listMembers,
  listReferrals,
  updateApplication,
} from "../controller/adminController.js";
import { generateAdminInvitation } from "../controller/redeemInvitationController.js";
import {
  authenticate,
  authorizeAdmin,
} from "../middleware/authMiddleware.js";

const router = Router();

router.use(authenticate, authorizeAdmin);
router.get("/members", listMembers);
router.get("/applications", listApplications);
router.patch("/applications/:applicationId", updateApplication);
router.get("/referrals", listReferrals);
router.post("/referrals/generate", generateAdminInvitation);

export default router;
