import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  username: { type: String },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  role: { type: String, default: "user" },
  resetCode: { type: String, default: null },
  resetExpires: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("User", userSchema);
