import { z } from "zod";

// ─── Re-usable field rules ───────────────────────────────────────────────────

const nameField = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[\p{L}\p{M}' -]+$/u, "Name contains invalid characters")
  .optional();

const imageUrlField = z
  .string()
  .url("imageUrl must be a valid URL")
  .max(512)
  .optional();

// ─── Sync body ───────────────────────────────────────────────────────────────

export const syncBodySchema = z.object({
  email: z
    .string({ required_error: "email is required" })
    .trim()
    .email("Must be a valid email address")
    .max(254),
  firstName: nameField,
  lastName: nameField,
  imageUrl: imageUrlField,
  authProvider: z
    .string({ required_error: "authProvider is required" })
    .trim()
    .min(1)
    .max(32)
    .regex(/^[a-z0-9_-]+$/i, "authProvider contains invalid characters"),
  metadata: z.record(z.unknown()).optional(),
});

export type SyncBody = z.infer<typeof syncBodySchema>;

// ─── Update (PATCH /me) body ─────────────────────────────────────────────────

export const updateBodySchema = z
  .object({
    firstName: nameField,
    lastName: nameField,
    imageUrl: imageUrlField,
    metadata: z.record(z.unknown()).optional(),
  })
  .strict(); // reject unknown keys

export type UpdateBody = z.infer<typeof updateBodySchema>;

// ─── List query params ───────────────────────────────────────────────────────

export const listQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 50))
    .pipe(z.number().int().min(1).max(200)),
});
