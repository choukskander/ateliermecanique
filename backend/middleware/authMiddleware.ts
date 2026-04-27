import jwt from "jsonwebtoken";
import User from "../models/User.ts";

export const protect = async (req: any, res: any, next: any) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded: any = jwt.verify(token, process.env.JWT_SECRET || "meca_secret_key");
      req.user = await User.findById(decoded.id).select("-password");
      if (!req.user) {
        return res.status(401).json({ message: "Utilisateur non trouvé" });
      }
      next();
    } catch (error) {
      return res.status(401).json({ message: "Non autorisé" });
    }
  } else {
    return res.status(401).json({ message: "Pas de token" });
  }
};

export const staffOnly = (req: any, res: any, next: any) => {
  if (req.user && (req.user.role === "admin" || req.user.role === "mechanic")) return next();
  return res.status(403).json({ message: "Accès refusé" });
};

export const adminOnly = (req: any, res: any, next: any) => {
  if (req.user && req.user.role === "admin") return next();
  return res.status(403).json({ message: "Accès refusé (admin uniquement)" });
};
