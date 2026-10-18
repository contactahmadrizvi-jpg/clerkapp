import dotenv from "dotenv";
dotenv.config();

function getRequired(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required environment variable: ${key}`);
  return val;
}

function getOptional(key: string, fallback = ""): string {
  return process.env[key] ?? fallback;
}

export const env = {
  NODE_ENV:   getOptional("NODE_ENV", "development"),
  PORT:       getOptional("PORT", "4000"),

  // Clerk
  CLERK_SECRET_KEY:      getRequired("CLERK_SECRET_KEY"),
  CLERK_PUBLISHABLE_KEY: getOptional("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"),

  // AWS
  AWS_REGION:     getOptional("AWS_REGION", "eu-north-1"),
  DYNAMODB_TABLE: getOptional("DYNAMODB_TABLE", "clerk-auth-users"),

  // CORS
  FRONTEND_URL: getOptional("FRONTEND_URL", "http://localhost:3000"),

  // Shopify Direct
  SHOPIFY_STORE_DOMAIN:        getOptional("SHOPIFY_STORE_DOMAIN"),
  SHOPIFY_ADMIN_ACCESS_TOKEN:  getOptional("SHOPIFY_ADMIN_ACCESS_TOKEN"),
  // Shopify OAuth (for multi-store, needs deployed backend)
  SHOPIFY_API_KEY:             getOptional("SHOPIFY_API_KEY"),
  SHOPIFY_API_SECRET:          getOptional("SHOPIFY_API_SECRET"),
  SHOPIFY_REDIRECT_URI:        getOptional("SHOPIFY_REDIRECT_URI", "http://localhost:4000/api/shopify/callback"),
  SHOPIFY_TOKENS_TABLE:        getOptional("SHOPIFY_TOKENS_TABLE", "shopify-tokens"),
};
