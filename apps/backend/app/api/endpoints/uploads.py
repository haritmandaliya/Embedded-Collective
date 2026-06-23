import os
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.api.deps import get_current_user
from app.core.config import settings
from app.models.all_models import Attachment, User
from app.schemas.all_schemas import AttachmentOut

router = APIRouter()

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
STATIC_DIR = os.path.join(UPLOAD_DIR, "static")
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(STATIC_DIR, exist_ok=True)

ALLOWED_MIME_TYPES = [
    "image/jpeg", "image/png", "image/gif", "image/webp",
    "application/pdf", "application/zip", "text/plain", "application/x-zip-compressed",
]
MAX_FILE_SIZE = 10 * 1024 * 1024


def resolve_upload_path(filename: str) -> str | None:
    """Find file in static dir or legacy flat upload dir."""
    safe = os.path.basename(filename)
    for directory in (STATIC_DIR, UPLOAD_DIR):
        path = os.path.join(directory, safe)
        if os.path.isfile(path):
            return path
    return None


def public_file_url(filename: str) -> str:
    return f"/api/v1/uploads/static/{os.path.basename(filename)}"


async def upload_to_r2(content: bytes, filename: str, mime_type: str) -> str:
    import aioboto3

    session = aioboto3.Session()
    endpoint_url = f"https://{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
    async with session.client(
        "s3",
        endpoint_url=endpoint_url,
        aws_access_key_id=settings.R2_ACCESS_KEY_ID,
        aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
    ) as s3:
        await s3.put_object(
            Bucket=settings.R2_BUCKET_NAME,
            Key=filename,
            Body=content,
            ContentType=mime_type,
        )
    return f"https://{settings.R2_BUCKET_NAME}.r2.cloudflarestorage.com/{filename}"


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

    if all([settings.R2_BUCKET_NAME, settings.R2_ACCOUNT_ID, settings.R2_ACCESS_KEY_ID, settings.R2_SECRET_ACCESS_KEY]):
        try:
            file_url = await upload_to_r2(content, unique_filename, file.content_type)
        except Exception:
            local_path = os.path.join(STATIC_DIR, unique_filename)
            with open(local_path, "wb") as f:
                f.write(content)
            file_url = public_file_url(unique_filename)
    else:
        local_path = os.path.join(STATIC_DIR, unique_filename)
        with open(local_path, "wb") as f:
            f.write(content)
        file_url = public_file_url(unique_filename)

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
    path = resolve_upload_path(filename)
    if not path:
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path)


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
    path = os.path.join(UPLOAD_DIR, filename)
    os.makedirs(os.path.dirname(path), exist_ok=True)

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

    with open(path, "wb") as f:
        f.write(content)

    url = f"/uploads/avatars/{current_user.id}.jpg"
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

    rel_path = f"resumes/{current_user.id}.pdf"
    path = os.path.join(UPLOAD_DIR, rel_path)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "wb") as f:
        f.write(content)

    url = f"/uploads/{rel_path}"
    current_user.resume_url = url
    await db.commit()
    return {"url": url}
