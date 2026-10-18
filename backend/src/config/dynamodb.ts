import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { env } from "./env";

const rawClient = new DynamoDBClient({
  // In Lambda, AWS_REGION is reserved and set automatically by the runtime.
  // For local dev we read it from .env via AWS_REGION_NAME.
  region: process.env.AWS_REGION ?? env.AWS_REGION,
});

export const dynamo = DynamoDBDocumentClient.from(rawClient, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertClassInstanceToMap: true,
  },
});

export const USERS_TABLE = env.DYNAMODB_TABLE;
