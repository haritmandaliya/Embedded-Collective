import asyncio
import sys
import httpx
from app.services.storage_service import storage_service

async def main():
    if not storage_service.supabase_url or not storage_service.service_role_key:
        print("Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured in settings.")
        sys.exit(1)

    print("=== SUPABASE STORAGE SERVICE INTEGRATION TEST ===")
    print(f"Endpoint: {storage_service.origin}")
    print(f"Bucket: {storage_service.bucket}")
    
    test_filename = "test_verify_storage_service.txt"
    test_content = b"Supabase Storage Service Integration test - SUCCESS"
    test_mime = "text/plain"

    try:
        # 1. Verify Bucket Existence / Creation
        print("\n[1/4] Verifying bucket existence...")
        headers = storage_service._get_headers()
        async with httpx.AsyncClient() as client:
            res = await client.get(f"{storage_service.storage_url}/bucket/{storage_service.bucket}", headers=headers)
            if res.status_code == 404:
                print(f"Bucket '{storage_service.bucket}' not found. Attempting to create...")
                create_res = await client.post(
                    f"{storage_service.storage_url}/bucket",
                    headers=headers,
                    json={"id": storage_service.bucket, "name": storage_service.bucket, "public": True}
                )
                if create_res.status_code != 200:
                    print(f"Failed to create bucket: {create_res.text}")
                    sys.exit(1)
                print(f"Bucket '{storage_service.bucket}' created successfully.")
            elif res.status_code != 200:
                print(f"Failed to verify bucket: {res.text}")
                sys.exit(1)
            else:
                print(f"Bucket verified successfully.")

        # 2. Test File Upload
        print("\n[2/4] Testing upload_file()...")
        public_url = await storage_service.upload_file(test_content, test_filename, test_mime)
        print(f"Upload successful! Public URL: {public_url}")

        # 3. Verify File Retrieval & Public URL
        print("\n[3/4] Testing file retrieval...")
        async with httpx.AsyncClient() as client:
            get_res = await client.get(public_url)
            if get_res.status_code != 200:
                print(f"Failed to retrieve uploaded file: {get_res.status_code} - {get_res.text}")
                sys.exit(1)
            content_match = get_res.content == test_content
            print(f"Content match: {content_match} ('{get_res.text}')")
            if not content_match:
                print("Error: Retrieved content does not match uploaded content.")
                sys.exit(1)

        # 4. Test File Deletion
        print("\n[4/4] Testing delete_file()...")
        deleted = await storage_service.delete_file(test_filename)
        print(f"Delete operation returned: {deleted}")
        
        # Verify file no longer exists
        exists = await storage_service.file_exists(test_filename)
        print(f"File exists post-delete check: {exists}")
        
        if not deleted or exists:
            print("Error: File was not successfully deleted.")
            sys.exit(1)

        print("\nAll Supabase Storage integration tests passed successfully!")

    except Exception as e:
        print(f"\nVerification failed with error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
