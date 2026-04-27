import mongoose from "mongoose";
import Invoice from "../models/Invoice.ts";
import Repair from "../models/Repair.ts";

export const listInvoices = async (req: any, res: any) => {
  try {
    const query: any = {};
    if (req.user.role === "client") {
      query.clientId = req.user._id;
    }
    const invoices = await Invoice.find(query)
      .populate({
        path: "repairId",
        populate: [
          { path: "appointmentId", populate: [{ path: "vehicleId" }, { path: "clientId", select: "name email" }] },
          { path: "mechanicId", select: "name" },
          { path: "partsUsed.partId" },
        ],
      })
      .sort({ createdAt: -1 });
    res.json(invoices);
  } catch (error: any) {
    res.status(500).json({ message: "Erreur lors de la récupération des factures", details: error.message });
  }
};

export const getInvoiceById = async (req: any, res: any) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "ID de facture invalide" });
  try {
    const invoice = await Invoice.findById(id).populate({
      path: "repairId",
      populate: [
        { path: "appointmentId", populate: [{ path: "vehicleId" }, { path: "clientId", select: "name email" }] },
        { path: "mechanicId", select: "name" },
        { path: "partsUsed.partId" },
      ],
    });
    if (!invoice) return res.status(404).json({ message: "Facture non trouvée" });
    if (req.user.role === "client" && String(invoice.clientId) !== String(req.user._id)) {
      return res.status(403).json({ message: "Accès refusé" });
    }
    res.json(invoice);
  } catch (error: any) {
    res.status(500).json({ message: "Erreur lors de la récupération", details: error.message });
  }
};

export const markInvoicePaid = async (req: any, res: any) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "ID de facture invalide" });
  try {
    const invoice = await Invoice.findByIdAndUpdate(id, { status: "Payée" }, { new: true });
    if (!invoice) return res.status(404).json({ message: "Facture non trouvée" });
    res.json(invoice);
  } catch (error: any) {
    res.status(500).json({ message: "Erreur lors de la mise à jour", details: error.message });
  }
};

export async function computeInvoiceTotals(repairId: any) {
  // Force a fresh fetch from DB with populate
  const repair = await Repair.findById(repairId).populate("partsUsed.partId");
  if (!repair) throw new Error("REPAIR_NOT_FOUND");

  let totalParts = 0;
  if (repair.partsUsed && Array.isArray(repair.partsUsed)) {
    for (const pu of repair.partsUsed) {
      const part: any = pu.partId;
      // If part was populated correctly, use its price, else 0
      const price = (part && typeof part === 'object' && part.price) ? Number(part.price) : 0;
      const qty = Number(pu.quantity || 0);
      totalParts += (price * qty);
    }
  }

  const totalLabor = Number(repair.laborCost || 0);
  const totalTTC = totalParts + totalLabor;

  console.log(`💰 [Facture Final] ID:${repairId} | Pièces:${totalParts} | MO:${totalLabor} | TTC:${totalTTC}`);
  
  return { totalParts, totalLabor, totalTTC, repair };
}

