import { Request, Response, NextFunction } from "express";
import { verifyToken } from "@clerk/backend";
import { env } from "../config/env";

declare global {
  namespace Express {
    interface Request {
      auth?: { userId: string; sessionId: string };
    }
  }
}

// ─── In-process JWT cache ─────────────────────────────────────────────────────

interface CacheEntry {
  userId: string;
  sessionId: string;
  expiresAt: number;
}

const TOKEN_CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 55_000;
const MAX_CACHE_SIZE = 5_000;

function pruneCache() {
  if (TOKEN_CACHE.size < MAX_CACHE_SIZE) return;
  const now = Date.now();
  for (const [key, entry] of TOKEN_CACHE) {
    if (entry.expiresAt <= now) TOKEN_CACHE.delete(key);
    if (TOKEN_CACHE.size < MAX_CACHE_SIZE * 0.8) break;
  }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

    if (!token) {
      res.status(401).json({ error: "Unauthorized — missing token" });
      return;
    }

    const now = Date.now();

    // Cache hit — skip verification
    const cached = TOKEN_CACHE.get(token);
    if (cached && cached.expiresAt > now) {
      req.auth = { userId: cached.userId, sessionId: cached.sessionId };
      next();
      return;
    }

    // Verify using the standalone verifyToken export
    const payload = await verifyToken(token, {
      secretKey: env.CLERK_SECRET_KEY,
      authorizedParties: [
        "http://localhost:3000",
        "https://localhost:3000",
        env.FRONTEND_URL,
      ],
    });

    const entry: CacheEntry = {
      userId: payload.sub,
      sessionId: (payload as { sid?: string }).sid ?? "",
      expiresAt: now + CACHE_TTL_MS,
    };

    pruneCache();
    TOKEN_CACHE.set(token, entry);

    req.auth = { userId: entry.userId, sessionId: entry.sessionId };
    next();
  } catch (err) {
    console.error("[requireAuth] token verification failed:", err);
    res.status(401).json({ error: "Unauthorized — invalid or expired token" });
  }
}
