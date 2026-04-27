import mongoose from "mongoose";
import Message from "../models/Message.ts";
import Appointment from "../models/Appointment.ts";

export const getMessages = async (req: any, res: any) => {
  try {
    const selfId = req.user._id;
    const { otherId, appointmentId } = req.query;

    if (appointmentId) {
      if (!mongoose.Types.ObjectId.isValid(appointmentId as string)) {
        return res.status(400).json({ message: "appointmentId invalide" });
      }
      const appt = await Appointment.findById(appointmentId).select("clientId mechanicId");
      if (!appt) return res.status(404).json({ message: "Rendez-vous non trouvé" });

      const isParticipant =
        String(appt.clientId) === String(selfId) || String(appt.mechanicId) === String(selfId);
      if (!isParticipant) return res.status(403).json({ message: "Accès refusé" });

      const messages = await Message.find({
        appointmentId,
        $or: [{ senderId: selfId }, { receiverId: selfId }],
      }).sort({ createdAt: 1 });
      return res.json(messages);
    }

    if (!otherId) return res.status(400).json({ message: "otherId manquant" });
    if (!mongoose.Types.ObjectId.isValid(otherId as string)) {
      return res.status(400).json({ message: "otherId invalide" });
    }

    const isStaff = req.user.role === "admin" || req.user.role === "mechanic";
    const workshopId = "660000000000000000000001";

    let messages;
    if (isStaff) {
      // Staff sees everything related to this client (otherId)
      messages = await Message.find({
        $or: [
          { senderId: otherId }, 
          { receiverId: otherId }
        ]
      }).sort({ createdAt: 1 });
    } else {
      // Client sees everything involving themselves AND the current selected user
      // OR everything involving themselves and the workshop
      messages = await Message.find({
        $or: [
          { senderId: selfId, receiverId: otherId },
          { senderId: otherId, receiverId: selfId },
          { senderId: selfId, receiverId: workshopId },
          { senderId: workshopId, receiverId: selfId }
        ]
      }).sort({ createdAt: 1 });
    }

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération des messages" });
  }
};

export const sendMessage = async (req: any, res: any) => {
  const { receiverId, content, appointmentId } = req.body;

  try {
    if (!receiverId || !mongoose.Types.ObjectId.isValid(receiverId)) {
      return res.status(400).json({ message: "receiverId invalide" });
    }
    if (!content || !String(content).trim()) {
      return res.status(400).json({ message: "Message vide" });
    }

    const senderId = req.user._id;

    if (appointmentId) {
      if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
        return res.status(400).json({ message: "appointmentId invalide" });
      }
      const appt = await Appointment.findById(appointmentId).select("clientId mechanicId");
      if (!appt) return res.status(404).json({ message: "Rendez-vous non trouvé" });
      const isParticipant =
        String(appt.clientId) === String(senderId) || String(appt.mechanicId) === String(senderId);
      const otherIsParticipant =
        String(appt.clientId) === String(receiverId) || String(appt.mechanicId) === String(receiverId);
      if (!isParticipant || !otherIsParticipant) {
        return res.status(403).json({ message: "Accès refusé" });
      }
    }

    const message = await Message.create({ senderId, receiverId, content, appointmentId });
    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de l'envoi du message" });
  }
};
