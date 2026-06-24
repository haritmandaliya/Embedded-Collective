# ==========================================
# STAGE 1: Builder (Builds dependencies)
# ==========================================
FROM python:3.11-slim AS builder

WORKDIR /build

# Install system compilation dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies to virtualenv
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# ==========================================
# STAGE 2: Runner (Production runtime image)
# ==========================================
FROM python:3.11-slim AS runner

WORKDIR /app

# Install runtime dependencies (e.g. libpq for pg compatibility) and curl for healthchecks
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy installed libraries from the builder stage
COPY --from=builder /root/.local /root/.local
COPY . .

# Add python user-installed binaries to PATH
ENV PATH=/root/.local/bin:$PATH
ENV PYTHONUNBUFFERED=1

# Expose server port
EXPOSE 8000

# Set healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:${PORT:-8000}/health || exit 1

# Start the application using uvicorn
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
