import express from "express";
import { getDashboardStats, getRecentWork, getUserInvoices, getUserStats } from "../controllers/statsController.ts";
import { protect, adminOnly } from "../middleware/authMiddleware.ts";

const router = express.Router();

router.get("/summary", protect, getDashboardStats);
router.get("/recent", protect, getRecentWork);
router.get("/invoices", protect, getUserInvoices);
router.get("/user", protect, getUserStats);

export default router;
