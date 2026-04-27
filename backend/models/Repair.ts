import mongoose from "mongoose";

const repairSchema = new mongoose.Schema({
  appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Appointment", required: true },
  mechanicId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  worksDone: { type: String },
  partsUsed: [{
    partId: { type: mongoose.Schema.Types.ObjectId, ref: "Part" },
    quantity: { type: Number, default: 1 }
  }],
  laborCost: { type: Number, default: 0 },
  status: { 
    type: String, 
    enum: ["En attente", "Diagnostic", "Attente Pièces", "En réparation", "Contrôle", "Prêt"], 
    default: "En attente" 
  },
}, { timestamps: true });

export default mongoose.model("Repair", repairSchema);
