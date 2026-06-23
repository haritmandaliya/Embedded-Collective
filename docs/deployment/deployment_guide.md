# Production Deployment Guide

This document provides step-by-step instructions to configure, deploy, and verify the platform components in production.

---

## Prerequisites
- A GitHub repository hosting the restructured Monorepo.
- Accounts on:
  - **Vercel** (Frontend hosting)
  - **Railway** (Backend server)
  - **Supabase** (Postgres DB)
  - **Upstash** (Redis caching)
  - **Cloudflare** (R2 Object storage)

---

## Step 1: Database Setup (Supabase)
1. Create a new project in Supabase.
2. Go to **Settings > Database** and copy the **Connection String (URI)**. Ensure you select the transaction pooler mode (port `5432` or pooler connection strings).
3. Append `?sslmode=require` if it's not already in the connection string.
4. Replace the protocol from `postgresql://` to `postgresql+asyncpg://` in your deployment environment variables config.

---

## Step 2: Caching Setup (Upstash Redis)
1. Create a serverless Redis database in Upstash (ideally in the same cloud provider region as Railway backend).
2. Copy the secure Redis URL (`rediss://...`).

---

## Step 3: Object Storage Setup (Cloudflare R2)
1. Log into Cloudflare dashboard and create a bucket named `embedded-collective-assets`.
2. Generate an API token:
   - Go to **R2 > Manage R2 API Tokens**.
   - Create a token with **Edit** (Read/Write) permissions.
   - Save the **Access Key ID** and **Secret Access Key**.
3. Copy your Cloudflare **Account ID** from the R2 landing page.

---

## Step 4: Backend Deployment (Railway)
1. Connect your GitHub repository to Railway and add a new service from the monorepo root.
2. In Railway Service Settings, configure the **Root Directory** to `apps/backend` (or use the root `railway.toml`).
3. Set the environment variables in the variables tab matching those in `environments/production/backend.env.example`.
4. Run the first deploy. The service will compile and run the Nixpacks builder automatically.

---

## Step 5: Frontend Deployment (Vercel)
1. Import the repository in Vercel.
2. Select `apps/frontend` as the **Root Directory**.
3. Set the build settings:
   - Framework preset: `Vite`
   - Build command: `npm run build`
   - Output directory: `dist`
4. Add the environment variables:
   - `VITE_API_URL` (Your Railway backend service URL).
   - `VITE_GOOGLE_CLIENT_ID` (Your production Google Client ID).
5. Deploy.

---

## Step 6: Database Migrations
1. Once the Railway backend environment variables are active, execute the Alembic database migrations:
   ```bash
   cd apps/backend
   alembic upgrade head
   ```
   *(Alternatively, the app runner lifecycles will seed the DB schema during startup.)*

---

## Step 7: Verifying Deployment Health
Query the health check endpoint using `curl`:
```bash
curl -f https://your-backend-domain.railway.app/health
```
A successful response should return:
```json
{
  "status": "healthy",
  "database": "healthy",
  "redis": "healthy",
  "environment": "production"
}
```
If either database or Redis is listed as `unhealthy`, consult the Railway service log streams.
