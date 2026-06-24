import asyncio
import socket
import ssl
import sys
import asyncpg
from app.core.config import settings

async def try_connect(region, username, password, database):
    host = f"aws-0-{region}.pooler.supabase.com"
    port = 6543
    
    # Configure SSL context to bypass self-signed certificate issues
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    
    print(f"Testing region: {region} ({host})...")
    try:
        # Resolve DNS first
        socket.gethostbyname(host)
        
        # Connect using asyncpg
        conn = await asyncpg.connect(
            host=host,
            port=port,
            user=username,
            password=password,
            database=database,
            ssl=ssl_context,
            timeout=5.0
        )
        version = await conn.fetchval("SELECT version();")
        now = await conn.fetchval("SELECT NOW();")
        await conn.close()
        return True, host, version, now
    except Exception as e:
        print(f" ❌ Failed for {region}: {e}")
        return False, host, None, None

async def main():
    print("=== SUPABASE REGIONAL CONNECTION SEARCH & DIAGNOSTICS ===")
    
    regions = [
        "ap-south-1",      # Mumbai
        "us-east-1",       # N. Virginia
        "us-west-1",       # N. California
        "eu-central-1",    # Frankfurt
        "ap-southeast-1",  # Singapore
        "us-east-2",       # Ohio
        "us-west-2",       # Oregon
        "eu-west-1",       # Ireland
        "eu-west-2",       # London
        "eu-west-3",       # Paris
        "ap-northeast-1",  # Tokyo
        "ap-northeast-2",  # Seoul
        "ap-southeast-2",  # Sydney
        "sa-east-1",       # Sao Paulo
        "ca-central-1"     # Canada
    ]
    
    project_ref = "ntmmdbuimcaqaoegfbwk"
    username = f"postgres.{project_ref}"
    password = "rHamS-xSH2suiGD"
    database = "postgres"
    
    success = False
    active_host = None
    
    for region in regions:
        ok, host, version, now = await try_connect(region, username, password, database)
        if ok:
            print(f"\n✅ SUCCESS! Connection established via: {host}")
            print(f"Database Version: {version}")
            print(f"Current Time:     {now}")
            active_host = host
            success = True
            break
            
    if not success:
        print("\n❌ All connection attempts failed. Check credentials, internet connection, or project ref.")
        sys.exit(1)
        
    # Write corrected URL to .env
    env_file = ".env"
    if os.path.exists(env_file):
        with open(env_file, "r") as f:
            lines = f.readlines()
            
        new_lines = []
        for line in lines:
            if line.startswith("DATABASE_URL="):
                new_line = f"DATABASE_URL=postgresql://{username}:{password}@{active_host}:6543/{database}?pgbouncer=true\n"
                new_lines.append(new_line)
                print(f"Updating DATABASE_URL in .env to point to: {active_host}")
            else:
                new_lines.append(line)
                
        with open(env_file, "w") as f:
            f.writelines(new_lines)
            
    print("\nDatabase configuration updated and verified!")

if __name__ == "__main__":
    import os
    asyncio.run(main())
