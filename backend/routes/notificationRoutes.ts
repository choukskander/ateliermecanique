import express from "express";
import { getNotifications, markAsRead } from "../controllers/notificationController.ts";
import { protect } from "../middleware/authMiddleware.ts";

const router = express.Router();

router.get("/", protect, getNotifications);
router.patch("/read", protect, markAsRead);

export default router;
