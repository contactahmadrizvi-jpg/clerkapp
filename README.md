# Clerk Auth App

Beautiful white-theme authentication with **Google OAuth + Email**, built with Next.js, Express.js, deployed to **AWS Amplify** (frontend) + **AWS Lambda** (backend) + **DynamoDB** (database).

---

## Project structure

```
clerk-auth-app/
├── frontend/              # Next.js 14 app (deployed to Amplify Hosting)
│   └── src/
│       ├── app/
│       │   ├── page.tsx            # Landing page
│       │   ├── sign-in/            # Clerk-hosted sign-in
│       │   ├── sign-up/            # Clerk-hosted sign-up
│       │   └── dashboard/          # Protected dashboard
│       ├── hooks/
│       │   └── useSyncUser.ts      # Syncs Clerk user → DynamoDB
│       └── middleware.ts           # Protects /dashboard routes
│
├── backend/               # Express.js API (deployed as Lambda)
│   └── src/
│       ├── app.ts                  # Express app factory
│       ├── server.ts               # Local dev entry point
│       ├── lambda.ts               # Lambda handler (serverless-http)
│       ├── config/                 # env + DynamoDB client
│       ├── db/users.ts             # DynamoDB CRUD operations
│       ├── middleware/             # requireAuth + errorHandler
│       └── routes/                 # /api/users, /api/health
│
├── infrastructure/
│   ├── template.yaml       # AWS SAM template (Lambda + API GW + DynamoDB)
│   └── dynamodb-table.json # Standalone table definition
│
└── amplify.yml             # Amplify Hosting build spec
```

---

## Quick start (local dev)

### 1. Clone and install

```bash
git clone <your-repo>

# Frontend
cd frontend
cp .env.local.example .env.local   # fill in Clerk keys
npm install

# Backend
cd ../backend
cp .env.example .env               # fill in Clerk + AWS keys
npm install
```

### 2. Create a Clerk application

1. Go to [dashboard.clerk.com](https://dashboard.clerk.com) → **Create application**
2. Enable **Email** and **Google** sign-in methods
3. Copy **Publishable Key** → `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
4. Copy **Secret Key** → `CLERK_SECRET_KEY`
5. Under **JWT Templates**, copy the default template name (used for token verification)

### 3. Create the DynamoDB table (local dev with AWS CLI)

```bash
aws dynamodb create-table \
  --cli-input-json file://infrastructure/dynamodb-table.json \
  --region us-east-1
```

### 4. Run locally

```bash
# Terminal 1 — backend
cd backend && npm run dev     # http://localhost:4000

# Terminal 2 — frontend
cd frontend && npm run dev    # http://localhost:3000
```

---

## Deploy to AWS

### Backend — AWS SAM

```bash
# Build
cd backend && npm run build

# Deploy (first time — guided)
cd ../infrastructure
sam build
sam deploy --guided \
  --parameter-overrides \
    ClerkSecretKey=sk_live_XXXX \
    FrontendUrl=https://main.XXXX.amplifyapp.com

# Copy the ApiEndpoint output URL
```

### Frontend — AWS Amplify Hosting

1. Push your repo to GitHub / CodeCommit
2. Go to **AWS Amplify Console** → **New app** → **Host web app**
3. Connect your repository and select the branch
4. Amplify auto-detects `amplify.yml` — no extra build config needed
5. Add environment variables in **App settings → Environment variables**:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_live_...` |
| `CLERK_SECRET_KEY` | `sk_live_...` |
| `NEXT_PUBLIC_API_URL` | SAM deploy ApiEndpoint output |

6. Deploy — Amplify builds and hosts your Next.js app with SSR

---

## API routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | — | Health check |
| POST | `/api/users/sync` | ✅ | Create/update user in DynamoDB |
| GET | `/api/users/me` | ✅ | Get current user |
| PATCH | `/api/users/me` | ✅ | Update current user |
| DELETE | `/api/users/me` | ✅ | Delete current user |
| GET | `/api/users` | ✅ | List all users (admin) |

All protected routes require `Authorization: Bearer <clerk-session-token>`.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Auth | Clerk (Google OAuth + Email) |
| Backend | Express.js, TypeScript |
| Database | AWS DynamoDB (on-demand) |
| Compute | AWS Lambda via `serverless-http` |
| API | AWS API Gateway HTTP API |
| Hosting | AWS Amplify Hosting (SSR) |
| IaC | AWS SAM |
