import express from "express";
import { getClients, getStaff } from "../controllers/userController.ts";
import { protect, staffOnly } from "../middleware/authMiddleware.ts";
import User from "../models/User.ts";

const router = express.Router();

router.get("/clients", protect, staffOnly, getClients);
router.get("/staff", protect, getStaff);

router.patch("/profile", protect, async (req: any, res: any) => {
  const { name, phone, password } = req.body;
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "Utilisateur non trouvé" });

    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (password) user.password = password;

    const updatedUser = await user.save();
    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      phone: updatedUser.phone,
      token: req.headers.authorization.split(" ")[1]
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la mise à jour" });
  }
});

export default router;
