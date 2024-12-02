import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../modals/User.js";
import Otp from "../modals/otp.js";
import Restaurant from "../modals/Restaurant.js";
import mongoose from "mongoose";
import authMiddleware from "../middleware/auth.js";
import otpGenerator from "otp-generator";
import express from "express";
const router = express.Router();

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ result: false, error: "Invalid data" });
  }

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({
        result: false,
        error: "Invalid email or password",
      });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({ message: "Invalid credentials." });
    }

    const token = jwt.sign(
      { email: user.email, id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );
    res.json({
      result: true,
      token: token,
      message: "Login successful",
    });
  } catch (error) {
    res.status(500).json({ result: false, error: error.message });
  }
});

router.post("/register", async (req, res) => {
  const { username, email, password, address, gender } = req.body;

  if (!username || !email || !password || !address || !gender) {
    return res
      .status(400)
      .json({ result: false, error: "All fields are required" });
  }

  if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
    return res
      .status(400)
      .json({ result: false, error: "Invalid email format" });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ result: false, error: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    await User.create({
      username,
      email,
      password: hashedPassword,
      address,
      gender,
    });

    return res.status(201).json({
      success: true,
      message: "User Created Successfully",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error, message: "Something went wrong." });
  }
});

router.get("/get-user-data", authMiddleware, async (req, res) => {
  const userId = req.user.id;

  if (!userId) {
    return res
      .status(400)
      .json({ result: false, error: "Unauthorized Access" });
  }

  try {
    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res.status(404).json({ result: false, message: "User not found" });
    }

    res.status(200).json({
      data: user,
      success: true,
    });
  } catch (error) {
    res.status(500).json({ result: false, error: error.message });
  }
});

router.put("/addToCart", authMiddleware, async (req, res) => {
  const { foodItemId, quantity } = req.body;
  const userId = req.user.id;

  if (!foodItemId || !quantity || quantity <= 0) {
    return res
      .status(400)
      .json({ result: false, error: "Invalid food item or quantity" });
  }

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ result: false, message: "User not found" });
    }

    const existingFoodItem = user.cart.find(
      (item) => item.foodItemId.toString() === foodItemId
    );

    if (existingFoodItem) {
      existingFoodItem.quantity += quantity;
    } else {
      user.cart.push({ foodItemId, quantity });
    }

    await user.save();

    res.status(200).json({
      result: true,
      message: "Food item added to cart",
      cart: user.cart,
    });
  } catch (error) {
    res.status(500).json({ result: false, error: error.message });
  }
});

router.put("/deleteCart", authMiddleware, async (req, res) => {
  const { foodItemId, quantity } = req.body;
  const userId = req.user.id;

  if (!foodItemId || !quantity || quantity <= 0) {
    return res
      .status(400)
      .json({ result: false, error: "Invalid food item or quantity" });
  }

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ result: false, message: "User not found" });
    }

    const existingFoodItem = user.cart.find(
      (item) => item.foodItemId.toString() === foodItemId
    );

    if (existingFoodItem) {
      existingFoodItem.quantity -= quantity;

      if (existingFoodItem.quantity <= 0) {
        user.cart = user.cart.filter(
          (item) => item.foodItemId.toString() !== foodItemId
        );
      }

      await user.save();

      return res.status(200).json({
        result: true,
        message:
          existingFoodItem.quantity <= 0
            ? "Food item removed from cart"
            : "Quantity updated",
        cart: user.cart,
      });
    } else {
      return res
        .status(404)
        .json({ result: false, message: "Food item not found in cart" });
    }
  } catch (error) {
    return res.status(500).json({ result: false, error: error.message });
  }
});

router.put("/edit-profile", authMiddleware, async (req, res) => {
  const { username, address, email, gender } = req.body;
  const userId = req.user.id;

  if (!username && !address && !email && !gender) {
    return res
      .status(400)
      .json({ result: false, error: "No fields to update" });
  }

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ result: false, message: "User not found" });
    }

    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email: email });

      if (existingUser) {
        return res
          .status(400)
          .json({ result: false, error: "Email already in use" });
      }

      user.email = email;
    }

    if (username) user.username = username;
    if (address) user.address = address;
    if (gender) user.gender = gender;

    await user.save();

    res.status(200).json({
      result: true,
      message: "Profile updated successfully",
    });
  } catch (error) {
    res.status(500).json({ result: false, error: error.message });
  }
});

