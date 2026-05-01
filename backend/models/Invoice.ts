import mongoose from "mongoose";

const invoiceSchema = new mongoose.Schema({
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  repairId: { type: mongoose.Schema.Types.ObjectId, ref: "Repair", required: true },
  totalParts: { type: Number, required: true },
  totalLabor: { type: Number, required: true },
  totalHT: { type: Number, required: true, default: 0 },
  tvaRate: { type: Number, default: 19 },
  tvaAmount: { type: Number, default: 0 },
  timbreFiscal: { type: Number, default: 1.000 },
  totalTTC: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ["Payée", "Non payée"], 
    default: "Non payée" 
  },
}, { timestamps: true });

export default mongoose.model("Invoice", invoiceSchema);
