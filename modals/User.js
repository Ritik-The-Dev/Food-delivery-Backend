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
    number: {
      type: String,
      required: true,
      unique: true,
      match: /^[0-9]{10}$/, // Assuming this is for phone number with 10 digits
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    address: [
      {
        state: { type: String, required: true, trim: true },
        city: { type: String, required: true, trim: true },
        pincode: { type: String, required: true, trim: true },
        number: { type: String, required: true, trim: true },
        fulladdress: { type: String, required: true, trim: true },
      },
    ],
    paymentCards: [
      {
        cardNumber: { type: String, required: true, trim: true },
        expiration: { type: String, required: true, trim: true },
        cvc: { type: String, required: true, trim: true },
        name: { type: String, required: true, trim: true },
      },
    ],
    gender: {
      type: String,
    },
    country: {
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
