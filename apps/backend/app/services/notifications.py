import logging
import os
from email.message import EmailMessage

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

PREVIEW_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
    "..",
    ".run",
    "email_previews",
)


def _smtp_ready() -> bool:
    return bool(settings.SMTP_HOST and settings.SMTP_FROM)


def _twilio_ready() -> bool:
    return bool(
        settings.TWILIO_ACCOUNT_SID
        and settings.TWILIO_AUTH_TOKEN
        and settings.TWILIO_PHONE_NUMBER
    )


def _save_dev_preview(to_email: str, subject: str, html: str) -> None:
    """Save HTML email preview in dev."""
    try:
        os.makedirs(PREVIEW_DIR, exist_ok=True)
        safe = to_email.replace("@", "_at_").replace(".", "_")
        
        # Create a clean subject slug
        import re
        subject_slug = re.sub(r'[^a-zA-Z0-9]+', '_', subject).strip('_').lower()
        if not subject_slug:
            subject_slug = "email"
            
        path = os.path.join(PREVIEW_DIR, f"{safe}_{subject_slug}.html")
        with open(path, "w", encoding="utf-8") as f:
            f.write(html)
        logger.info("Email preview saved: %s", path)
    except Exception as exc:
        logger.warning("Could not save email preview: %s", exc)


async def send_email_otp(to_email: str, code: str) -> None:
    from app.services.email_templates import otp_verification_email

    subject, plain, html = otp_verification_email(code, to_email)
    _save_dev_preview(to_email, subject, html)

    if not _smtp_ready():
        if settings.ENVIRONMENT == "production":
            raise RuntimeError(
                "Email delivery is not configured. Set SMTP_HOST and SMTP_FROM in backend/.env"
            )
        import sys
        sys.stdout.write(
            f"\n\x1b[43m\x1b[30m  EMAIL OTP DEV LOG  \x1b[0m\x1b[33m  {to_email} → \x1b[1m{code}\x1b[0m\n\n"
        )
        sys.stdout.flush()
        logger.warning("SMTP not configured — HTML preview saved for %s (see .run/email_previews/)", to_email)
        return

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = settings.SMTP_FROM
    msg["To"] = to_email
    msg.set_content(plain)
    msg.add_alternative(html, subtype="html")

    try:
        import aiosmtplib

        await aiosmtplib.send(
            msg,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USER or None,
            password=settings.SMTP_PASSWORD or None,
            start_tls=settings.SMTP_PORT != 465,
            use_tls=settings.SMTP_PORT == 465,
        )
        logger.info("OTP email sent to %s", to_email)
    except Exception as exc:
        logger.error("Failed to send OTP email to %s: %s", to_email, exc)
        if settings.ENVIRONMENT == "production":
            raise RuntimeError("Failed to send verification email. Check SMTP settings.") from exc
        raise RuntimeError(f"Failed to send email: {exc}") from exc


async def send_sms_otp(phone: str, code: str) -> None:
    if not _twilio_ready():
        if settings.ENVIRONMENT == "production":
            raise RuntimeError("SMS delivery is not configured (Twilio)")
        logger.warning("Twilio not configured — SMS OTP for %s logged only in dev", phone)
        return

    url = (
        f"https://api.twilio.com/2010-04-01/Accounts/"
        f"{settings.TWILIO_ACCOUNT_SID}/Messages.json"
    )
    body = {
        "To": phone,
        "From": settings.TWILIO_PHONE_NUMBER,
        "Body": f"Embedded Collective verification code: {code}. Expires in 10 minutes.",
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                url,
                data=body,
                auth=(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN),
            )
            if resp.status_code >= 400:
                logger.error("Twilio error %s: %s", resp.status_code, resp.text)
                if settings.ENVIRONMENT == "production":
                    raise RuntimeError("Failed to send verification SMS")
    except RuntimeError:
        raise
    except Exception as exc:
        logger.error("Failed to send OTP SMS to %s: %s", phone, exc)
        if settings.ENVIRONMENT == "production":
            raise RuntimeError("Failed to send verification SMS") from exc


async def send_contact_email(sender_name: str, sender_email: str, message: str) -> None:
    """Send acknowledgment email to the sender AND notification to admin."""
    from app.services.email_templates import (
        contact_us_acknowledgment_email,
        admin_contact_notification_email,
    )

    # 1. Send acknowledgment to the sender
    ack_subject, ack_plain, ack_html = contact_us_acknowledgment_email(
        sender_name, sender_email, message
    )
    await _send_email(sender_email, ack_subject, ack_plain, ack_html)

    # 2. Send notification to admin
    admin_email = settings.ADMIN_EMAIL or settings.SMTP_FROM or "admin@example.com"
    notif_subject, notif_plain, notif_html = admin_contact_notification_email(
        sender_name, sender_email, message
    )
    await _send_email(admin_email, notif_subject, notif_plain, notif_html)


async def _send_email(to_email: str, subject: str, plain: str, html: str) -> None:
    """Core email sending helper with SMTP + dev fallback."""
    _save_dev_preview(to_email, subject, html)

    if not _smtp_ready():
        if settings.ENVIRONMENT == "production":
            raise RuntimeError(
                "Email delivery is not configured. Set SMTP_HOST and SMTP_FROM in backend/.env"
            )
        import sys
        sys.stdout.write(
            f"\n\x1b[44m\x1b[37m  EMAIL SENT (DEV)  \x1b[0m\x1b[36m  To: {to_email}\x1b[0m\n"
            f"\x1b[36m  Subject: {subject}\x1b[0m\n\n"
        )
        sys.stdout.flush()
        logger.warning("SMTP not configured — HTML preview saved for %s (see .run/email_previews/)", to_email)
        return

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = settings.SMTP_FROM
    msg["To"] = to_email
    msg.set_content(plain)
    msg.add_alternative(html, subtype="html")

    try:
        import aiosmtplib

        await aiosmtplib.send(
            msg,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USER or None,
            password=settings.SMTP_PASSWORD or None,
            start_tls=settings.SMTP_PORT != 465,
            use_tls=settings.SMTP_PORT == 465,
        )
        logger.info("Email sent to %s: %s", to_email, subject)
    except Exception as exc:
        logger.error("Failed to send email to %s: %s", to_email, exc)
        if settings.ENVIRONMENT == "production":
            raise RuntimeError("Failed to send email. Check SMTP settings.") from exc

