import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";

type Target = "body" | "query" | "params";

/**
 * Returns an Express middleware that validates req[target] against the
 * provided Zod schema and replaces it with the parsed (coerced) value.
 * On failure it sends a structured 422 with all field errors.
 */
export function validate(schema: ZodSchema, target: Target = "body") {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      const errors = (result.error as ZodError).errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      }));
      res.status(422).json({ error: "Validation failed", errors });
      return;
    }
    // Replace with the parsed + coerced value
    (req as unknown as Record<string, unknown>)[target] = result.data;
    next();
  };
}
