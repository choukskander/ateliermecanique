import express from "express";
import { getRepairs, updateRepairStatus, createRepair, createRepairFromAppointment, updateRepairPartsUsed, updateRepairLabor } from "../controllers/repairController.ts";
import { protect, staffOnly } from "../middleware/authMiddleware.ts";

const router = express.Router();

router.get("/", protect, getRepairs);
router.post("/", protect, staffOnly, createRepair);
router.post("/from-appointment/:appointmentId", protect, staffOnly, createRepairFromAppointment);
router.patch("/:id/status", protect, staffOnly, updateRepairStatus);
router.patch("/:id/parts", protect, staffOnly, updateRepairPartsUsed);
router.patch("/:id/labor", protect, staffOnly, updateRepairLabor);

export default router;
