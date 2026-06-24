import os
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.all_models import Attachment, User
from app.schemas.all_schemas import AttachmentOut
from app.services.storage_service import storage_service

router = APIRouter()

ALLOWED_MIME_TYPES = [
    "image/jpeg", "image/png", "image/gif", "image/webp",
    "application/pdf", "application/zip", "text/plain", "application/x-zip-compressed",
]
MAX_FILE_SIZE = 10 * 1024 * 1024


@router.post("/", response_model=AttachmentOut)
async def upload_file(
    file: UploadFile = File(...),
    question_id: Optional[int] = None,
    answer_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=400, detail=f"Mime type {file.content_type} is not supported.")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File exceeds maximum allowed size of 10MB.")

    file_ext = os.path.splitext(file.filename or "")[1] or ".bin"
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    
    # Store in posts/ folder inside the Supabase Storage bucket
    bucket_path = f"posts/{unique_filename}"

    try:
        file_url = await storage_service.upload_file(content, bucket_path, file.content_type)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload file to storage: {str(e)}")

    attachment = Attachment(
        file_name=file.filename,
        file_url=file_url,
        size_bytes=len(content),
        mime_type=file.content_type,
        question_id=question_id,
        answer_id=answer_id,
    )
    db.add(attachment)
    await db.commit()
    await db.refresh(attachment)
    return attachment


@router.get("/static/{filename}")
async def get_static_upload(filename: str):
    """Fallback redirect to Supabase Storage public URL for compatibility."""
    public_url = storage_service.get_public_url(f"posts/{filename}")
    return RedirectResponse(url=public_url)


@router.post("/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if file.content_type not in ["image/jpeg", "image/png", "image/webp"]:
        raise HTTPException(status_code=400, detail="Image files only (jpg, png, webp)")

    content = await file.read()
    if len(content) > 2 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Max 2MB")

    filename = f"avatars/{current_user.id}.jpg"

    try:
        from PIL import Image
        import io
        img = Image.open(io.BytesIO(content)).convert("RGB")
        img = img.resize((256, 256), Image.LANCZOS)
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=90)
        content = buf.getvalue()
    except ImportError:
        pass

    try:
        url = await storage_service.upload_file(content, filename, "image/jpeg")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload avatar: {str(e)}")

    current_user.profile_pic_url = url
    current_user.avatar_url = url
    await db.commit()
    return {"url": url}


@router.post("/resume")
async def upload_resume(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role == "solution_seeker":
        raise HTTPException(status_code=403, detail="Only Contributors can upload a resume")
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="PDF only")

    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Max 5MB")

    filename = f"resumes/{current_user.id}.pdf"

    try:
        url = await storage_service.upload_file(content, filename, "application/pdf")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload resume: {str(e)}")

    current_user.resume_url = url
    await db.commit()
    return {"url": url}
