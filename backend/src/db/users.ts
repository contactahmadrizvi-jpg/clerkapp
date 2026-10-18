import {
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import { dynamo, USERS_TABLE } from "../config/dynamodb";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface UserRecord {
  /** Clerk user ID — partition key */
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  imageUrl?: string;
  /** "google" | "email" | "github" … */
  authProvider: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const now = () => new Date().toISOString();

// ─── CRUD ─────────────────────────────────────────────────────────────────────

/**
 * Upsert a user record with a single DynamoDB call.
 *
 * Uses UpdateItem with `if_not_exists` for createdAt so it is set only on
 * the first write — no extra GetItem round-trip needed.
 */
export async function upsertUser(
  data: Omit<UserRecord, "createdAt" | "updatedAt">
): Promise<UserRecord> {
  const ts = now();

  // Build a dynamic SET expression for all provided fields
  const mutableFields: (keyof Omit<UserRecord, "userId" | "createdAt" | "updatedAt">)[] = [
    "email",
    "authProvider",
    "firstName",
    "lastName",
    "imageUrl",
    "metadata",
  ];

  const setClauses: string[] = [
    // createdAt is set only on first insert
    "createdAt = if_not_exists(createdAt, :createdAt)",
    "updatedAt = :updatedAt",
  ];
  const exprNames: Record<string, string> = {};
  const exprValues: Record<string, unknown> = {
    ":createdAt": ts,
    ":updatedAt": ts,
  };

  let idx = 0;
  for (const field of mutableFields) {
    const val = data[field as keyof typeof data];
    if (val === undefined) continue;
    const nameKey = `#f${idx}`;
    const valKey = `:v${idx}`;
    setClauses.push(`${nameKey} = ${valKey}`);
    exprNames[nameKey] = field;
    exprValues[valKey] = val;
    idx++;
  }

  const result = await dynamo.send(
    new UpdateCommand({
      TableName: USERS_TABLE,
      Key: { userId: data.userId },
      UpdateExpression: "SET " + setClauses.join(", "),
      ExpressionAttributeNames: Object.keys(exprNames).length ? exprNames : undefined,
      ExpressionAttributeValues: exprValues,
      ReturnValues: "ALL_NEW",
    })
  );

  return result.Attributes as UserRecord;
}

/** Fetch a single user by their Clerk userId. */
export async function getUser(userId: string): Promise<UserRecord | null> {
  const result = await dynamo.send(
    new GetCommand({
      TableName: USERS_TABLE,
      Key: { userId },
      // Only project what we actually use
      ProjectionExpression:
        "userId, email, firstName, lastName, imageUrl, authProvider, createdAt, updatedAt, metadata",
    })
  );
  return (result.Item as UserRecord) ?? null;
}

/** Fetch a user by email via the GSI. */
export async function getUserByEmail(email: string): Promise<UserRecord | null> {
  const result = await dynamo.send(
    new QueryCommand({
      TableName: USERS_TABLE,
      IndexName: "email-index",
      KeyConditionExpression: "email = :email",
      ExpressionAttributeValues: { ":email": email },
      Limit: 1,
    })
  );
  return ((result.Items?.[0]) as UserRecord) ?? null;
}

/** Partial update — only supply the fields you want to change. */
export async function updateUser(
  userId: string,
  fields: Partial<Omit<UserRecord, "userId" | "createdAt">>
): Promise<UserRecord | null> {
  const entries = Object.entries({ ...fields, updatedAt: now() });
  if (entries.length === 0) return getUser(userId);

  const updateExpr = "SET " + entries.map((_, i) => `#f${i} = :v${i}`).join(", ");
  const exprNames = Object.fromEntries(entries.map(([k], i) => [`#f${i}`, k]));
  const exprValues = Object.fromEntries(entries.map(([, v], i) => [`:v${i}`, v]));

  const result = await dynamo.send(
    new UpdateCommand({
      TableName: USERS_TABLE,
      Key: { userId },
      UpdateExpression: updateExpr,
      ExpressionAttributeNames: exprNames,
      ExpressionAttributeValues: exprValues,
      ConditionExpression: "attribute_exists(userId)", // 404 if missing
      ReturnValues: "ALL_NEW",
    })
  );

  return (result.Attributes as UserRecord) ?? null;
}

/** Hard-delete a user record. */
export async function deleteUser(userId: string): Promise<void> {
  await dynamo.send(
    new DeleteCommand({
      TableName: USERS_TABLE,
      Key: { userId },
    })
  );
}

/** Admin: list all users. Avoid calling frequently — full table scan. */
export async function listUsers(limit = 50): Promise<UserRecord[]> {
  const result = await dynamo.send(
    new ScanCommand({
      TableName: USERS_TABLE,
      Limit: limit,
    })
  );
  return (result.Items as UserRecord[]) ?? [];
}
