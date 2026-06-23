from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional
from pydantic import model_validator

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True, extra="ignore")

    PROJECT_NAME: str = "Embedded Collective API"
    API_V1_STR: str = "/api/v1"
    
    # Database settings — environment variable required in production, relative fallback in dev
    DATABASE_URL: Optional[str] = None
    
    # Redis settings — environment variable required in production, relative fallback in dev
    REDIS_URL: Optional[str] = None
    
    # Security
    SECRET_KEY: str = "supersecretkeychangeinproduction1234567890"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 1 week
    
    ENVIRONMENT: str = "development"

    # Google OAuth
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None

    # Email OTP (SMTP)
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_FROM: Optional[str] = None

    # SMS OTP (Twilio)
    TWILIO_ACCOUNT_SID: Optional[str] = None
    TWILIO_AUTH_TOKEN: Optional[str] = None
    TWILIO_PHONE_NUMBER: Optional[str] = None
    
    # Cloudflare R2 / S3 Storage
    R2_BUCKET_NAME: Optional[str] = None
    R2_ACCOUNT_ID: Optional[str] = None
    R2_ACCESS_KEY_ID: Optional[str] = None
    R2_SECRET_ACCESS_KEY: Optional[str] = None

    # Admin contact email
    ADMIN_EMAIL: Optional[str] = None

    @model_validator(mode="after")
    def validate_production_env(self) -> "Settings":
        if self.ENVIRONMENT == "production":
            if not self.DATABASE_URL:
                raise ValueError("DATABASE_URL environment variable is required in production environment.")
            if not self.REDIS_URL:
                raise ValueError("REDIS_URL environment variable is required in production environment.")
            if not self.SECRET_KEY or self.SECRET_KEY == "supersecretkeychangeinproduction1234567890":
                raise ValueError("SECRET_KEY must be a secure random value in production.")
        else:
            # Safe defaults for local development
            if not self.DATABASE_URL:
                self.DATABASE_URL = "sqlite+aiosqlite:///collective.db"
            if not self.REDIS_URL:
                self.REDIS_URL = "redis://localhost:6379/0"
        return self

settings = Settings()
