import mongoose from "mongoose";
import Appointment from "../models/Appointment.ts";
import Vehicle from "../models/Vehicle.ts";
import Availability from "../models/Availability.ts";
import Repair from "../models/Repair.ts";
import Notification from "../models/Notification.ts";

export const createAppointment = async (req: any, res: any) => {
  const { vehicleInfo, date, description, mechanicId } = req.body;
  
  if (!date || !vehicleInfo || !vehicleInfo.plate) {
    return res.status(400).json({ message: "Informations de rendez-vous ou de véhicule manquantes" });
  }

  const checkDate = new Date(date);
  if (isNaN(checkDate.getTime())) {
    return res.status(400).json({ message: "Date invalide" });
  }

  const day = checkDate.getDay();

  try {
    const checkTime = checkDate.getHours().toString().padStart(2, '0') + ":" + checkDate.getMinutes().toString().padStart(2, '0');
    
    const baseQuery: any = {
      dayOfWeek: day,
      isAvailable: true,
      startTime: { $lte: checkTime },
      endTime: { $gt: checkTime }
    };

    // If client picks a mechanic, we must respect it.
    if (mechanicId) {
      if (!mongoose.Types.ObjectId.isValid(mechanicId)) {
        return res.status(400).json({ message: "ID mécanicien invalide" });
      }
      baseQuery.mechanicId = mechanicId;
    }

    const availableMechanicsSchedules = await Availability.find(baseQuery);
    if (availableMechanicsSchedules.length === 0) {
      return res.status(400).json({ message: mechanicId ? "Mécanicien indisponible à ce créneau" : "L'atelier est fermé à cette heure-là ou ce jour-là" });
    }

    // Choose a mechanic who is free (if mechanicId is provided, list has 0..n, but usually 1).
    let assignedMechanicId = null;
    for (const schedule of availableMechanicsSchedules) {
      const existing = await Appointment.findOne({
        mechanicId: schedule.mechanicId,
        date: checkDate,
        status: { $ne: "Annulé" }
      });
      if (!existing) {
        assignedMechanicId = schedule.mechanicId;
        break;
      }
    }

    if (!assignedMechanicId) {
      return res.status(400).json({ message: "Créneau déjà pris pour ce mécanicien." });
    }

    // Basic vehicle creation logic if not exists (demo simplification)
    let vehicle = await Vehicle.findOne({ licensePlate: vehicleInfo.plate });
    if (!vehicle) {
      vehicle = await Vehicle.create({
        clientId: req.user._id,
        brand: vehicleInfo.brand,
        model: vehicleInfo.model,
        licensePlate: vehicleInfo.plate
      });
    }

    const appointment = await Appointment.create({
      clientId: req.user._id,
      vehicleId: vehicle._id,
      mechanicId: assignedMechanicId,
      date,
      description,
      status: "En attente"
    });

    res.status(201).json(appointment);
  } catch (error: any) {
    console.error("Create appointment error:", error);
    res.status(500).json({ message: "Erreur lors de la création du rendez-vous", details: error.message });
  }
};

export const getAppointments = async (req: any, res: any) => {
  try {
    let query = {};
    if (req.user.role === "client") {
      query = { clientId: req.user._id };
    }

    const appointments = await Appointment.find(query)
      .populate("clientId", "name email")
      .populate("vehicleId")
      .sort({ date: 1 });

    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération des rendez-vous" });
  }
};

export const updateAppointmentStatus = async (req: any, res: any) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "ID de rendez-vous invalide" });
  }

  try {
    const appointment = await Appointment.findByIdAndUpdate(id, { status }, { new: true })
      .populate("clientId", "_id name")
      .populate("vehicleId", "brand model")
      .populate("mechanicId", "_id name");
    if (!appointment) {
      return res.status(404).json({ message: "Rendez-vous non trouvé" });
    }

    // Auto-create Repair when appointment is confirmed
    if (status === "Confirmé") {
      const existingRepair = await Repair.findOne({ appointmentId: appointment._id });
      if (!existingRepair && appointment.mechanicId) {
        await Repair.create({
          appointmentId: appointment._id,
          mechanicId: (appointment as any).mechanicId._id || appointment.mechanicId,
          status: "En attente",
        });
      }

      // Notify client
      if (appointment.clientId) {
        const vehicle: any = (appointment as any).vehicleId;
        const notification = await Notification.create({
          userId: (appointment as any).clientId._id || appointment.clientId,
          title: "Rendez-vous confirmé",
          message: `Votre rendez-vous pour ${vehicle?.brand || "votre véhicule"} ${vehicle?.model || ""} a été confirmé.`,
          type: "appointment",
        });
        (req as any).io?.to(((appointment as any).clientId._id || appointment.clientId).toString()).emit("notification", notification);
      }
    }

    if (status === "Annulé" && appointment.clientId) {
      const vehicle: any = (appointment as any).vehicleId;
      const notification = await Notification.create({
        userId: (appointment as any).clientId._id || appointment.clientId,
        title: "Rendez-vous annulé",
        message: `Votre rendez-vous pour ${vehicle?.brand || "votre véhicule"} ${vehicle?.model || ""} a été annulé.`,
        type: "appointment",
      });
      (req as any).io?.to(((appointment as any).clientId._id || appointment.clientId).toString()).emit("notification", notification);
    }

    res.json(appointment);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la mise à jour" });
  }
};

export const deleteAppointment = async (req: any, res: any) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "ID invalide" });

  try {
    const appointment = await Appointment.findByIdAndDelete(id);
    if (!appointment) return res.status(404).json({ message: "Rendez-vous non trouvé" });
    res.json({ message: "Rendez-vous supprimé avec succès" });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la suppression" });
  }
};
