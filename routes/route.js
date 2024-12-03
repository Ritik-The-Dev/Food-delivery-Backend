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
  const { username, email, password, number } = req.body;
  if (!username || !email || !password || !number) {
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
    const existingUser1 = await User.findOne({ number });
    if (existingUser1) {
      return res
        .status(400)
        .json({ result: false, error: "Number already registered" });
    }
    const hashedPassword = await bcrypt.hash(password, 12);
    await User.create({
      username,
      email,
      password: hashedPassword,
      number,
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
  const { username, country, email, gender } = req.body;
  const userId = req.user.id;

  if (!username && !country && !email && !gender) {
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
    if (country) user.country = country;
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

router.put("/add-address", authMiddleware, async (req, res) => {
  const { state, city, pincode, number, fulladdress } = req.body;
  const userId = req.user.id;

  if (!state || !city || !pincode || !number || !fulladdress) {
    return res
      .status(400)
      .json({ result: false, error: "All address fields are required" });
  }

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ result: false, message: "User not found" });
    }

    const newAddress = {
      state,
      city,
      pincode,
      number,
      fulladdress,
    };

    user.address.push(newAddress);
    await user.save();
    const { _id } = user.address[user.address.length - 1];
    res.status(200).json({
      result: true,
      message: "Address added successfully",
      _id,
    });
  } catch (error) {
    res.status(500).json({ result: false, error: error.message });
  }
});

router.delete(
  "/delete-address/:addressId",
  authMiddleware,
  async (req, res) => {
    const userId = req.user.id;
    const { addressId } = req.params;

    try {
      const user = await User.findById(userId);

      if (!user) {
        return res
          .status(404)
          .json({ result: false, message: "User not found" });
      }

      const addressIndex = user.address.findIndex(
        (addr) => addr._id.toString() === addressId
      );

      if (addressIndex === -1) {
        return res
          .status(404)
          .json({ result: false, message: "Address not found" });
      }

      user.address.splice(addressIndex, 1);
      await user.save();

      res.status(200).json({
        result: true,
        message: "Address deleted successfully",
      });
    } catch (error) {
      res.status(500).json({ result: false, error: error.message });
    }
  }
);

router.put("/edit-address/:addressId", authMiddleware, async (req, res) => {
  const { state, city, pincode, number, fulladdress } = req.body;
  const userId = req.user.id;
  const { addressId } = req.params;

  if (!state || !city || !pincode || !number || !fulladdress) {
    return res
      .status(400)
      .json({ result: false, error: "All address fields are required" });
  }

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ result: false, message: "User not found" });
    }

    const address = user.address.id(addressId);
    if (!address) {
      return res
        .status(404)
        .json({ result: false, message: "Address not found" });
    }

    address.state = state;
    address.city = city;
    address.pincode = pincode;
    address.number = number;
    address.fulladdress = fulladdress;

    await user.save();

    res.status(200).json({
      result: true,
      message: "Address updated successfully",
    });
  } catch (error) {
    res.status(500).json({ result: false, error: error.message });
  }
});

router.put("/add-card", authMiddleware, async (req, res) => {
  const { cardNumber, expiration, cvc, name } = req.body;
  const userId = req.user.id;

  if (!cardNumber || !expiration || !cvc || !name) {
    return res
      .status(400)
      .json({ result: false, error: "All card fields are required" });
  }

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ result: false, message: "User not found" });
    }

    const newCard = {
      cardNumber,
      expiration,
      cvc,
      name,
    };

    user.paymentCards.push(newCard);
    await user.save();

    res.status(200).json({
      result: true,
      message: "Payment card added successfully",
    });
  } catch (error) {
    res.status(500).json({ result: false, error: error.message });
  }
});

router.delete("/delete-card/:cardId", authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const { cardId } = req.params;

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ result: false, message: "User not found" });
    }

    const cardIndex = user.paymentCards.findIndex(
      (card) => card._id.toString() === cardId
    );

    if (cardIndex === -1) {
      return res.status(404).json({ result: false, message: "Card not found" });
    }

    user.paymentCards.splice(cardIndex, 1);
    await user.save();

    res.status(200).json({
      result: true,
      message: "Card deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ result: false, error: error.message });
  }
});

router.put("/edit-card/:cardId", authMiddleware, async (req, res) => {
  const { cardNumber, expiration, cvc, name } = req.body;
  const userId = req.user.id;
  const { cardId } = req.params;

  if (!cardNumber || !expiration || !cvc || !name) {
    return res
      .status(400)
      .json({ result: false, error: "All card fields are required" });
  }

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ result: false, message: "User not found" });
    }

    const card = user.paymentCards.id(cardId);
    if (!card) {
      return res.status(404).json({ result: false, message: "Card not found" });
    }

    card.cardNumber = cardNumber;
    card.expiration = expiration;
    card.cvc = cvc;
    card.name = name;

    await user.save();

    res.status(200).json({
      result: true,
      message: "Card updated successfully",
    });
  } catch (error) {
    res.status(500).json({ result: false, error: error.message });
  }
});

export default router;
