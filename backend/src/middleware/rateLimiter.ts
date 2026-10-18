import rateLimit from "express-rate-limit";

/** Global catch-all: 300 requests / 15 min per IP */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many requests — please slow down." },
  skip: (req) => req.method === "OPTIONS",
});

/** Sync endpoint: 30 requests / 15 min per IP */
export const syncLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many sync requests — try again later." },
});

/** Write mutations (PATCH / DELETE): 60 requests / 15 min per IP */
export const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many write requests — try again later." },
});
