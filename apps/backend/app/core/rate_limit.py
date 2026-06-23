import time
import logging
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from app.core.config import settings

logger = logging.getLogger(__name__)

# Fallback in-memory cache if Redis is unavailable
_local_rate_limit_db = {}

class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, limit: int = 120, window: int = 60):
        """
        limit: Max requests allowed in the time window
        window: Time window in seconds (default 1 minute)
        """
        super().__init__(app)
        self.limit = limit
        self.window = window
        self.redis_client = None
        self._init_redis()

    def _init_redis(self):
        try:
            import redis.asyncio as aioredis
            if settings.REDIS_URL:
                self.redis_client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
                logger.info("Rate limiter connected to Async Redis.")
        except Exception as e:
            logger.warning(f"Failed to initialize Redis for Rate Limiting: {e}. Falling back to in-memory store.")

    async def dispatch(self, request: Request, call_next):
        # Exclude documentation and health check endpoints
        path = request.url.path
        if path.startswith("/docs") or path.startswith("/redoc") or path.startswith("/openapi.json") or path == "/health" or path == "/":
            return await call_next(request)

        client_ip = request.client.host if request.client else "unknown_ip"
        current_time = int(time.time())
        key = f"rate_limit:{client_ip}:{current_time // self.window}"

        is_blocked = False
        request_count = 0

        if self.redis_client:
            try:
                # Use an async pipeline to ensure atomic updates and TTL setting
                async with self.redis_client.pipeline(transaction=True) as pipe:
                    pipe.incr(key)
                    pipe.expire(key, self.window * 2)
                    results = await pipe.execute()
                request_count = results[0]
                if request_count > self.limit:
                    is_blocked = True
            except Exception as e:
                logger.error(f"Redis rate limiting error: {e}. Bypassing Redis check.")
                is_blocked, request_count = self._fallback_check(key)
        else:
            is_blocked, request_count = self._fallback_check(key)

        if is_blocked:
            return JSONResponse(
                status_code=429,
                content={"detail": "Too many requests. Please try again later."},
                headers={"Retry-After": str(self.window)}
            )

        response: Response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(self.limit)
        response.headers["X-RateLimit-Remaining"] = str(max(0, self.limit - request_count))
        return response

    def _fallback_check(self, key: str) -> tuple[bool, int]:
        current_time = time.time()
        # Clean old items from local memory db
        for k in list(_local_rate_limit_db.keys()):
            if current_time - _local_rate_limit_db[k]["timestamp"] > self.window * 2:
                _local_rate_limit_db.pop(k, None)

               
        if key not in _local_rate_limit_db:
            _local_rate_limit_db[key] = {"count": 1, "timestamp": current_time}
            return False, 1

        _local_rate_limit_db[key]["count"] += 1
        count = _local_rate_limit_db[key]["count"]
        return count > self.limit, count
