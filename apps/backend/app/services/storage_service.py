import logging
import httpx
from app.core.config import settings

logger = logging.getLogger("app.services.storage_service")

class SupabaseStorageService:
    def __init__(self):
        self.supabase_url = settings.SUPABASE_URL
        self.service_role_key = settings.SUPABASE_SERVICE_ROLE_KEY
        self.bucket = settings.SUPABASE_BUCKET or "embedded-collective-uploads"
        
        if self.supabase_url:
            self.origin = self.supabase_url.split("/rest/v1")[0].rstrip("/")
            self.storage_url = f"{self.origin}/storage/v1"
        else:
            self.origin = ""
            self.storage_url = ""

    def _get_headers(self):
        return {
            "Authorization": f"Bearer {self.service_role_key}",
            "apikey": self.service_role_key
        }

    async def create_bucket(self, bucket_name: str) -> bool:
        """Create a public bucket in Supabase Storage."""
        if not self.storage_url:
            raise ValueError("Supabase URL is not configured.")
        url = f"{self.storage_url}/bucket"
        headers = self._get_headers()
        payload = {
            "id": bucket_name,
            "name": bucket_name,
            "public": True
        }
        async with httpx.AsyncClient() as client:
            res = await client.post(url, headers=headers, json=payload, timeout=15.0)
            if res.status_code in [200, 201]:
                logger.info(f"Successfully created bucket: {bucket_name}")
                return True
            else:
                logger.error(f"Failed to create bucket: {res.status_code} - {res.text}")
                return False

    async def upload_file(self, content: bytes, filename: str, mime_type: str) -> str:
        """Upload a file to Supabase Storage bucket and return its public URL."""
        if not self.storage_url:
            raise ValueError("Supabase URL is not configured.")
        
        url = f"{self.storage_url}/object/{self.bucket}/{filename}"
        headers = self._get_headers()
        
        async with httpx.AsyncClient() as client:
            res = await client.post(
                url,
                headers=headers,
                files={"file": (filename, content, mime_type)},
                timeout=30.0
            )
            if res.status_code != 200:
                # If bucket doesn't exist, try to create it and retry upload
                if "Bucket not found" in res.text or '"error":"Bucket not found"' in res.text:
                    logger.info(f"Bucket '{self.bucket}' not found. Attempting to create it...")
                    created = await self.create_bucket(self.bucket)
                    if created:
                        res = await client.post(
                            url,
                            headers=headers,
                            files={"file": (filename, content, mime_type)},
                            timeout=30.0
                        )
                        if res.status_code == 200:
                            return self.get_public_url(filename)
                
                # If file already exists, let's try to overwrite it using delete then upload
                if res.status_code == 400 and "already exists" in res.text:
                    logger.info(f"File {filename} already exists. Deleting first to overwrite...")
                    await self.delete_file(filename)
                    res = await client.post(
                        url,
                        headers=headers,
                        files={"file": (filename, content, mime_type)},
                        timeout=30.0
                    )
                    if res.status_code == 200:
                        return self.get_public_url(filename)
                
                raise Exception(f"Failed to upload to Supabase Storage: {res.status_code} - {res.text}")
                
        return self.get_public_url(filename)

    async def delete_file(self, filename: str) -> bool:
        """Delete a file from the Supabase Storage bucket."""
        if not self.storage_url:
            raise ValueError("Supabase URL is not configured.")
            
        url = f"{self.storage_url}/object/{self.bucket}/{filename}"
        headers = self._get_headers()
        
        async with httpx.AsyncClient() as client:
            res = await client.delete(url, headers=headers, timeout=15.0)
            if res.status_code != 200:
                logger.warning(f"Failed to delete file {filename} from Supabase: {res.text}")
                return False
        return True

    def get_public_url(self, filename: str) -> str:
        """Get the public URL for a file in the Supabase Storage bucket."""
        if not self.storage_url:
            raise ValueError("Supabase URL is not configured.")
        return f"{self.storage_url}/object/public/{self.bucket}/{filename}"

    async def file_exists(self, filename: str) -> bool:
        """Check if a file exists in the Supabase Storage bucket."""
        if not self.storage_url:
            raise ValueError("Supabase URL is not configured.")
            
        # Storage API doesn't have a direct exist check, so we search or request metadata
        url = f"{self.storage_url}/object/info/{self.bucket}/{filename}"
        headers = self._get_headers()
        
        async with httpx.AsyncClient() as client:
            res = await client.get(url, headers=headers, timeout=15.0)
            if res.status_code == 200:
                return True
            elif res.status_code == 404:
                return False
            else:
                logger.warning(f"Error checking file existence for {filename}: {res.text}")
                return False

storage_service = SupabaseStorageService()
