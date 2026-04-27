import mongoose from "mongoose";

const invoiceSchema = new mongoose.Schema({
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  repairId: { type: mongoose.Schema.Types.ObjectId, ref: "Repair", required: true },
  totalParts: { type: Number, required: true },
  totalLabor: { type: Number, required: true },
  totalTTC: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ["Payée", "Non payée"], 
    default: "Non payée" 
  },
}, { timestamps: true });

export default mongoose.model("Invoice", invoiceSchema);
