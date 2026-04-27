import User from "../models/User.ts";

export const getClients = async (req: any, res: any) => {
  try {
    const clients = await User.find({ role: "client" }).select("name email phone");
    res.json(clients);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération des clients" });
  }
};

export const getStaff = async (req: any, res: any) => {
  try {
    const staff = await User.find({ role: { $in: ["admin", "mechanic"] } }).select("name email role");
    res.json(staff);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération du personnel" });
  }
};
