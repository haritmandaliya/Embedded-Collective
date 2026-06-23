from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        # 1. Content Security Policy (CSP)
        # Safe defaults allowing self, Google Fonts, OAuth origins, and R2 storage
        csp_directives = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "font-src 'self' https://fonts.gstatic.com; "
            "img-src 'self' data: https://*.r2.cloudflarestorage.com https://lh3.googleusercontent.com; "
            "connect-src 'self' https://accounts.google.com https://*.r2.cloudflarestorage.com; "
            "frame-src 'self' https://accounts.google.com; "
            "object-src 'none';"
        )
        response.headers["Content-Security-Policy"] = csp_directives

        # 2. Strict-Transport-Security (HSTS) - force SSL for 1 year including subdomains
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"

        # 3. X-Frame-Options - prevent clickjacking
        response.headers["X-Frame-Options"] = "DENY"

        # 4. X-Content-Type-Options - prevent MIME sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"

        # 5. Referrer-Policy - control referrer information
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # 6. Permissions-Policy - restrict browser features
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"

        return response
