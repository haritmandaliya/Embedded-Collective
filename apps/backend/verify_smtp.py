import asyncio
import sys
import os

# Add backend to python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings
from app.services.notifications import send_email_otp

async def main():
    print("=== SMTP CONFIGURATION & OTP EMAIL DELIVERY VERIFICATION ===")
    
    print(f"SMTP Configuration:")
    print(f"  SMTP_HOST: {settings.SMTP_HOST}")
    print(f"  SMTP_PORT: {settings.SMTP_PORT}")
    print(f"  SMTP_USER: {settings.SMTP_USER}")
    print(f"  SMTP_PASSWORD: {'***' if settings.SMTP_PASSWORD else 'None'}")
    print(f"  SMTP_FROM: {settings.SMTP_FROM}")
    
    if not settings.SMTP_HOST or not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        print("\nERROR: SMTP configuration variables are missing!")
        print("RESULT: FAILURE")
        sys.exit(1)
        
    print("\nAttempting to send real OTP email to admin email address...")
    try:
        # Use ADMIN_EMAIL or standard testing address
        target_email = settings.ADMIN_EMAIL or "herry.pvt.hm@gmail.com"
        print(f"Target email address: {target_email}")
        
        await send_email_otp(target_email, "123456")
        print("\nOTP Verification Email sent successfully!")
        print("RESULT: SUCCESS")
        sys.exit(0)
    except Exception as e:
        print(f"\nVerification failed with error: {e}")
        print("RESULT: FAILURE")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
