import Notification from "../models/Notification.ts";

export const getNotifications = async (req: any, res: any) => {
  try {
    const notifications = await Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(20);
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération" });
  }
};

export const markAsRead = async (req: any, res: any) => {
  try {
    await Notification.updateMany({ userId: req.user._id, read: false }, { read: true });
    res.json({ message: "Notifications lues" });
  } catch (error) {
    res.status(500).json({ message: "Erreur" });
  }
};

export const deleteAllNotifications = async (req: any, res: any) => {
  try {
    await Notification.deleteMany({ userId: req.user._id });
    res.json({ message: "Notifications supprimées" });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la suppression" });
  }
};
