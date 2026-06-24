import asyncio
import socket
from urllib.parse import urlparse
import asyncpg
from app.core.config import settings

async def main():
    database_url = settings.DATABASE_URL
    print("=== RAW asyncpg DATABASE CONNECTION VERIFICATION ===")
    print(f"URL: {database_url.split('@')[-1]}")

    # Parse connection string
    # Remove prefix to use standard urlparse
    clean_url = database_url.replace("postgresql+asyncpg://", "http://")
    parsed = urlparse(clean_url)
    
    hostname = parsed.hostname
    port = parsed.port or 5432
    database = parsed.path.lstrip("/")
    username = parsed.username
    password = parsed.password

    print("\n[Phase 1] URL Parameters:")
    print(f"Host     : {hostname}")
    print(f"Port     : {port}")
    print(f"Database : {database}")
    print(f"User     : {username}")

    print("\n[Phase 2] DNS & TCP Network Checks:")
    try:
        # Check DNS Resolution
        addrinfo = socket.getaddrinfo(hostname, port, 0, socket.SOCK_STREAM)
        print("DNS Resolution IPs found:")
        for family, _, _, _, sockaddr in addrinfo:
            ip = sockaddr[0]
            fam_str = "IPv6" if family == socket.AF_INET6 else "IPv4"
            print(f" - {fam_str}: {ip}")
            
        # Attempt raw socket connection (TCP handshakes)
        for family, socktype, proto, _, sockaddr in addrinfo:
            ip = sockaddr[0]
            fam_str = "IPv6" if family == socket.AF_INET6 else "IPv4"
            print(f"Attempting TCP handshake with {ip} ({fam_str})...")
            try:
                s = socket.socket(family, socktype, proto)
                s.settimeout(5.0)
                s.connect(sockaddr)
                s.close()
                print(f"TCP Handshake successful with {ip}!")
            except Exception as e:
                print(f"TCP Handshake failed with {ip}: {e}")
    except Exception as e:
        print(f"DNS Resolution failed: {e}")

    print("\n[Phase 3] Direct Connection via asyncpg:")
    try:
        conn = await asyncpg.connect(
            host=hostname,
            port=port,
            user=username,
            password=password,
            database=database,
            timeout=10.0
        )
        print("Connection opened successfully!")
        
        # Execute basic metadata queries
        version = await conn.fetchval("SELECT version();")
        now = await conn.fetchval("SELECT NOW();")
        
        print(f"Database Version : {version}")
        print(f"Current Time     : {now}")
        
        await conn.close()
        print("Connection closed successfully.")
        print("\nRESULT: SUCCESS")
    except Exception as e:
        print(f"Connection failed: {e}")
        print("\nRESULT: FAILURE")

if __name__ == "__main__":
    asyncio.run(main())
