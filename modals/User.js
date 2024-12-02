import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      minlength: 3,
      maxlength: 50,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      match: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    gender: {
      type: String,
    },
    cart: [
      {
        foodItemId: { type: mongoose.Schema.Types.ObjectId, required: true },
        quantity: { type: Number, default: 1 },
      },
    ],
    orders: [
      {
        orderId: { type: mongoose.Schema.Types.ObjectId },
        status: {
          type: String,
          default: "Order Placed Successfully",
        },
        totalPrice: { type: Number, required: true },
        date: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model("User", userSchema);

export default User;
