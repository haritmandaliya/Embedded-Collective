import random
import sys
import re
import logging
import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func

from app.core.security import verify_password, get_password_hash, create_access_token, create_refresh_token, verify_token
from app.core.config import settings
from app.db.session import get_db
from app.core.redis import redis_client
from app.api.deps import get_current_user
from app.models.all_models import User
from app.schemas.all_schemas import UserCreate, UserOut, Token, OTPRequest, OTPVerify, RegisterSchema, RegisterResponse
from pydantic import BaseModel
from app.services.notifications import send_email_otp, send_sms_otp
from app.services.email_validation import validate_email_address

router = APIRouter()
logger = logging.getLogger(__name__)

VALID_ROLES = {"solution_seeker", "contributor"}
OTP_TTL = 300
VERIFIED_TTL = 1800
PHONE_RE = re.compile(r"^\+[1-9]\d{7,14}$")


def normalize_phone(phone: str) -> str:
    digits = re.sub(r"\D", "", phone or "")
    if len(digits) == 10:
        return f"+91{digits}"
    if phone and phone.startswith("+") and PHONE_RE.match(phone):
        return phone
    if len(digits) > 10 and not phone.startswith("+"):
        return f"+{digits}"
    return phone


async def verify_google_token(token: str) -> dict | None:
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"https://oauth2.googleapis.com/tokeninfo?id_token={token}",
                timeout=5.0,
            )
            if resp.status_code != 200:
                return None

            data = resp.json()
            if settings.GOOGLE_CLIENT_ID and data.get("aud") != settings.GOOGLE_CLIENT_ID:
                logger.warning("Google token aud mismatch")
                return None

            if data.get("email_verified") not in ("true", True):
                logger.warning("Google account email not verified")
                return None

            email = data.get("email")
            if not email:
                return None

            return {
                "email": email,
                "name": data.get("name") or email.split("@")[0],
                "picture": data.get("picture"),
                "sub": data.get("sub"),
            }
    except Exception as e:
        logger.error(f"Google OAuth verification failed: {e}")
        return None


async def mark_otp_verified(target: str) -> None:
    await redis_client.setex(f"otp_verified:{target}", VERIFIED_TTL, "1")


async def is_otp_verified(target: str) -> bool:
    return bool(await redis_client.get(f"otp_verified:{target}"))


@router.get("/config")
async def auth_config():
    smtp_ready = bool(settings.SMTP_HOST and settings.SMTP_FROM)
    return {
        "google_client_id": settings.GOOGLE_CLIENT_ID or "",
        "google_enabled": bool(settings.GOOGLE_CLIENT_ID),
        "email_otp_enabled": smtp_ready or settings.ENVIRONMENT != "production",
        "sms_otp_enabled": bool(
            settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN and settings.TWILIO_PHONE_NUMBER
        ) or settings.ENVIRONMENT != "production",
        "environment": settings.ENVIRONMENT,
    }


@router.post("/validate-email")
async def validate_email(body: dict):
    email = (body.get("email") or "").strip()
    check_mx = settings.ENVIRONMENT == "production" or body.get("strict", True)
    valid, message = validate_email_address(email, check_deliverability=check_mx)
    if not valid:
        raise HTTPException(status_code=400, detail=message)
    return {"valid": True, "email": email.lower()}


