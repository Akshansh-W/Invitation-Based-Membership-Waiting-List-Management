import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";

import connectDB from "./src/config/db.js";
import authRoutes from "./src/routes/authRoutes.js";
import membershipRoutes from "./src/routes/membershipRoutes.js";
import invitationRoutes from "./src/routes/invitationRoutes.js";
import postRoutes from "./src/routes/postRoutes.js";
import adminRoutes from "./src/routes/adminRoutes.js";
import notificationRoutes from "./src/routes/notificationRoutes.js";

dotenv.config({
  path: fileURLToPath(new URL("./.env", import.meta.url)),
});

const app = express();
const frontendUrl = (process.env.Frontend_url || "http://localhost:5173")
  .trim()
  .replace(/\/+$/, "");
const corsOptions = {
  origin: frontendUrl,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/membership", membershipRoutes);
app.use("/api/invitations", invitationRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/notifications", notificationRoutes);

const PORT =  5000;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Database connection failed:", error);
    process.exit(1);
  });