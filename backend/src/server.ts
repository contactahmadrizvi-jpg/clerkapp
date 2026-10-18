/**
 * Local development entry point.
 * In production the app is served via Lambda (src/lambda.ts).
 */
import { createApp } from "./app";
import { env } from "./config/env";

const app = createApp();
const PORT = Number(env.PORT);

app.listen(PORT, () => {
  console.log(`\n🚀  API server running at http://localhost:${PORT}`);
  console.log(`   Environment : ${env.NODE_ENV}`);
  console.log(`   DynamoDB    : ${env.DYNAMODB_TABLE} (${env.AWS_REGION})\n`);
});
