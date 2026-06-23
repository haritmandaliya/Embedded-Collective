# Embedded Collective & Portfolio Monorepo

Welcome to the production-grade **Embedded Collective & Portfolio** monorepo. This codebase consolidates a modern personal portfolio with a community-driven Q&A platform for embedded systems.

---

## Repository Structure

```
/ (workspace root)
├── apps/
│   ├── backend/                        # FastAPI REST API application
│   │   ├── app/
│   │   │   ├── api/                    # Authentication, admin, & uploads endpoints
│   │   │   ├── core/                   # Security, settings, rate-limiter, and headers
│   │   │   ├── db/                     # DB session, models, and seed files
│   │   │   └── main.py                 # ASGI Main application entrypoint
│   │   └── ...
│   └── frontend/                       # React, TypeScript, and Vite Client SPA
├── infrastructure/
│   ├── vercel/                         # Vercel CDN routing manifests
│   ├── railway/                        # Railway deployment specifications
│   ├── supabase/                       # Supabase PostgreSQL DDL migration schemas
│   ├── upstash/                        # Redis cloud setup documentation
│   └── cloudflare-r2/                  # Object storage configuration instructions
├── docs/                               # System architecture, API contract, and security guides
├── docker/                             # Production-grade Dockerfiles and Nginx configurations
└── environments/                       # Environment configuration variable templates
```

---

## Technology Stack

| Component | Technology |
|---|---|
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS, Framer Motion, Three.js |
| **Backend** | FastAPI (Python 3.11), SQLAlchemy 2.0 Async, aioboto3 |
| **Database** | Supabase PostgreSQL (Production) / SQLite (Local fallback) |
| **Cache & Session**| Upstash Redis (Production) / Local Redis (Local development) |
| **Object Storage** | Cloudflare R2 (S3-compatible bucket) |
| **CDN & DNS** | Vercel (Frontend Hosting) |
| **PaaS** | Railway (Backend App Engine) |

---

## Key Features & Workflows

1. **Social Login (OAuth 2.0)**: Uses the secure Google Client ID to authorize users.
2. **OTP Verification**: Verifies email address or phone numbers with a secure 5-minute expiration period using Redis cache keys.
3. **Session Hardening**: Employs short-lived JWT Access Tokens (15 min) and rotated Refresh Tokens (7 days) with replay-attack protection.
4. **Rate Limiting**: Custom ASGI middleware tracks client requests by IP via Upstash Redis.
5. **Asset Storage**: Seamlessly uploads media, avatar crops, and resumes directly to Cloudflare R2.

---

## Quick Start (Local Development)

### 1. Prerequisites
- **Node.js** 18+ and npm
- **Python** 3.11+
- **Redis** running on port `6379` (For OTP and rate limit checking)

### 2. Installation
Clone the repository and install all dependencies:
```bash
git clone <your-repo-url> Harit_Portfolio
cd Harit_Portfolio

# Install frontend dependencies
cd apps/frontend && npm install && cd ../..

# Setup Python backend virtual environment
cd apps/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cd ../..
```

### 3. Environment Variables
Copy templates and fill in secret keys:
- Backend: `cp environments/development/backend.env.example apps/backend/.env`
- Frontend: `cp environments/development/frontend.env.example apps/frontend/.env.local`

### 4. Running Locally
Run the start command:
```bash
chmod +x run.sh
./run.sh start
```
Services will expose on:
- Portfolio Client: `http://localhost:5173/`
- Community Client: `http://localhost:5173/community`
- API Docs: `http://localhost:8000/docs`

---

## Deployment & Verification

For production deployment instructions on Vercel, Railway, Supabase, and Cloudflare R2, consult the [Production Deployment Guide](./docs/deployment/deployment_guide.md).

Verify services status with:
```bash
curl -f https://your-backend-domain.railway.app/health
```

---

## Legal & Security Compliance
- **License**: MIT License - see the [LICENSE](./LICENSE) file.
- **Terms**: Platform conduct and usage guidelines are outlined in [TERMS_AND_CONDITIONS.md](./TERMS_AND_CONDITIONS.md).

Copyright © 2026 Harit Mandaliya. All rights reserved.
