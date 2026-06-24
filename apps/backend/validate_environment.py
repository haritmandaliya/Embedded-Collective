import os
import sys

def main():
    # Load env file if available
    try:
        from dotenv import load_dotenv
        load_dotenv()
        print("Loaded environment variables from local .env file.\n")
    except ImportError:
        print("Warning: python-dotenv not installed. Checking raw environment variables.\n")

    required_vars = [
        "DATABASE_URL",
        "SUPABASE_URL",
        "SUPABASE_SERVICE_ROLE_KEY",
        "SUPABASE_BUCKET",
        "REDIS_URL"
    ]

    all_exist = True
    print("=== ENVIRONMENT VARIABLE VALIDATION ===")
    for var in required_vars:
        val = os.getenv(var)
        if val:
            # Mask sensitive values
            if len(val) > 15:
                masked = val[:6] + "..." + val[-6:]
            else:
                masked = "Present (short)"
            print(f"✅ {var:<30}: {masked}")
        else:
            print(f"❌ {var:<30}: MISSING!")
            all_exist = False
    print("=======================================")

    if all_exist:
        print("\nAll required environment variables are present and configured!")
        sys.exit(0)
    else:
        print("\nError: One or more required environment variables are missing.")
        print("Please check your .env file or host environment settings.")
        sys.exit(1)

if __name__ == "__main__":
    main()
