import express from "express";
import { getDashboardStats, getRecentWork, getUserInvoices } from "../controllers/statsController.ts";
import { protect, adminOnly } from "../middleware/authMiddleware.ts";

const router = express.Router();

router.get("/summary", protect, getDashboardStats);
router.get("/recent", protect, getRecentWork);
router.get("/invoices", protect, getUserInvoices);

export default router;
