import { Router } from "express";

import {
  listNotifications,
  markNotificationRead,
} from "../controller/notificationController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = Router();

router.use(authenticate);
router.get("/", listNotifications);
router.patch("/:notificationId/read", markNotificationRead);

export default router;
