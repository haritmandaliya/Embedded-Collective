from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, timedelta
import os
import uuid

from app.db.session import get_db
from app.api.deps import get_current_user
from app.core.config import settings
from app.models.all_models import User, Answer, Question, Notification, CommunityConfig
from app.api.deps import get_current_user, get_current_user_optional
from app.schemas.all_schemas import UserOut

router = APIRouter()


class UserUpdate(BaseModel):
    display_name: Optional[str] = None
    username: Optional[str] = None
    bio: Optional[str] = None
    phone: Optional[str] = None
    education: Optional[str] = None
    higher_edu: Optional[str] = None
    github_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    avatar_url: Optional[str] = None
    profile_pic_url: Optional[str] = None


class RoleUpgrade(BaseModel):
    role: str = "contributor"


class LeaderboardUser(BaseModel):
    id: int
    username: str
    display_name: Optional[str]
    avatar_url: Optional[str]
    profile_pic_url: Optional[str] = None
    reputation: int
    level: str
    answers_count: int
    accept_rate: float
    top_category: str


def calculate_user_level(reputation: int) -> str:
    if reputation >= 10000:
        return "Level 10: Embedded Guru"
    elif reputation >= 6000:
        return "Level 9: System Principal"
    elif reputation >= 3000:
        return "Level 8: Core Designer"
    elif reputation >= 1500:
        return "Level 7: Hardware Architect"
    elif reputation >= 800:
        return "Level 6: Kernel Expert"
    elif reputation >= 400:
        return "Level 5: Firmware Engineer"
    elif reputation >= 200:
        return "Level 4: DMA Craftsman"
    elif reputation >= 100:
        return "Level 3: I2C Practitioner"
    elif reputation >= 50:
        return "Level 2: SPI Apprentice"
    else:
        return "Level 1: UART Novice"


@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("/leaderboard", response_model=List[LeaderboardUser])
async def get_leaderboard(
    limit: int = 20,
    period: str = Query("all", pattern="^(week|month|all)$"),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    # Enforce community config settings
    cfg_result = await db.execute(select(CommunityConfig).limit(1))
    cfg = cfg_result.scalar_one_or_none()
    if cfg and not cfg.public_leaderboard:
        if not current_user:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Leaderboard is restricted to authenticated members."
            )

    since = None
    if period == "week":
        since = datetime.utcnow() - timedelta(days=7)
    elif period == "month":
        since = datetime.utcnow() - timedelta(days=30)

    if since:
        rep_subq = (
            select(Answer.author_id, func.count(Answer.id).label("recent_answers"))
            .where(Answer.created_at >= since)
            .group_by(Answer.author_id)
            .subquery()
        )
        result = await db.execute(
            select(User, rep_subq.c.recent_answers)
            .outerjoin(rep_subq, User.id == rep_subq.c.author_id)
            .where(User.is_active == True, User.role.in_(["contributor", "admin"]))
            .order_by(User.reputation.desc())
            .limit(limit)
        )
        rows = result.all()
        users = [r[0] for r in rows]
    else:
        result = await db.execute(
            select(User)
            .where(User.is_active == True, User.role.in_(["contributor", "admin"]))
            .order_by(User.reputation.desc())
            .limit(limit)
        )
        users = result.scalars().all()

    leaderboard = []
    for u in users:
        ans_filter = Answer.author_id == u.id
        if since:
            ans_filter = ans_filter & (Answer.created_at >= since)
        ans_count = await db.scalar(select(func.count(Answer.id)).where(ans_filter))
        accepted_count = await db.scalar(
            select(func.count(Answer.id)).where(
                Answer.author_id == u.id, Answer.is_accepted == True
            )
        )
        accept_rate = (accepted_count / ans_count * 100) if ans_count else 0.0
        level = calculate_user_level(u.reputation)

        top_q = await db.execute(
            select(Question.category, func.count(Question.id))
            .join(Answer, Answer.question_id == Question.id)
            .where(Answer.author_id == u.id, Question.category.isnot(None))
            .group_by(Question.category)
            .order_by(func.count(Question.id).desc())
            .limit(1)
        )
        top_row = top_q.first()
        top_category = top_row[0] if top_row else "Embedded"

        leaderboard.append({
            "id": u.id,
            "username": u.username,
            "display_name": u.display_name or u.username,
            "avatar_url": u.avatar_url or u.profile_pic_url,
            "profile_pic_url": u.profile_pic_url,
            "reputation": u.reputation,
            "level": level,
            "answers_count": ans_count or 0,
            "accept_rate": round(accept_rate, 1),
            "top_category": top_category,
        })

    return leaderboard