@router.get("/check-username/{username}")
async def check_username(username: str, db: AsyncSession = Depends(get_db)):
    clean = username.strip().lstrip("@").lower()
    count = await db.scalar(select(func.count(User.id)).where(User.username == clean))
    return {"available": count == 0}


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
async def register(data: RegisterSchema, db: AsyncSession = Depends(get_db)):
    username = data.username.strip().lstrip("@").lower()
    role = data.role if data.role in VALID_ROLES else "solution_seeker"
    phone = normalize_phone(data.phone) if data.phone else None

    if role == "contributor" and not data.education:
        raise HTTPException(status_code=400, detail="Education is required for Contributors")

    if phone and not PHONE_RE.match(phone):
        raise HTTPException(status_code=400, detail="Invalid phone number format")

    valid, message = validate_email_address(data.email, check_deliverability=False)
    if not valid:
        raise HTTPException(status_code=400, detail=message)

    google_verified = False
    if data.google_id:
        google_user = await verify_google_token(data.google_id)
        if not google_user:
            raise HTTPException(status_code=400, detail="Invalid or unverified Google account")
        if google_user["email"].lower() != data.email.lower():
            raise HTTPException(status_code=400, detail="Google email does not match registration email")
        google_verified = True
    else:
        if not await is_otp_verified(data.email):
            raise HTTPException(status_code=400, detail="Email not verified. Complete OTP verification first.")

    email_exists = await db.scalar(select(func.count(User.id)).where(User.email == data.email))
    if email_exists:
        raise HTTPException(status_code=400, detail="Email already registered")

    if phone:
        phone_exists = await db.scalar(select(func.count(User.id)).where(User.phone == phone))
        if phone_exists:
            raise HTTPException(status_code=400, detail="Phone already registered")

    username_exists = await db.scalar(select(func.count(User.id)).where(User.username == username))
    if username_exists:
        raise HTTPException(status_code=400, detail="Username already taken")

    new_user = User(
        email=data.email,
        phone=phone,
        username=username,
        display_name=data.display_name.strip(),
        role=role,
        education=data.education,
        higher_edu=data.higher_edu,
        bio=data.bio,
        profile_pic_url=data.google_avatar if google_verified else None,
        is_verified=True,
        onboarding_done=True,
        hashed_password=get_password_hash(data.password) if data.password else None,
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    await redis_client.delete(f"otp_verified:{data.email}")
    if phone:
        await redis_client.delete(f"otp_verified:{phone}")

    access_token = create_access_token(subject=new_user.id)
    refresh_token = create_refresh_token(subject=new_user.id)
    await redis_client.setex(f"refresh_token:{new_user.id}", 7 * 24 * 3600, refresh_token)
    return RegisterResponse(user=new_user, access_token=access_token, refresh_token=refresh_token)


@router.post("/register/legacy", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def register_legacy(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(User).where((User.email == user_in.email) | (User.username == user_in.username))
    )
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Username or Email already registered")

    new_user = User(
        email=user_in.email,
        username=user_in.username,
        phone=user_in.phone,
        display_name=user_in.username,
        hashed_password=get_password_hash(user_in.password),
        role=user_in.role if user_in.role in VALID_ROLES else "solution_seeker",
        onboarding_done=True,
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return new_user


@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User).where(
            (User.username == form_data.username) | (User.email == form_data.username)
        )
    )
    user = result.scalar_one_or_none()
    if not user or not user.hashed_password or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")

    access_token = create_access_token(subject=user.id)
    refresh_token = create_refresh_token(subject=user.id)
    await redis_client.setex(f"refresh_token:{user.id}", 7 * 24 * 3600, refresh_token)
    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}


@router.post("/google", response_model=Token)
async def google_auth(token_data: dict, db: AsyncSession = Depends(get_db)):
    id_token = token_data.get("id_token")
    mode = token_data.get("mode", "signin")
    if not id_token:
        raise HTTPException(status_code=400, detail="Missing id_token")

    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=503, detail="Google sign-in is not configured on the server")

    google_user = await verify_google_token(id_token)
    if not google_user:
        raise HTTPException(status_code=400, detail="Invalid or unverified Google account")

    email = google_user["email"]
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if mode == "signup":
        if user:
            raise HTTPException(status_code=400, detail="Account already exists. Please sign in instead.")
        return JSONResponse(
            status_code=200,
            content={
                "needs_registration": True,
                "profile": {
                    "email": email,
                    "name": google_user["name"],
                    "picture": google_user.get("picture"),
                },
            },
        )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="No account found for this Google email. Please sign up first.",
        )

    access_token = create_access_token(subject=user.id)
    refresh_token = create_refresh_token(subject=user.id)
    await redis_client.setex(f"refresh_token:{user.id}", 7 * 24 * 3600, refresh_token)
    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}


