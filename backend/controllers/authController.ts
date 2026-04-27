import jwt from "jsonwebtoken";
import User from "../models/User.ts";

const generateToken = (id: string) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || "meca_secret_key", { expiresIn: "30d" });
};

export const registerUser = async (req: any, res: any) => {
  const { name, email, password, role } = req.body;

  const userExists = await User.findOne({ email });

  if (userExists) {
    return res.status(400).json({ message: "Utilisateur déjà existant" });
  }

  const user = await User.create({ name, email, password, role });

  if (user) {
    res.status(201).json({
      _id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user.id),
    });
  } else {
    res.status(400).json({ message: "Données invalides" });
  }
};

export const loginUser = async (req: any, res: any) => {
  const { email, password } = req.body;

  const user: any = await User.findOne({ email });

  if (user && (await user.matchPassword(password))) {
    res.json({
      _id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user.id),
    });
  } else {
    res.status(401).json({ message: "Email ou mot de passe incorrect" });
  }
};
