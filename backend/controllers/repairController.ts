import mongoose from "mongoose";
import Repair from "../models/Repair.ts";
import Notification from "../models/Notification.ts";
import Appointment from "../models/Appointment.ts";
import Part from "../models/Part.ts";
import Invoice from "../models/Invoice.ts";
import { computeInvoiceTotals } from "./invoiceController.ts";

export const getRepairs = async (req: any, res: any) => {
  try {
    let query = {};
    if (req.user.role === "client") {
      const userAppointments = await Appointment.find({ clientId: req.user._id }).select("_id");
      const appointmentIds = userAppointments.map(a => a._id);
      query = { appointmentId: { $in: appointmentIds } };
    }

    const repairs = await Repair.find(query)
      .populate({
        path: "appointmentId",
        populate: [
          { path: "clientId", select: "name email" },
          { path: "vehicleId" }
        ]
      })
      .populate("mechanicId", "name")
      .sort({ updatedAt: -1 });

    res.json(repairs);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération des réparations" });
  }
};

export const updateRepairLabor = async (req: any, res: any) => {
  const { id } = req.params;
  const { laborCost } = req.body;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "ID de réparation invalide" });
  }
  const parsed = Number(laborCost);
  if (Number.isNaN(parsed) || parsed < 0) {
    return res.status(400).json({ message: "Coût main d'œuvre invalide" });
  }
  try {
    const repair = await Repair.findByIdAndUpdate(id, { laborCost: parsed }, { new: true });
    if (!repair) return res.status(404).json({ message: "Réparation non trouvée" });
    return res.json(repair);
  } catch (error: any) {
    return res.status(500).json({ message: "Erreur lors de la mise à jour", details: error.message });
  }
};

/**
 * Add/Remove parts usage on a repair and update stock atomically.
 * Body: { partId, quantityDelta } where quantityDelta can be positive (consume) or negative (unconsume).
 */
export const updateRepairPartsUsed = async (req: any, res: any) => {
  const { id } = req.params;
  const { partId, quantityDelta } = req.body;
  const delta = Number(quantityDelta);

  console.log(`🛠️ [Pièces] Demande: Repair=${id}, Part=${partId}, Delta=${delta}`);

  if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(partId)) {
    return res.status(400).json({ message: "ID invalide" });
  }

  try {
    // 1. Update Stock first
    const part = await Part.findById(partId);
    if (!part) return res.status(404).json({ message: "Pièce non trouvée" });

    if (delta > 0 && part.stock < delta) {
      return res.status(400).json({ message: `Stock insuffisant (${part.stock} dispos)` });
    }

    const updatedPart = await Part.findByIdAndUpdate(partId, { $inc: { stock: -delta } }, { new: true });
    console.log(`✅ [Pièces] Stock mis à jour: ${updatedPart?.name} -> ${updatedPart?.stock}`);

    // 2. Update Repair
    const repair = await Repair.findById(id);
    if (!repair) return res.status(404).json({ message: "Réparation non trouvée" });

    const existingIndex = repair.partsUsed.findIndex((p: any) => {
      const existingId = p.partId._id ? p.partId._id.toString() : p.partId.toString();
      return existingId === partId.toString();
    });
    
    if (existingIndex >= 0) {
      repair.partsUsed[existingIndex].quantity += delta;
      if (repair.partsUsed[existingIndex].quantity <= 0) {
        repair.partsUsed.splice(existingIndex, 1);
      }
    } else if (delta > 0) {
      repair.partsUsed.push({ partId, quantity: delta });
    }

    repair.markModified('partsUsed');
    await repair.save();
    console.log(`✅ [Pièces] Réparation mise à jour. Nombre de pièces: ${repair.partsUsed.length}`);

    // 3. Sync Invoice if needed
    const populated: any = await Repair.findById(id).populate("partsUsed.partId");
    if (populated.status === "Prêt") {
      const { totalParts, totalLabor, totalHT, tvaRate, tvaAmount, timbreFiscal, totalTTC } = await computeInvoiceTotals(id);
      await Invoice.findOneAndUpdate(
        { repairId: id },
        { totalParts, totalLabor, totalHT, tvaRate, tvaAmount, timbreFiscal, totalTTC },
        { upsert: false }
      );
    }

    return res.json(populated);
  } catch (error: any) {
    console.error("❌ [Pièces] Erreur critique:", error);
    return res.status(500).json({ message: "Erreur serveur lors de la mise à jour", details: error.message });
  }
};

