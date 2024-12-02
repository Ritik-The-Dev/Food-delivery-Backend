import mongoose from "mongoose";

const expireTime = () => new Date(Date.now() + 5 * 60 * 1000); 

const otpSchema = new mongoose.Schema(
  {
    otp: { type: String, required: true },
    email: { type: String, required: true },
    expire: {
      type: Date,
      default: expireTime,
      expires: 300,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Otp", otpSchema);
