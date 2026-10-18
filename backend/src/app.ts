import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env";
import { globalLimiter } from "./middleware/rateLimiter";
import healthRouter from "./routes/health";
import usersRouter from "./routes/users";
import testRouter from "./routes/test";
import shopifyRouter from "./routes/shopify";
import { errorHandler } from "./middleware/errorHandler";

export function createApp() {
  const app = express();

  // Trust the proxy layer (API Gateway / ALB) so rate limiter reads the real IP
  app.set("trust proxy", 1);

  // ── Security headers ──────────────────────────────────────────────────────
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
      contentSecurityPolicy: false,
    })
  );

  // ── CORS ──────────────────────────────────────────────────────────────────
  app.use(
    cors({
      origin: (origin, cb) => {
        // Allow requests with no origin (server-to-server, curl, Postman)
        if (!origin) { cb(null, true); return; }

        const allowed = [
          env.FRONTEND_URL,
          "http://localhost:3000",
          "https://localhost:3000",
          "http://localhost:3001",
        ];

        if (
          allowed.includes(origin) ||
          /\.amplifyapp\.com$/.test(origin) ||
          /\.on\.aws$/.test(origin)
        ) {
          cb(null, true);
        } else {
          cb(new Error(`CORS: origin ${origin} not allowed`));
        }
      },
      methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true,
      maxAge: 86400,
    })
  );

  // Handle preflight for all routes
  app.options("*", cors());

  // ── Body parsing ──────────────────────────────────────────────────────────
  app.use(express.json({ limit: "64kb" }));
  app.use(express.urlencoded({ extended: false, limit: "64kb" }));

  // ── Global rate limit ─────────────────────────────────────────────────────
  app.use(globalLimiter);

  // ── Request logging ───────────────────────────────────────────────────────
  if (env.NODE_ENV !== "test") {
    app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));
  }

  // ── Routes ────────────────────────────────────────────────────────────────
  app.use("/api/health", healthRouter);
  app.use("/api/users", usersRouter);
  app.use("/api/shopify", shopifyRouter);
  app.use("/api/test", testRouter); // ← remove before production

  // ── 404 ───────────────────────────────────────────────────────────────────
  app.use((_req, res) => {
    res.status(404).json({ error: "Route not found" });
  });

  // ── Central error handler (must be last) ─────────────────────────────────
  app.use(errorHandler);

  return app;
}
