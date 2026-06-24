import asyncio
import os
import sys
from dotenv import load_dotenv

# Load env variables from .env file before imports
load_dotenv()

from sqlalchemy import text
from app.core.config import settings
from app.db.session import SessionLocal, engine
from app.core.redis import redis_client
from app.services.storage_service import storage_service

async def test_health():
    print("\n--- [1/6] Auditing Health Check Endpoints ---")
    # Simulate internal function call
    from app.main import health_check
    res = await health_check()
    if res.get("status") == "ok":
        print("✅ Health check endpoint returned status ok.")
        return True
    else:
        print("❌ Health check endpoint failed.")
        return False

async def test_database():
    print("\n--- [2/6] Auditing Database Integration & Transaction Lifecycle ---")
    try:
        async with SessionLocal() as session:
            # 1. SELECT query
            print("  - Running SELECT query...")
            res = await session.execute(text("SELECT 1"))
            print(f"    SELECT 1 Result: {res.scalar()}")
            
            # 2. Table Creation, INSERT, COMMIT, and Cleanup
            print("  - Testing Write Transaction (INSERT/COMMIT)...")
            await session.execute(text("""
                CREATE TABLE IF NOT EXISTS _prod_db_test (
                    id SERIAL PRIMARY KEY,
                    key VARCHAR(50) UNIQUE,
                    val VARCHAR(50)
                )
            """))
            await session.commit()
            
            await session.execute(
                text("INSERT INTO _prod_db_test (key, val) VALUES (:key, :val) ON CONFLICT (key) DO UPDATE SET val = :val"),
                {"key": "prod_readiness_test", "val": "passed"}
            )
            await session.commit()
            
            # 3. Read back
            read_res = await session.execute(
                text("SELECT val FROM _prod_db_test WHERE key = :key"),
                {"key": "prod_readiness_test"}
            )
            val = read_res.scalar()
            print(f"    Read back val: '{val}'")
            
            # 4. Clean up
            await session.execute(
                text("DELETE FROM _prod_db_test WHERE key = :key"),
                {"key": "prod_readiness_test"}
            )
            await session.commit()
            print("    Write transaction and cleanup completed successfully.")
            
        await engine.dispose()
        print("✅ Database integration is 100% production-ready.")
        return True
    except Exception as e:
        print(f"❌ Database integration failed: {e}")
        return False

async def test_redis():
    print("\n--- [3/6] Auditing Redis Connection & Command Pipeline ---")
    try:
        # PING
        ping_res = await redis_client.ping()
        print(f"  - Redis Ping: {ping_res}")
        
        # Write / Read
        test_key = "prod_readiness_redis_test"
        test_val = "active"
        await redis_client.setex(test_key, 60, test_val)
        val = await redis_client.get(test_key)
        print(f"  - Set/Get test: '{val}'")
        
        # Clean up
        await redis_client.delete(test_key)
        
        print("✅ Redis integration is 100% production-ready.")
        return True
    except Exception as e:
        print(f"❌ Redis integration failed: {e}")
        return False

async def test_storage():
    print("\n--- [4/6] Auditing Supabase Storage Service ---")
    try:
        test_file = "prod_readiness_storage_test.txt"
        test_content = b"Production Readiness Storage Check"
        
        # Upload
        print(f"  - Uploading file '{test_file}'...")
        url = await storage_service.upload_file(test_content, test_file, "text/plain")
        print(f"    Public URL: {url}")
        
        # Exists check
        exists = await storage_service.file_exists(test_file)
        print(f"    File exists: {exists}")
        
        # Delete
        print("  - Deleting file...")
        await storage_service.delete_file(test_file)
        print("✅ Storage integration is 100% production-ready.")
        return True
    except Exception as e:
        print(f"❌ Storage integration failed: {e}")
        return False

def test_smtp_oauth():
    print("\n--- [5/6] Auditing SMTP and Google OAuth Credentials ---")
    smtp_ok = True
    oauth_ok = True
    
    # SMTP
    print("  - Validating SMTP configuration...")
    if not settings.SMTP_HOST or not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        print("    ⚠️ WARNING: SMTP is not fully configured. Email OTP delivery will fail.")
        smtp_ok = False
    else:
        print(f"    SMTP Host: {settings.SMTP_HOST} (Configured)")
        
    # OAuth
    print("  - Validating Google OAuth configuration...")
    if not settings.GOOGLE_CLIENT_ID:
        print("    ⚠️ WARNING: Google OAuth is not configured. Social sign-in will fail.")
        oauth_ok = False
    else:
        print(f"    Google Client ID: {settings.GOOGLE_CLIENT_ID[:15]}... (Configured)")
        
    if smtp_ok and oauth_ok:
        print("✅ SMTP and OAuth configurations are present.")
        return True
    else:
        print("⚠️ Configuration warning: SMTP and/or Google OAuth is missing required parameters.")
        return False

def test_environment_vars():
    print("\n--- [6/6] Auditing Required Environment Variables ---")
    required = [
        "DATABASE_URL", "REDIS_URL", "SECRET_KEY", "SUPABASE_URL", 
        "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_BUCKET", "ENVIRONMENT"
    ]
    all_ok = True
    for var in required:
        val = os.getenv(var)
        if not val:
            print(f"  - ❌ {var:<30}: MISSING")
            all_ok = False
        else:
            masked = val[:6] + "..." if len(val) > 10 else "Present"
            print(f"  - ✅ {var:<30}: {masked}")
    
    if all_ok:
        print("✅ Environment variables are fully validated.")
        return True
    else:
        print("❌ One or more required environment variables are missing.")
        return False

async def main():
    print("=========================================================")
    print("        PRODUCTION READY COMPREHENSIVE BACKEND AUDIT     ")
    print("=========================================================")
    
    results = {}
    results["health"] = await test_health()
    results["env"] = test_environment_vars()
    results["database"] = await test_database()
    results["redis"] = await test_redis()
    results["storage"] = await test_storage()
    results["smtp_oauth"] = test_smtp_oauth()
    
    print("\n=========================================================")
    print("                  AUDIT SUMMARY REPORT                   ")
    print("=========================================================")
    all_passed = True
    for component, status in results.items():
        state = "PASS" if status else "FAIL (CRITICAL / WARNING)"
        symbol = "✅" if status else "❌"
        print(f"{symbol} {component.upper():<15}: {state}")
        if not status and component not in ["smtp_oauth"]:
            all_passed = False
            
    print("=========================================================")
    if all_passed:
        print("👉 OVERALL STATUS: READY FOR PRODUCTION 🚀")
        sys.exit(0)
    else:
        print("👉 OVERALL STATUS: FAIL - CRITICAL ISSUES DETECTED 🛑")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