router.get("/restaurants", async (req, res) => {
  try {
    const restaurants = await Restaurant.find();
    res.status(200).json({ result: true, restaurants });
  } catch (error) {
    res.status(500).json({ result: false, error: error.message });
  }
});

router.put("/create-order", authMiddleware, async (req, res) => {
  const { totalPrice, type } = req.body;
  const userId = req.user.id;

  if (!totalPrice || totalPrice <= 0) {
    return res
      .status(400)
      .json({ result: false, error: "Invalid order total price" });
  }

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ result: false, message: "User not found" });
    }

    const newOrder = {
      orderId: new mongoose.Types.ObjectId(),
      totalPrice,
    };

    user.orders.push(newOrder);
    if (type !== "shared") {
      user.cart = [];
    }

    await user.save();

    res.status(201).json({
      result: true,
      message: "Order placed successfully",
      order: newOrder,
    });
  } catch (error) {
    res.status(500).json({ result: false, error: error.message });
  }
});

router.put("/send-otp", async (req, res) => {
  try {
    const { email } = req.body;

    const userExist = await User.findOne({ email });
    if (!userExist) {
      return res.status(404).json({
        message: "User does not exist with this email",
        success: false,
      });
    }

    await Otp.deleteMany({ email });

    const otp = otpGenerator.generate(6, {
      lowerCaseAlphabets: false,
      upperCaseAlphabets: false,
      specialChars: false,
    });

    await Otp.create({ otp, email });

    const transporter = nodeMailer.createTransport({
      host: process.env.MAIL_HOST,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });

    try {
      await transporter.sendMail({
        from: "Food-Delivery-ORDER.UK",
        to: email,
        subject: "Forget Password Authentication",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background-color: #f9f9f9;">
            <h2 style="text-align: center; color: #333;">Password Reset OTP</h2>
            <p style="font-size: 16px; color: #555;">Hello,</p>
            <p style="font-size: 16px; color: #555;">Your OTP for authentication is:</p>
            <div style="text-align: center; margin: 20px 0;">
              <span style="font-size: 24px; font-weight: bold; color: #007BFF; padding: 10px 20px; border: 2px solid #007BFF; border-radius: 4px; display: inline-block;">${otp}</span>
            </div>
            <p style="font-size: 16px; color: #555;">Please do not share this OTP with anyone. It is valid for 5 minutes only.</p>
            <p style="font-size: 16px; color: #555;">Thank you,<br>Food-Delivery-ORDER.UK Team</p>
          </div>
        `,
      });
    } catch (err) {
      console.error(`Failed to send Email:`, err);
      return res.status(500).json({
        message: "Failed to send OTP email",
        success: false,
      });
    }

    res.status(200).json({
      message: `OTP has been sent to your registered email ID`,
      success: true,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      data: err.message,
      message: "Internal Server Error",
    });
  }
});

router.put("/forget-password", async (req, res) => {
  const { email, otp, password } = req.body;

  if (!email || !password || !otp) {
    return res.status(400).json({
      result: false,
      error: "All fields are required",
    });
  }

  if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
    return res.status(400).json({
      result: false,
      error: "Invalid email format",
    });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        result: false,
        message: "User not found",
      });
    }

    const existingOtp = await Otp.findOne({ email, otp });
    if (!existingOtp) {
      return res.status(400).json({
        result: false,
        message: "Invalid or expired OTP",
      });
    }

    const isOtpExpired = existingOtp.expire < new Date();
    if (isOtpExpired) {
      await Otp.deleteMany({ email });
      return res.status(400).json({
        result: false,
        message: "OTP has expired, please request a new one",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    user.password = hashedPassword;

    await user.save();
    await Otp.deleteMany({ email });

    res.status(200).json({
      result: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    res.status(500).json({
      result: false,
      error: error.message,
    });
  }
});

export default router;
