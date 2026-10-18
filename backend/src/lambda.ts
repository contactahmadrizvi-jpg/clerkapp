import serverless from "serverless-http";
import { createApp } from "./app";

const app = createApp();
const serverlessHandler = serverless(app);

/**
 * Lambda handler — manually injects CORS headers on every response
 * including OPTIONS preflight, because Lambda Function URL CORS config
 * is unreliable without API Gateway.
 */
export const handler = async (
  event: Record<string, unknown>,
  context: Record<string, unknown>
): Promise<Record<string, unknown>> => {
  const corsHeaders = {
    "Access-Control-Allow-Origin":  "*",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Max-Age":       "86400",
  };

  // Handle preflight OPTIONS directly — no need to hit Express
  const method =
    (event.requestContext as Record<string, Record<string, string>>)
      ?.http?.method ??
    (event.httpMethod as string) ??
    "";

  if (method === "OPTIONS") {
    return { statusCode: 200, headers: corsHeaders, body: "" };
  }

  // Run through Express
  const result = (await serverlessHandler(event, context)) as Record<string, unknown>;

  // Merge CORS headers into every response
  const existingHeaders = (result.headers as Record<string, string>) ?? {};
  result.headers = { ...existingHeaders, ...corsHeaders };

  return result;
};
