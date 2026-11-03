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

const productionFrontendOrigin =
  "https://invitation-based-membership-waiting.vercel.app";
const localFrontendOrigin = "http://localhost:5173";

function normalizeOrigin(value) {
  if (typeof value !== "string" || !value.trim()) return null;

  try {
    const url = new URL(value.trim());
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      (url.pathname !== "/" && url.pathname !== "") ||
      url.search ||
      url.hash
    ) {
      return null;
    }

    return url.origin;
  } catch {
    return null;
  }
}

const configuredFrontendOrigin = normalizeOrigin(
  process.env.FRONTEND_URL || process.env.Frontend_url
) || productionFrontendOrigin;
const allowedOrigins = new Set([
  configuredFrontendOrigin,
  productionFrontendOrigin,
  localFrontendOrigin,
]);

const app = express();
const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);

    const normalizedOrigin = normalizeOrigin(origin);
    if (normalizedOrigin && allowedOrigins.has(normalizedOrigin)) {
      return callback(null, true);
    }

    console.warn("[CORS] Rejected origin", {
      origin,
      configuredAllowedOrigin: configuredFrontendOrigin,
    });
    return callback(null, false);
  },
  credentials: true,
  methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204,
  maxAge: 86400,
};

app.use((req, _res, next) => {
  console.info("[CORS] Request origin", {
    origin: req.get("Origin") || null,
    configuredAllowedOrigin: configuredFrontendOrigin,
  });
  next();
});
app.use(cors(corsOptions));

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