export const createRepairFromAppointment = async (req: any, res: any) => {
  const { appointmentId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
    return res.status(400).json({ message: "ID de rendez-vous invalide" });
  }
  try {
    const existing = await Repair.findOne({ appointmentId });
    if (existing) return res.json(existing);

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) return res.status(404).json({ message: "Rendez-vous non trouvé" });
    if (!appointment.mechanicId) return res.status(400).json({ message: "Aucun mécanicien assigné au rendez-vous" });

    const repair = await Repair.create({
      appointmentId,
      mechanicId: appointment.mechanicId,
      status: "En attente",
    });
    return res.status(201).json(repair);
  } catch (error: any) {
    return res.status(500).json({ message: "Erreur lors de la création de la fiche", details: error.message });
  }
};

export const updateRepairStatus = async (req: any, res: any) => {
  const { id } = req.params;
  const { status, worksDone, laborCost } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "ID de réparation invalide" });
  }

  try {
    const repair = await Repair.findById(id);

    if (!repair) {
      return res.status(404).json({ message: "Réparation non trouvée" });
    }

    if (status) repair.status = status;
    if (worksDone !== undefined) repair.worksDone = worksDone;
    if (laborCost !== undefined) repair.laborCost = Number(laborCost);
    
    await repair.save();

    // Re-fetch with populate for invoice calculation and notification
    const updatedRepair = await Repair.findById(id).populate({
      path: "appointmentId",
      select: "clientId vehicleId",
      populate: { path: "vehicleId", select: "brand model" }
    });

    // If status is "Prêt", create invoice (once) and notify the client
    if (status === "Prêt" && updatedRepair?.appointmentId) {
      const appointment: any = updatedRepair.appointmentId;
      const clientId = appointment.clientId;
      const vehicle = appointment.vehicleId;

      if (clientId) {
        // Create or Update invoice
        const { totalParts, totalLabor, totalHT, tvaRate, tvaAmount, timbreFiscal, totalTTC } = await computeInvoiceTotals(updatedRepair._id);
        const existingInvoice = await Invoice.findOne({ repairId: updatedRepair._id });
        
        if (!existingInvoice) {
          await Invoice.create({
            clientId,
            repairId: updatedRepair._id,
            totalParts,
            totalLabor,
            totalHT,
            tvaRate,
            tvaAmount,
            timbreFiscal,
            totalTTC,
            status: "Non payée",
          });
        } else if (existingInvoice.status !== "Payée") {
          // Update existing one if not paid yet
          existingInvoice.totalParts = totalParts;
          existingInvoice.totalLabor = totalLabor;
          existingInvoice.totalHT = totalHT;
          existingInvoice.tvaRate = tvaRate;
          existingInvoice.tvaAmount = tvaAmount;
          existingInvoice.timbreFiscal = timbreFiscal;
          existingInvoice.totalTTC = totalTTC;
          await existingInvoice.save();
        }

        const notification = await Notification.create({
          userId: clientId,
          title: "Véhicule Prêt !",
          message: `Bonne nouvelle ! Votre ${vehicle?.brand || 'véhicule'} ${vehicle?.model || ''} est prête à être récupérée à l'atelier.`,
          type: "status_update"
        });

        (req as any).io?.to(clientId.toString()).emit("notification", notification);

        const invoiceNotif = await Notification.create({
          userId: clientId,
          title: "Facture disponible",
          message: `Votre facture est prête. Vous pouvez la consulter dans l'application.`,
          type: "status_update",
        });
        (req as any).io?.to(clientId.toString()).emit("notification", invoiceNotif);
      }
    }

    res.json(updatedRepair);

    // Notify client of the general update via Socket.io for real-time dashboard refresh
    if (updatedRepair?.appointmentId) {
      const appointment: any = updatedRepair.appointmentId;
      const clientId = appointment.clientId;
      if (clientId) {
        (req as any).io?.to(clientId.toString()).emit("repair_update", updatedRepair);
      }
    }
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la mise à jour" });
  }
};

export const createRepair = async (req: any, res: any) => {
  const { appointmentId, worksDone, mechanicId } = req.body;
  try {
    const repair = await Repair.create({
      appointmentId,
      mechanicId: mechanicId || req.user._id,
      worksDone,
      status: "En attente"
    });
    res.status(201).json(repair);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la création de la fiche" });
  }
};
