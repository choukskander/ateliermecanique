import express from "express";
import { getMessages, sendMessage } from "../controllers/messageController.ts";
import { protect } from "../middleware/authMiddleware.ts";

const router = express.Router();

router.get("/", protect, getMessages);
router.post("/", protect, sendMessage);

export default router;
