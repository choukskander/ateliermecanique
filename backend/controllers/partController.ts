import mongoose from "mongoose";
import Part from "../models/Part.ts";

export const getParts = async (req: any, res: any) => {
  const { search, stock, minPrice, maxPrice } = req.query;
  const query: any = {};

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { reference: { $regex: search, $options: "i" } }
    ];
  }

  if (stock === "low") {
    query.stock = { $lte: 2 };
  } else if (stock === "in-stock") {
    query.stock = { $gt: 0 };
  }

  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) query.price.$gte = parseFloat(minPrice);
    if (maxPrice) query.price.$lte = parseFloat(maxPrice);
  }

  try {
    const parts = await Part.find(query).sort({ name: 1 });
    res.json(parts);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération du stock" });
  }
};

export const createPart = async (req: any, res: any) => {
  const { name, reference, price, stock } = req.body;

  try {
    const partExists = await Part.findOne({ reference });
    if (partExists) {
      return res.status(400).json({ message: "Référence déjà existante" });
    }

    const part = await Part.create({ name, reference, price, stock });
    res.status(201).json(part);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de l'ajout de la pièce" });
  }
};

export const updateStock = async (req: any, res: any) => {
  const { id } = req.params;
  const { quantity } = req.body; 

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "ID de pièce invalide" });
  }

  try {
    const part = await Part.findById(id);
    if (!part) {
      return res.status(404).json({ message: "Pièce non trouvée" });
    }

    part.stock += (quantity || 0);
    if (part.stock < 0) part.stock = 0;
    
    await part.save();
    res.json(part);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la mise à jour du stock" });
  }
};

export const deletePart = async (req: any, res: any) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "ID de pièce invalide" });
  }
  try {
    await Part.findByIdAndDelete(id);
    res.json({ message: "Pièce supprimée" });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la suppression" });
  }
};
