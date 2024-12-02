import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/connectDb.js";
import router from "./routes/route.js";

dotenv.config();
connectDB();

const app = express();

app.use(cors());
app.use(express.json({ limit: "30mb" }));
app.use(express.urlencoded({ limit: "30mb", extended: true }));

app.use("/api/v1", router);

const port = process.env.PORT || 998;

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
