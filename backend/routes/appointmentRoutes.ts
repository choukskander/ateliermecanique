import express from "express";
import { createAppointment, getAppointments, updateAppointmentStatus, deleteAppointment } from "../controllers/appointmentController.ts";
import { protect, staffOnly } from "../middleware/authMiddleware.ts";

const router = express.Router();

router.post("/", protect, createAppointment);
router.get("/", protect, getAppointments);
router.patch("/:id/status", protect, staffOnly, updateAppointmentStatus);
router.delete("/:id", protect, staffOnly, deleteAppointment);

export default router;
