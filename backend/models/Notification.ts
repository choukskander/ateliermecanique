import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  read: { type: Boolean, default: false },
  type: { type: String, enum: ["status_update", "appointment", "chat"], default: "status_update" },
}, { timestamps: true });

export default mongoose.model("Notification", notificationSchema);
