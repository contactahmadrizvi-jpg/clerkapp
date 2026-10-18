import { GetCommand, PutCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { dynamo } from "../config/dynamodb";
import { env } from "../config/env";

const TABLE = env.SHOPIFY_TOKENS_TABLE;

export interface ShopifyTokenRecord {
  /** Clerk userId — partition key */
  userId: string;
  shop: string;          // e.g. my-store.myshopify.com
  accessToken: string;
  scope: string;
  installedAt: string;   // ISO 8601
}

/** Save (or replace) an access token for a user+shop pair. */
export async function saveShopifyToken(
  data: Omit<ShopifyTokenRecord, "installedAt">
): Promise<ShopifyTokenRecord> {
  const record: ShopifyTokenRecord = {
    ...data,
    installedAt: new Date().toISOString(),
  };
  await dynamo.send(new PutCommand({ TableName: TABLE, Item: record }));
  return record;
}

/** Retrieve the token for a user. */
export async function getShopifyToken(
  userId: string
): Promise<ShopifyTokenRecord | null> {
  const result = await dynamo.send(
    new GetCommand({ TableName: TABLE, Key: { userId } })
  );
  return (result.Item as ShopifyTokenRecord) ?? null;
}

/** Remove a stored token (disconnect Shopify). */
export async function deleteShopifyToken(userId: string): Promise<void> {
  await dynamo.send(
    new DeleteCommand({ TableName: TABLE, Key: { userId } })
  );
}
