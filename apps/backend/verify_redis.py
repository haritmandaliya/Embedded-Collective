import asyncio
import sys
from app.core.redis import redis_client

async def main():
    print("=== REDIS CONNECTION AND OPERATIONS VERIFICATION ===")
    try:
        print("\n[1/5] Testing connection (PING)...")
        ping_res = await redis_client.ping()
        print(f"Success! Ping response: {ping_res}")
        
        print("\n[2/5] Testing key SET and GET...")
        test_key = "test_redis_verification_key"
        test_val = "upstash_active_status"
        await redis_client.set(test_key, test_val)
        val = await redis_client.get(test_key)
        print(f"Set '{test_key}' to '{test_val}'. Got: '{val}'")
        if val != test_val:
            raise Exception("Value mismatch on read!")
            
        print("\n[3/5] Testing TTL expiry settings...")
        await redis_client.setex(test_key, 10, test_val)
        ttl = await redis_client.ttl(test_key)
        print(f"Key TTL is configured: {ttl} seconds remaining")
        if ttl <= 0:
            raise Exception("TTL setting failed!")
            
        print("\n[4/5] Testing key DELETE...")
        await redis_client.delete(test_key)
        val_after_del = await redis_client.get(test_key)
        print(f"Deleted key. Read result: {val_after_del}")
        if val_after_del is not None:
            raise Exception("Key was not deleted successfully!")
            
        print("\n[5/5] Testing connection robustness...")
        # Simulate reconnection by closing and checking ping again
        await redis_client.close()
        ping_res_2 = await redis_client.ping()
        print(f"Ping after pool closure (auto-reconnect): {ping_res_2}")
        
        print("\nRESULT: SUCCESS")
        sys.exit(0)
    except Exception as e:
        print(f"\nVerification failed with error: {e}")
        print("\nRESULT: FAILURE")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
