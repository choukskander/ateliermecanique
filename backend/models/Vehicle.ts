import mongoose from "mongoose";

const vehicleSchema = new mongoose.Schema({
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  brand: { type: String, required: true },
  model: { type: String, required: true },
  licensePlate: { type: String, required: true, unique: true },
}, { timestamps: true });

export default mongoose.model("Vehicle", vehicleSchema);
