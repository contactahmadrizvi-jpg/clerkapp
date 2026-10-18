# Deployment Guide — AWS Lambda + Amplify

## Overview

```
Frontend  → AWS Amplify Hosting  (Next.js SSR)
Backend   → AWS Lambda + API Gateway (Express via serverless-http)
Database  → AWS DynamoDB (eu-north-1)
```

---

## PART 1 — Deploy Backend to AWS Lambda (SAM)

### Step 1 — Open a NEW terminal and verify SAM installed
```bash
sam --version
# Should show: SAM CLI, version 1.x.x
```

### Step 2 — Build the backend
```bash
cd "C:\Users\Ahmad\Downloads\Compressed\mern auth\clerk-auth-app\backend"
npm run build
```

### Step 3 — Deploy with SAM (first time — guided)
```bash
cd "C:\Users\Ahmad\Downloads\Compressed\mern auth\clerk-auth-app\infrastructure"
sam build
sam deploy --guided
```

SAM will ask you questions — answer like this:

| Question | Answer |
|---|---|
| Stack Name | `clerk-auth-app` |
| AWS Region | `eu-north-1` |
| Parameter Environment | `production` |
| Parameter ClerkSecretKey | `sk_live_YOUR_CLERK_SECRET_KEY` |
| Parameter FrontendUrl | `https://main.XXXX.amplifyapp.com` (fill after Amplify deploy) |
| Parameter ShopifyApiKey | `YOUR_SHOPIFY_CLIENT_ID` |
| Parameter ShopifyApiSecret | `YOUR_SHOPIFY_CLIENT_SECRET` |
| Parameter ShopifyRedirectUri | `https://XXXX.execute-api.eu-north-1.amazonaws.com/production/api/shopify/callback` |
| Confirm changes before deploy | `y` |
| Allow SAM CLI IAM role creation | `Y` |
| Save arguments to samconfig.toml | `Y` |

### Step 4 — Copy outputs
After deploy succeeds, SAM prints:

```
Outputs:
  ApiEndpoint       = https://XXXX.execute-api.eu-north-1.amazonaws.com/production
  ShopifyCallbackUrl = https://XXXX.execute-api.eu-north-1.amazonaws.com/production/api/shopify/callback
```

**Save both URLs — you need them in the next steps.**

---

## PART 2 — Update Shopify Partners with real URL

1. Go to partners.shopify.com → MyApp Auth → App setup
2. Set:
   - **App URL** → `https://XXXX.execute-api.eu-north-1.amazonaws.com/production`
   - **Allowed redirection URLs** → `https://XXXX.execute-api.eu-north-1.amazonaws.com/production/api/shopify/callback`
3. **Scopes** → `read_products,read_inventory,read_orders`
4. Save

---

## PART 3 — Deploy Frontend to AWS Amplify

### Step 1 — Push code to GitHub
```bash
cd "C:\Users\Ahmad\Downloads\Compressed\mern auth\clerk-auth-app"
git init
git add .
git commit -m "Initial commit"
# Create a repo on github.com then:
git remote add origin https://github.com/YOUR_USERNAME/clerk-auth-app.git
git push -u origin main
```

### Step 2 — Connect to Amplify
1. Go to https://console.aws.amazon.com/amplify
2. Click **New app** → **Host web app**
3. Choose **GitHub** → authorize → select your repo → select `main` branch
4. Amplify detects `amplify.yml` automatically
5. Click **Next**

### Step 3 — Add Environment Variables in Amplify Console
Go to **App settings → Environment variables** and add:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_test_YOUR_PUBLISHABLE_KEY` |
| `CLERK_SECRET_KEY` | `sk_test_YOUR_SECRET_KEY` |
| `NEXT_PUBLIC_API_URL` | `https://XXXX.execute-api.eu-north-1.amazonaws.com/production` |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/sign-up` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | `/dashboard` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | `/dashboard` |

### Step 4 — Deploy
Click **Save and deploy**. Amplify builds and gives you a URL like:
```
https://main.XXXX.amplifyapp.com
```

### Step 5 — Re-deploy backend with Amplify URL
Now that you have the Amplify URL, update the SAM deploy:
```bash
cd infrastructure
sam deploy --parameter-overrides "FrontendUrl=https://main.XXXX.amplifyapp.com"
```

---

## PART 4 — Final checklist

- [ ] Backend deployed → ApiEndpoint URL copied
- [ ] Shopify Partners → App URL and redirect URL updated
- [ ] Amplify env vars set with real API URL
- [ ] Frontend deployed → Amplify URL copied
- [ ] Backend re-deployed with Amplify frontend URL
- [ ] Clerk dashboard → update allowed origins with Amplify URL

---

## Future re-deploys (after code changes)

```bash
# Backend
cd backend && npm run build
cd ../infrastructure && sam build && sam deploy

# Frontend — automatic on git push to main
git add . && git commit -m "update" && git push
```
