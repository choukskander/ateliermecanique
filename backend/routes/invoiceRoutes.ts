import express from "express";
import { protect, staffOnly } from "../middleware/authMiddleware.ts";
import { listInvoices, getInvoiceById, markInvoicePaid } from "../controllers/invoiceController.ts";

const router = express.Router();

router.get("/", protect, listInvoices);
router.get("/:id", protect, getInvoiceById);
router.patch("/:id/pay", protect, staffOnly, markInvoicePaid);

export default router;

