import express from "express";
import { getAvailability, updateAvailability, checkSlotAvailability, getMechanics, getMechanicSchedules, getAvailableSlots } from "../controllers/availabilityController.ts";
import { protect, staffOnly } from "../middleware/authMiddleware.ts";

const router = express.Router();

router.get("/", getAvailability);
router.get("/mechanics", getMechanics);
router.get("/mechanics/:mechanicId", getMechanicSchedules);
router.get("/check", checkSlotAvailability);
router.get("/slots", getAvailableSlots);
router.post("/", protect, staffOnly, updateAvailability);

export default router;
