import mongoose from "mongoose";

const availabilitySchema = new mongoose.Schema({
  mechanicId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  dayOfWeek: { type: Number, required: true }, // 0 for Sunday, 1 for Monday, etc.
  startTime: { type: String, required: true }, // "09:00"
  endTime: { type: String, required: true },   // "18:00"
  isAvailable: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model("Availability", availabilitySchema);
