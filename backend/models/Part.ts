import mongoose from "mongoose";

const partSchema = new mongoose.Schema({
  name: { type: String, required: true },
  reference: { type: String, required: true, unique: true },
  price: { type: Number, required: true },
  stock: { type: Number, required: true, default: 0 },
}, { timestamps: true });

export default mongoose.model("Part", partSchema);
