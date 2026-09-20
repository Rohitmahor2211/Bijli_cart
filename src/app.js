import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import { env } from "./config/env.js";
import { sendSuccess, sendError } from "./utils/apiResponse.js";
import { errorHandler } from "./middleware/error.middleware.js";
import { requireTrustedOrigin } from "./middleware/csrf.middleware.js";
import apiRoutes from "./routes/index.js";
import { razorpayWebhook } from "./controllers/razorpayWebhook.controller.js";
// console
const app = express();

// Security Middlewares
app.use(
  helmet({
    contentSecurityPolicy: false, // Allow inline styles & scripts for dashboard preview page
  }),
);


const allowedOrigins = env.CLIENT_URL.split(",");

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);
// Cookie-authenticated state changes must come from the configured frontend.
// The raw Razorpay webhook is mounted before this guard and is verified separately.
app.use(requireTrustedOrigin);

// Razorpay signs the exact raw request payload, so this route must be mounted
// before the JSON body parser below.
app.post(
  "/api/payment-webhooks/razorpay",
  express.raw({ type: "application/json" }),
  razorpayWebhook,
);

// Request Parsers
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// Serve Static Frontend Dashboard / API Tester
app.use(express.static("public"));

// HTTP Request Logger
if (env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

// Health Check Endpoint
app.get("/api/health", (req, res) => {
  return sendSuccess(res, "Retailer E-commerce Backend API is healthy", {
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    env: env.NODE_ENV,
  });
});

// Mount Main API Router
app.use("/api", apiRoutes);

// 404 Route Not Found Handler (Express compatible catch-all)
app.use((req, res) => {
  return sendError(
    res,
    `Cannot ${req.method} ${req.originalUrl} - Endpoint not found`,
    null,
    404,
  );
});

// Global Centralized Error Handler Middleware
app.use(errorHandler);

export { app };
