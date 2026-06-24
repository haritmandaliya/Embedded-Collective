import asyncio
import sys
from app.services.storage_service import storage_service

async def main():
    print("=== SUPABASE STORAGE INTEGRATION VERIFICATION ===")
    try:
        test_filename = "test_verification_file.txt"
        test_content = b"Supabase Storage Verification Content"
        mime_type = "text/plain"
        
        print(f"\n[1/4] Uploading test file '{test_filename}'...")
        public_url = await storage_service.upload_file(test_content, test_filename, mime_type)
        print(f"Success! Public URL: {public_url}")
        
        print("\n[2/4] Verifying file exists in storage...")
        exists = await storage_service.file_exists(test_filename)
        print(f"File exists check: {exists}")
        if not exists:
            raise Exception("File existence check returned False after upload!")
            
        print("\n[3/4] Testing public URL format...")
        expected_part = f"/storage/v1/object/public/{storage_service.bucket}/{test_filename}"
        if expected_part not in public_url:
            print(f"Warning: Public URL structure does not contain expected bucket part: '{expected_part}'")
        else:
            print("Public URL structure verified.")
            
        print("\n[4/4] Deleting test file...")
        deleted = await storage_service.delete_file(test_filename)
        print(f"Deleted successfully: {deleted}")
        
        exists_after = await storage_service.file_exists(test_filename)
        print(f"File exists post-delete: {exists_after}")
        if exists_after:
            raise Exception("File still exists after deletion!")
            
        print("\nRESULT: SUCCESS")
        sys.exit(0)
    except Exception as e:
        print(f"\nVerification failed with error: {e}")
        print("\nRESULT: FAILURE")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
