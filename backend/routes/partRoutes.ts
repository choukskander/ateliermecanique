import express from "express";
import { getParts, createPart, updateStock, deletePart } from "../controllers/partController.ts";
import { protect, staffOnly, adminOnly } from "../middleware/authMiddleware.ts";

const router = express.Router();

router.get("/", protect, getParts);
router.post("/", protect, staffOnly, createPart);
router.patch("/:id/stock", protect, staffOnly, updateStock);
router.delete("/:id", protect, adminOnly, deletePart);

export default router;
