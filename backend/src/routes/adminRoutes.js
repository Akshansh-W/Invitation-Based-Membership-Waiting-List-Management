import { Router } from "express";

import {
  listApplications,
  listMembers,
  listReferrals,
  updateApplication,
} from "../controller/adminController.js";
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

export default router;
