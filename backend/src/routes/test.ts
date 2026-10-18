/**
 * /api/test  — unauthenticated DynamoDB CRUD smoke-test
 * Remove this route (or gate it behind auth) before going to production.
 */
import { Router, Request, Response, NextFunction } from "express";
import {
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import { dynamo, USERS_TABLE } from "../config/dynamodb";

const router = Router();

const TEST_PREFIX = "test_";

// ─── CREATE  POST /api/test ───────────────────────────────────────────────────
router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email } = req.body as { name?: string; email?: string };
    if (!name || !email) {
      res.status(400).json({ error: "name and email are required" });
      return;
    }

    const userId = `${TEST_PREFIX}${Date.now()}`;
    const item = {
      userId,
      email,
      firstName: name,
      authProvider: "test",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await dynamo.send(new PutCommand({ TableName: USERS_TABLE, Item: item }));
    res.status(201).json({ message: "Created", item });
  } catch (err) {
    next(err);
  }
});

// ─── READ ALL  GET /api/test ──────────────────────────────────────────────────
router.get("/", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await dynamo.send(
      new ScanCommand({
        TableName: USERS_TABLE,
        FilterExpression: "begins_with(userId, :prefix)",
        ExpressionAttributeValues: { ":prefix": TEST_PREFIX },
      })
    );
    res.json({ items: result.Items ?? [], count: result.Count ?? 0 });
  } catch (err) {
    next(err);
  }
});

// ─── READ ONE  GET /api/test/:id ──────────────────────────────────────────────
router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await dynamo.send(
      new GetCommand({ TableName: USERS_TABLE, Key: { userId: req.params.id } })
    );
    if (!result.Item) {
      res.status(404).json({ error: "Item not found" });
      return;
    }
    res.json({ item: result.Item });
  } catch (err) {
    next(err);
  }
});

// ─── UPDATE  PATCH /api/test/:id ─────────────────────────────────────────────
router.patch("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email } = req.body as { name?: string; email?: string };
    if (!name && !email) {
      res.status(400).json({ error: "Provide name or email to update" });
      return;
    }

    const fields: Record<string, string> = { updatedAt: new Date().toISOString() };
    if (name) fields.firstName = name;
    if (email) fields.email = email;

    const entries = Object.entries(fields);
    const updateExpr = "SET " + entries.map((_, i) => `#f${i} = :v${i}`).join(", ");
    const exprNames = Object.fromEntries(entries.map(([k], i) => [`#f${i}`, k]));
    const exprValues = Object.fromEntries(entries.map(([, v], i) => [`:v${i}`, v]));

    const result = await dynamo.send(
      new UpdateCommand({
        TableName: USERS_TABLE,
        Key: { userId: req.params.id },
        UpdateExpression: updateExpr,
        ExpressionAttributeNames: exprNames,
        ExpressionAttributeValues: exprValues,
        ConditionExpression: "attribute_exists(userId)",
        ReturnValues: "ALL_NEW",
      })
    );
    res.json({ message: "Updated", item: result.Attributes });
  } catch (err: unknown) {
    if ((err as { name?: string }).name === "ConditionalCheckFailedException") {
      res.status(404).json({ error: "Item not found" });
      return;
    }
    next(err);
  }
});

// ─── DELETE  DELETE /api/test/:id ────────────────────────────────────────────
router.delete("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    await dynamo.send(
      new DeleteCommand({ TableName: USERS_TABLE, Key: { userId: req.params.id } })
    );
    res.json({ message: "Deleted", userId: req.params.id });
  } catch (err) {
    next(err);
  }
});

export default router;
