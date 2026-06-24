import asyncio
import logging
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from sqlalchemy.orm import selectinload

# Configure production logging system
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)-5s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("app.main")

from app.core.config import settings
from app.api.api import api_router
from app.db.session import get_db
from app.models.all_models import User, Question, Answer, FeaturedSolution, Review, Tag, question_tag, QuestionView
from app.db.seed import seed as run_db_seed

async def run_startup_diagnostics():
    port = os.getenv("PORT", "8000")
    env = settings.ENVIRONMENT
    logger.info("=== STARTUP DIAGNOSTICS ===")
    logger.info("PORT: %s", port)
    logger.info("ENVIRONMENT: %s", env)
    
    # 1. Test database connection
    try:
        from app.db.session import engine
        from sqlalchemy import text
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        logger.info("DATABASE STATUS: Connected successfully to Supabase PostgreSQL!")
    except Exception as e:
        logger.error("DATABASE STATUS: Failed to connect to database: %s", e)
        
    # 2. Test Redis connection
    try:
        from app.core.redis import redis_client
        await redis_client.ping()
        logger.info("REDIS STATUS: Connected successfully to Upstash Redis!")
    except Exception as e:
        logger.error("REDIS STATUS: Failed to connect to Redis: %s", e)
    logger.info("============================")

async def run_background_initialization():
    await run_startup_diagnostics()
    try:
        logger.info("--- BACKGROUND SEEDING: Starting database checks and seeding ---")
        await run_db_seed()
        logger.info("--- BACKGROUND SEEDING: Seeding database complete ---")
    except Exception as e:
        logger.error("--- BACKGROUND SEEDING ERROR: Seeding database failed: %s ---", e)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Run diagnostics & database seed tasks asynchronously in the background to unblock fast port binding
    logger.info("--- STARTUP: Scheduling background initialization and seed task ---")
    asyncio.create_task(run_background_initialization())
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# Configure CORS for local development & production access
allowed_origins = [
    "https://haritmandaliya.vercel.app",
    "https://haritmandaliya-portfolio.vercel.app",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
env_origins = os.getenv("ALLOWED_ORIGINS")
if env_origins:
    allowed_origins.extend([o.strip() for o in env_origins.split(",") if o.strip()])

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)

from fastapi.responses import RedirectResponse
from app.services.storage_service import storage_service

@app.get("/uploads/avatars/{path:path}")
async def get_avatar_redirect(path: str):
    return RedirectResponse(url=storage_service.get_public_url(f"avatars/{path}"))

@app.get("/uploads/resumes/{path:path}")
async def get_resume_redirect(path: str):
    return RedirectResponse(url=storage_service.get_public_url(f"resumes/{path}"))

@app.get("/uploads/{path:path}")
async def get_general_redirect(path: str):
    return RedirectResponse(url=storage_service.get_public_url(f"posts/{path}"))

@app.get("/api/stats/public")
@app.get(f"{settings.API_V1_STR}/stats/public")
async def get_public_stats(db: AsyncSession = Depends(get_db)):
    users_count = await db.scalar(select(func.count(User.id)).where(User.is_active == True))
    questions_count = await db.scalar(
        select(func.count(Question.id)).where(Question.deleted_at.is_(None))
    )
    solved_questions_count = await db.scalar(
        select(func.count(Question.id)).where(
            Question.deleted_at.is_(None), Question.is_solved == True
        )
    )
    answers_count = await db.scalar(select(func.count(Answer.id)))
    avg_rating_result = await db.scalar(
        select(func.avg(Review.rating)).where(Review.is_visible == True)
    )
    avg_rating = round(float(avg_rating_result or 4.9), 1)

    return {
        "total_questions": questions_count or 0,
        "solved_questions": solved_questions_count or 0,
        "member_count": users_count or 0,
        "avg_rating": avg_rating,
        "answers_count": answers_count or 0,
    }


@app.get(f"{settings.API_V1_STR}/stats/categories")
async def get_category_stats(db: AsyncSession = Depends(get_db)):
    categories = [
        ("", "All"),
        ("Software Problems", "Software"),
        ("Hardware Problems", "Hardware"),
        ("Programming Issues", "Programming"),
        ("Communication Protocols", "Protocols"),
        ("Other", "Other"),
    ]
    total = await db.scalar(
        select(func.count(Question.id)).where(Question.deleted_at.is_(None))
    ) or 0
    result = []
    for value, label in categories:
        if value == "":
            result.append({"category": value, "label": label, "count": total})
        else:
            count = await db.scalar(
                select(func.count(Question.id)).where(
                    Question.deleted_at.is_(None), Question.category == value
                )
            ) or 0
            result.append({"category": value, "label": label, "count": count})
    return result


@app.get("/api/featured-solutions")
@app.get(f"{settings.API_V1_STR}/featured-solutions")
async def get_featured_solutions(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(FeaturedSolution)
        .order_by(FeaturedSolution.display_order.asc())
    )
    featured = result.scalars().all()
    
    solutions_list = []
    for f in featured:
        q_result = await db.execute(
            select(Question)
            .options(selectinload(Question.tags), selectinload(Question.author))
            .where(Question.id == f.question_id)
        )
        q = q_result.scalar_one_or_none()
        if not q:
            continue
            
        a_result = await db.execute(
            select(Answer)
            .where(Answer.question_id == q.id, Answer.is_accepted == True)
        )
        a = a_result.scalar_one_or_none()
        
        tag_name = q.category or (q.tags[0].name if q.tags else "Embedded")
        
        solutions_list.append({
            "id": str(q.id),
            "title": q.title,
            "category": tag_name,
            "rating": 5.0,
            "review_excerpt": a.content[:150] + "..." if a else "No details provided.",
            "asker_name": q.author.username if q.author else "anonymous",
            "slug": q.slug
        })
    return solutions_list