@router.get("/me/notifications")
async def get_my_notifications(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    limit: int = Query(30, ge=1, le=100),
):
    result = await db.execute(
        select(Notification)
        .where(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .limit(limit)
    )
    items = result.scalars().all()
    return [
        {
            "id": n.id,
            "type": n.type,
            "message": n.message,
            "is_read": n.is_read,
            "link": n.link,
            "created_at": n.created_at.isoformat() if n.created_at else None,
        }
        for n in items
    ]


@router.patch("/me/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == current_user.id,
        )
    )
    notif = result.scalar_one_or_none()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.is_read = True
    await db.commit()
    return {"status": "success"}


@router.patch("/me/notifications/read-all")
async def mark_all_notifications_read(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Notification).where(
            Notification.user_id == current_user.id,
            Notification.is_read == False,
        )
    )
    for n in result.scalars().all():
        n.is_read = True
    await db.commit()
    return {"status": "success"}


@router.get("/check-username/{username}")
async def check_username(username: str, db: AsyncSession = Depends(get_db)):
    clean = username.strip().lstrip("@").lower()
    exists = await db.scalar(select(func.count(User.id)).where(User.username == clean))
    return {"available": exists == 0}


@router.get("/{username_or_id}")
async def get_user_profile(username_or_id: str, db: AsyncSession = Depends(get_db)):
    clean = username_or_id.strip().lstrip("@").lower()
    
    user = None
    if clean.isdigit():
        result = await db.execute(select(User).where(User.id == int(clean)))
        user = result.scalar_one_or_none()
        
    if not user:
        result = await db.execute(select(User).where(User.username == clean))
        user = result.scalar_one_or_none()
        
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    q_count = await db.scalar(select(func.count(Question.id)).where(Question.author_id == user.id))
    a_count = await db.scalar(select(func.count(Answer.id)).where(Answer.author_id == user.id))
    accepted = await db.scalar(
        select(func.count(Answer.id)).where(
            Answer.author_id == user.id,
            Answer.is_accepted == True,
        )
    )

    base = {
        "id": user.id,
        "username": user.username,
        "display_name": user.display_name or user.username,
        "role": user.role,
        "profile_pic_url": user.profile_pic_url or user.avatar_url,
        "reputation": user.reputation,
        "level": calculate_user_level(user.reputation),
        "created_at": user.created_at.isoformat(),
        "questions_count": q_count or 0,
        "answers_count": a_count or 0,
        "accepted_count": accepted or 0,
        "github_url": user.github_url,
        "linkedin_url": user.linkedin_url,
    }

    if user.role in ("contributor", "admin"):
        base.update({
            "bio": user.bio,
            "education": user.education,
            "higher_edu": user.higher_edu,
            "resume_url": user.resume_url,
        })

    return base


@router.patch("/me", response_model=UserOut)
async def update_profile(
    data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if data.display_name is not None:
        current_user.display_name = data.display_name.strip()
    if data.username is not None:
        clean = data.username.strip().lstrip("@").lower()
        if clean != current_user.username:
            taken = await db.scalar(
                select(func.count(User.id)).where(User.username == clean, User.id != current_user.id)
            )
            if taken:
                raise HTTPException(status_code=400, detail="Username already taken")
            current_user.username = clean
    if data.bio is not None:
        current_user.bio = data.bio.strip()
    if data.phone is not None:
        current_user.phone = data.phone.strip()
    if data.education is not None:
        current_user.education = data.education.strip()
    if data.higher_edu is not None:
        current_user.higher_edu = data.higher_edu.strip()
    if data.github_url is not None:
        current_user.github_url = data.github_url.strip()
    if data.linkedin_url is not None:
        current_user.linkedin_url = data.linkedin_url.strip()
    if data.avatar_url is not None:
        current_user.avatar_url = data.avatar_url.strip()
        current_user.profile_pic_url = data.avatar_url.strip()
    if data.profile_pic_url is not None:
        current_user.profile_pic_url = data.profile_pic_url.strip()

    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.patch("/me/role", response_model=UserOut)
async def upgrade_role(
    data: RoleUpgrade,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role != "solution_seeker":
        raise HTTPException(status_code=400, detail="Only Solution Seekers can self-upgrade")
    if data.role != "contributor":
        raise HTTPException(status_code=400, detail="Invalid role upgrade")
    current_user.role = "contributor"
    await db.commit()
    await db.refresh(current_user)
    return current_user
