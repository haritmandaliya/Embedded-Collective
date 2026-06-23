# Security Architecture & Hardening Guide

This document describes the security controls, protocols, and defensive mechanisms implemented in the platform.

---

## 1. Authentication & Session Management
- **Short-Lived Access Tokens**: JWT access tokens are signed using `HMAC-SHA256` (HS256) and expire in 15 minutes.
- **HTTP-Only Refresh Tokens**: Refresh tokens are issued with a 7-day expiration time.
- **Token Rotation (RTR)**: Every time a refresh token is exchanged, a new pair (access + refresh) is generated. The old refresh token is invalidated.
- **Session Revocation (Replay Attack Prevention)**: Refresh tokens are tracked in Redis under the key `refresh_token:{user_id}`. If a previously rotated refresh token is presented again (indicating token theft), Redis immediately revokes all active sessions for that user ID, forcing re-authentication.

---

## 2. OTP Verification Hardening
- **Short Expiration (TTL)**: OTP codes sent to email or phone expire strictly in 5 minutes (300 seconds), stored in Redis.
- **Single-Use Enforcement**: Verification of the OTP code immediately deletes the key from Redis, preventing replay attempts.
- **Registration OTP Sync**: Registering an account verifies if the email OTP verification check has occurred (stored in Redis under `otp_verified:{email}` for 30 minutes) before allowing database persistence.

---

## 3. Distributed Rate Limiting
- **Client IP Tracking**: Middleware tracks incoming request rates per remote client IP address.
- **Token Bucket Storage**: Uses Upstash Redis to record limits atomically across multiple load-balanced container instances.
- **Dynamic Limits**: Default threshold is set to 120 requests per minute. Limits are bypassed for core health, landing page paths, and documentation routers.
- **Fallback Resilience**: If Upstash Redis is unreachable, the system automatically falls back to local in-memory dict rate-limiting to ensure backend availability.

---

## 4. HTTP Security Headers
The platform sets robust HTTP response headers in both Nginx configuration and FastAPI ASGI middleware:
- **Strict-Transport-Security (HSTS)**: Forces HTTPS connections for 1 year including subdomains: `max-age=31536000; includeSubDomains; preload`.
- **Content-Security-Policy (CSP)**: Strict restriction of source domains. Allows resource loading from `self`, Google Fonts, Google OAuth, and Cloudflare R2 domains. Banned inline object plugins.
- **X-Frame-Options**: Set to `DENY` to mitigate Clickjacking attacks.
- **X-Content-Type-Options**: Set to `nosniff` to avoid browser MIME type sniffing.
- **Referrer-Policy**: Restricts transmission of referrer data: `strict-origin-when-cross-origin`.

---

## 5. Input Validation & RBAC
- **Strict Input Validation**: Pydantic models automatically sanitize and validate incoming request payloads.
- **Role-Based Access Control (RBAC)**: Enforced using FastAPI dependency injections. Roles are categorized as:
  - `solution_seeker` (Standard client)
  - `contributor` (Developer / expert contributor, allowed resume uploads)
  - `admin` (System administrator, moderates content/tags)
  - `super_admin` (Unique role for `haritmandaliya@gmail.com`, manages other admins, cannot be self-deleted or demoted).
