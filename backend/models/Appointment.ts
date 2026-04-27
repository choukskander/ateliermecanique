import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema({
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle", required: true },
  mechanicId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  date: { type: Date, required: true },
  status: { 
    type: String, 
    enum: ["En attente", "Confirmé", "Annulé"], 
    default: "En attente" 
  },
  description: { type: String },
}, { timestamps: true });

export default mongoose.model("Appointment", appointmentSchema);