@app.get("/")
@app.get("/health")
@app.get(f"{settings.API_V1_STR}/health")
async def health_check():
    return {"status": "ok"}

from app.api.deps import get_current_user
from app.schemas.all_schemas import UserOut

@app.patch("/api/users/me/notification-prefs", response_model=UserOut)
@app.patch("/api/v1/users/me/notification-prefs", response_model=UserOut)
async def update_notification_prefs(
    pref_data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if "email_answer" in pref_data:
        current_user.email_answer = bool(pref_data["email_answer"])
    if "email_accepted" in pref_data:
        current_user.email_accepted = bool(pref_data["email_accepted"])
    if "email_digest" in pref_data:
        current_user.email_digest = bool(pref_data["email_digest"])
    if "push_enabled" in pref_data:
        current_user.push_enabled = bool(pref_data["push_enabled"])
        
    await db.flush()
    return current_user


# ──── Contact-Us Form Endpoint ────
from pydantic import BaseModel as PydanticBaseModel
from typing import Optional as Opt

class ContactFormRequest(PydanticBaseModel):
    name: str
    email: str
    message: str

@app.post("/api/contact")
@app.post(f"{settings.API_V1_STR}/contact")
async def handle_contact_form(body: ContactFormRequest):
    """Handle contact-us form: send acknowledgment to sender + notification to admin."""
    from app.services.notifications import send_contact_email

    if not body.name.strip() or not body.email.strip() or not body.message.strip():
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Name, email, and message are required.")

    try:
        await send_contact_email(body.name.strip(), body.email.strip(), body.message.strip())
    except Exception as e:
        import logging
        logging.getLogger(__name__).error("Contact form email error: %s", e)

    return {"status": "success", "message": "Thank you for your message! We'll get back to you soon."}


# ──── Account Deletion Endpoint ────
@app.delete(f"{settings.API_V1_STR}/users/me")
async def delete_own_account(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Permanently delete the current user's account and all associated data."""
    from fastapi import HTTPException as HTTPErr

    if current_user.role in ("admin", "super_admin"):
        raise HTTPErr(status_code=403, detail="Admin accounts cannot be self-deleted. Contact system administrator.")

    # Soft-delete all user's questions
    user_questions = await db.execute(
        select(Question).where(Question.author_id == current_user.id, Question.deleted_at.is_(None))
    )
    for q in user_questions.scalars().all():
        from datetime import datetime
        q.deleted_at = datetime.utcnow()
        q.status = "closed"

    # Delete user's answers
    user_answers = await db.execute(
        select(Answer).where(Answer.author_id == current_user.id)
    )
    for a in user_answers.scalars().all():
        await db.delete(a)

    # Delete the user record
    await db.delete(current_user)
    await db.commit()

    return {"status": "success", "message": "Account permanently deleted."}


# ──── Share Link Generator ────
@app.get(f"{settings.API_V1_STR}/questions/{{slug}}/share")
async def get_question_share_data(slug: str, request: Request, db: AsyncSession = Depends(get_db)):
    """Generate sharable link and OG metadata for a question."""
    from fastapi import HTTPException as HTTPErr
    from urllib.parse import urlparse

    result = await db.execute(
        select(Question)
        .options(selectinload(Question.author), selectinload(Question.tags))
        .where(Question.slug == slug, Question.deleted_at.is_(None))
    )
    q = result.scalar_one_or_none()
    if not q:
        raise HTTPErr(status_code=404, detail="Question not found")

    referer = request.headers.get("referer")
    if referer:
        parsed = urlparse(referer)
        base_url = f"{parsed.scheme}://{parsed.netloc}"
    else:
        base_url = os.environ.get("PUBLIC_URL", "http://localhost:5173")
    share_url = f"{base_url}/community/q/{q.slug}"
    tags_str = ", ".join([f"#{t.name}" for t in q.tags[:4]]) if q.tags else "#embedded"
    author_name = q.author.display_name or q.author.username if q.author else "Anonymous"

    description = (q.content[:160] + "...") if len(q.content) > 160 else q.content

    # LinkedIn share URL
    linkedin_url = f"https://www.linkedin.com/sharing/share-offsite/?url={share_url}"
    # Twitter/X share URL
    tweet_text = f"I solved this embedded systems problem on Embedded Collective: \"{q.title}\" {tags_str}"
    twitter_url = f"https://twitter.com/intent/tweet?text={tweet_text}&url={share_url}"

    return {
        "url": share_url,
        "title": q.title,
        "description": description,
        "author": author_name,
        "tags": tags_str,
        "is_solved": q.is_solved,
        "linkedin_url": linkedin_url,
        "twitter_url": twitter_url,
        "og": {
            "og:title": f"{q.title} — Embedded Collective",
            "og:description": description,
            "og:url": share_url,
            "og:type": "article",
            "og:site_name": "Embedded Collective",
        },
    }