@router.post("/otp/send")
async def send_otp(otp_in: OTPRequest, db: AsyncSession = Depends(get_db)):
    if otp_in.email and otp_in.phone:
        raise HTTPException(status_code=400, detail="Send OTP to email or phone, not both at once")

    target = otp_in.email or (normalize_phone(otp_in.phone) if otp_in.phone else None)
    if not target:
        raise HTTPException(status_code=400, detail="Valid email or phone is required")

    if otp_in.phone and not PHONE_RE.match(target):
        raise HTTPException(status_code=400, detail="Invalid phone number. Use +91XXXXXXXXXX format.")

    if otp_in.email:
        valid, message = validate_email_address(
            str(otp_in.email),
            check_deliverability=settings.ENVIRONMENT == "production",
        )
        if not valid:
            raise HTTPException(status_code=400, detail=message)

    # Check database for existing account based on mode
    if otp_in.mode in ("signin", "signup"):
        if otp_in.email:
            result = await db.execute(select(User).where(User.email == str(otp_in.email)))
        else:
            result = await db.execute(select(User).where(User.phone == target))
        user = result.scalar_one_or_none()

        if otp_in.mode == "signup" and user:
            raise HTTPException(
                status_code=400,
                detail="Account already exists. Please sign in instead.",
            )
        if otp_in.mode == "signin" and not user:
            raise HTTPException(
                status_code=404,
                detail="No account found. Please sign up to create a profile first.",
            )

    code = f"{random.randint(100000, 999999)}"
    redis_key = f"otp:{target}"
    await redis_client.setex(redis_key, OTP_TTL, code)

    try:
        if otp_in.email:
            await send_email_otp(str(otp_in.email), code)
        else:
            await send_sms_otp(target, code)
    except RuntimeError as exc:
        await redis_client.delete(redis_key)
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    logger.info("Generated OTP for %s", target)

    if settings.ENVIRONMENT != "production":
        sys.stdout.write(
            f"\n\x1b[43m\x1b[30m  OTP DEV LOG  \x1b[0m\x1b[33m  {target} → \x1b[1m{code}\x1b[0m\n\n"
        )
        sys.stdout.flush()

    return {"message": "Verification code sent", "sent_to": target}


@router.post("/otp/verify")
async def verify_otp_only(verify_in: OTPVerify):
    target = verify_in.email or (normalize_phone(verify_in.phone) if verify_in.phone else None)
    if not target:
        raise HTTPException(status_code=400, detail="Email or Phone is required")

    redis_key = f"otp:{target}"
    cached_code = await redis_client.get(redis_key)

    if not cached_code or cached_code != verify_in.code:
        if settings.ENVIRONMENT != "production" and verify_in.code == "999999":
            pass
        else:
            raise HTTPException(status_code=400, detail="Invalid or expired OTP code")

    await redis_client.delete(redis_key)
    await mark_otp_verified(target)
    return {"verified": True}


@router.post("/otp/verify-login", response_model=Token)
async def verify_otp_login(verify_in: OTPVerify, db: AsyncSession = Depends(get_db)):
    target = verify_in.email or (normalize_phone(verify_in.phone) if verify_in.phone else None)
    if not target:
        raise HTTPException(status_code=400, detail="Email or Phone is required")

    redis_key = f"otp:{target}"
    cached_code = await redis_client.get(redis_key)

    if not cached_code or cached_code != verify_in.code:
        if settings.ENVIRONMENT != "production" and verify_in.code == "999999":
            pass
        else:
            raise HTTPException(status_code=400, detail="Invalid or expired OTP code")

    await redis_client.delete(redis_key)

    if verify_in.email:
        result = await db.execute(select(User).where(User.email == verify_in.email))
    else:
        result = await db.execute(select(User).where(User.phone == target))

    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="No account found. Please sign up to create a profile first.",
        )

    access_token = create_access_token(subject=user.id)
    refresh_token = create_refresh_token(subject=user.id)
    await redis_client.setex(f"refresh_token:{user.id}", 7 * 24 * 3600, refresh_token)
    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}


class RefreshTokenRequest(BaseModel):
    refresh_token: str

@router.post("/refresh", response_model=Token)
async def refresh_token_endpoint(body: RefreshTokenRequest, db: AsyncSession = Depends(get_db)):
    user_id_str = verify_token(body.refresh_token, token_type="refresh")
    if not user_id_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token"
        )
    
    user_id = int(user_id_str)
    result = await db.execute(select(User).where(User.id == user_id, User.is_active == True))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )

    # Validate against active refresh token stored in Redis
    redis_key = f"refresh_token:{user.id}"
    stored_token = await redis_client.get(redis_key)
    if not stored_token or stored_token != body.refresh_token:
        # Revoke session in case of token theft / replay attacks
        await redis_client.delete(redis_key)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session revoked due to reuse or expiration"
        )

    new_access_token = create_access_token(subject=user.id)
    new_refresh_token = create_refresh_token(subject=user.id)
    await redis_client.setex(redis_key, 7 * 24 * 3600, new_refresh_token)

    return {"access_token": new_access_token, "refresh_token": new_refresh_token, "token_type": "bearer"}

@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user
