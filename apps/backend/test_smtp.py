import os
import sys
import asyncio

# Add backend to python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Load settings before importing main app elements
from app.core.config import settings

async def main():
    print(f"Loaded SMTP configuration:")
    print(f"  SMTP_HOST: {settings.SMTP_HOST}")
    print(f"  SMTP_PORT: {settings.SMTP_PORT}")
    print(f"  SMTP_USER: {settings.SMTP_USER}")
    print(f"  SMTP_PASSWORD: {'***' if settings.SMTP_PASSWORD else 'None'}")
    print(f"  SMTP_FROM: {settings.SMTP_FROM}")
    print(f"  ADMIN_EMAIL: {settings.ADMIN_EMAIL}")

    if not settings.SMTP_HOST or not settings.SMTP_FROM:
        print("ERROR: SMTP_HOST and SMTP_FROM must be configured in backend/.env")
        sys.exit(1)

    from app.services.notifications import send_email_otp, send_contact_email

    print("\n1. Testing OTP Verification Email...")
    try:
        await send_email_otp("herry.pvt.hm@gmail.com", "987654")
        print("[SUCCESS] OTP Verification Email processed successfully.")
    except Exception as e:
        print(f"[FAILED] OTP Verification Email failed: {e}")

    print("\n2. Testing Contact Us Form Auto-Replies...")
    try:
        await send_contact_email(
            sender_name="SMTP Integration Tester",
            sender_email="herry.pvt.hm@gmail.com",
            message="Hi Harit, this is a live verification message to ensure that the Gmail SMTP integration works flawlessly and templates are properly slugified."
        )
        print("[SUCCESS] Contact Us Form Auto-Replies processed successfully.")
    except Exception as e:
        print(f"[FAILED] Contact Us Form Auto-Replies failed: {e}")

    # Check generated files in .run/email_previews
    preview_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".run", "email_previews")
    print(f"\nChecking generated preview files in: {preview_dir}")
    if os.path.exists(preview_dir):
        files = os.listdir(preview_dir)
        print("Generated files:")
        for f in sorted(files):
            print(f"  - {f} ({os.path.getsize(os.path.join(preview_dir, f))} bytes)")
    else:
        print("ERROR: Preview directory does not exist.")

if __name__ == "__main__":
    asyncio.run(main())
