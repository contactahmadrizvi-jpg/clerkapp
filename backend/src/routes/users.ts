import { Router, Request, Response, NextFunction } from "express";
import { requireAuth } from "../middleware/requireAuth";
import { validate } from "../validation/validate";
import {
  syncBodySchema,
  updateBodySchema,
  listQuerySchema,
  SyncBody,
  UpdateBody,
} from "../validation/schemas";
import { syncLimiter, writeLimiter } from "../middleware/rateLimiter";
import { upsertUser, getUser, updateUser, deleteUser, listUsers } from "../db/users";

const router = Router();

// ─── POST /api/users/sync ────────────────────────────────────────────────────
router.post(
  "/sync",
  syncLimiter,
  requireAuth,
  validate(syncBodySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.auth!;
      const body = req.body as SyncBody;

      const user = await upsertUser({ userId, ...body });
      res.status(200).json({ user });
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /api/users/me ───────────────────────────────────────────────────────
router.get(
  "/me",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await getUser(req.auth!.userId);
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      // Cache user data for 10 s on client, 60 s stale-while-revalidate
      res.setHeader("Cache-Control", "private, max-age=10, stale-while-revalidate=60");
      res.json({ user });
    } catch (err) {
      next(err);
    }
  }
);

// ─── PATCH /api/users/me ─────────────────────────────────────────────────────
router.patch(
  "/me",
  writeLimiter,
  requireAuth,
  validate(updateBodySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body as UpdateBody;
      const user = await updateUser(req.auth!.userId, body);
      res.json({ user });
    } catch (err) {
      next(err);
    }
  }
);

// ─── DELETE /api/users/me ────────────────────────────────────────────────────
router.delete(
  "/me",
  writeLimiter,
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await deleteUser(req.auth!.userId);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /api/users ──────────────────────────────────────────────────────────
router.get(
  "/",
  requireAuth,
  validate(listQuerySchema, "query"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { limit } = req.query as unknown as { limit: number };
      const users = await listUsers(limit);
      res.json({ users, count: users.length });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
