from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import func, or_
from typing import List, Optional
from datetime import datetime, timedelta
import json
import re

from app.db.session import get_db
from app.api.deps import get_current_admin
from app.models.all_models import (
    User, Question, Answer, Review, Report, Tag, question_tag,
    FeaturedSolution, CommunityConfig,
)
from app.schemas.all_schemas import UserOut, ReviewOut

router = APIRouter()

VALID_ROLES = {"solution_seeker", "contributor", "admin", "user"}


async def _default_config(db: AsyncSession) -> CommunityConfig:
    result = await db.execute(select(CommunityConfig).limit(1))
    cfg = result.scalar_one_or_none()
    if not cfg:
        cfg = CommunityConfig()
        db.add(cfg)
        await db.flush()
    return cfg


@router.get("/stats", dependencies=[Depends(get_current_admin)])
async def get_moderation_stats(db: AsyncSession = Depends(get_db)):
    users_count = await db.scalar(select(func.count(User.id)))
    questions_count = await db.scalar(
        select(func.count(Question.id)).where(Question.deleted_at.is_(None))
    )
    solved_count = await db.scalar(
        select(func.count(Question.id)).where(
            Question.deleted_at.is_(None), Question.is_solved == True
        )
    )
    answers_count = await db.scalar(select(func.count(Answer.id)))
    total_reviews = await db.scalar(select(func.count(Review.id)))
    visible_reviews = await db.scalar(
        select(func.count(Review.id)).where(Review.is_visible == True)
    )
    avg_rating = await db.scalar(
        select(func.avg(Review.rating)).where(Review.is_visible == True)
    )

    return {
        "users": users_count,
        "questions": questions_count,
        "solved": solved_count,
        "answers": answers_count,
        "avg_rating": round(float(avg_rating or 4.9), 1),
        "reviews": {
            "total": total_reviews,
            "visible": visible_reviews,
            "pending": (total_reviews or 0) - (visible_reviews or 0),
        },
    }


@router.get("/activity", dependencies=[Depends(get_current_admin)])
async def get_recent_activity(db: AsyncSession = Depends(get_db), limit: int = 20):
    activities = []

    q_result = await db.execute(
        select(Question)
        .options(selectinload(Question.author))
        .where(Question.deleted_at.is_(None))
        .order_by(Question.created_at.desc())
        .limit(limit)
    )
    for q in q_result.scalars().all():
        author = q.author.display_name or q.author.username if q.author else "Unknown"
        activities.append({
            "type": "question_posted",
            "text": f'{author} posted "{q.title[:60]}"',
            "created_at": q.created_at.isoformat() if q.created_at else None,
        })

    u_result = await db.execute(
        select(User).order_by(User.created_at.desc()).limit(5)
    )
    for u in u_result.scalars().all():
        activities.append({
            "type": "user_joined",
            "text": f"{u.display_name or u.username} joined as {u.role.replace('_', ' ').title()}",
            "created_at": u.created_at.isoformat() if u.created_at else None,
        })

    activities.sort(key=lambda x: x.get("created_at") or "", reverse=True)
    return activities[:limit]


@router.get("/questions", dependencies=[Depends(get_current_admin)])
async def list_admin_questions(
    search: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Question).where(Question.deleted_at.is_(None))
    if search:
        stmt = stmt.where(
            or_(Question.title.ilike(f"%{search}%"), Question.content.ilike(f"%{search}%"))
        )
    if category and category != "ALL":
        stmt = stmt.where(Question.category == category)
    if status_filter == "SOLVED":
        stmt = stmt.where(Question.is_solved == True)
    elif status_filter == "OPEN":
        stmt = stmt.where(Question.is_solved == False)

    result = await db.execute(
        stmt.order_by(Question.is_pinned.desc(), Question.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    items = []
    for q in result.scalars().all():
        cat = q.category or "Other"
        if cat.endswith(" Problems"):
            cat = cat.replace(" Problems", "")
        elif cat.endswith(" Issues"):
            cat = cat.replace(" Issues", "")
        elif cat.endswith(" Protocols"):
            cat = cat.replace(" Protocols", "")
        items.append({
            "id": q.id,
            "title": q.title,
            "slug": q.slug,
            "category": cat,
            "status": "SOLVED" if q.is_solved else "OPEN",
            "is_pinned": q.is_pinned,
            "is_featured": q.is_featured,
            "score": q.score,
            "views": q.views,
        })
    return items


@router.patch("/questions/{question_id}", dependencies=[Depends(get_current_admin)])
async def update_admin_question(
    question_id: int,
    body: dict,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Question).where(Question.id == question_id, Question.deleted_at.is_(None))
    )
    q = result.scalar_one_or_none()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")

    if "status" in body:
        status_val = body["status"]
        if status_val == "SOLVED":
            q.is_solved = True
            q.status = "solved"
        elif status_val == "OPEN":
            q.is_solved = False
            q.status = "open"
    if "is_pinned" in body:
        q.is_pinned = bool(body["is_pinned"])
    if "is_featured" in body:
        new_val = bool(body["is_featured"])
        if new_val:
            res_count = await db.execute(
                select(func.count(Question.id)).where(
                    Question.is_featured == True,
                    Question.id != q.id,
                    Question.deleted_at.is_(None)
                )
            )
            other_featured_count = res_count.scalar() or 0
            if other_featured_count >= 3:
                raise HTTPException(
                    status_code=400,
                    detail="Maximum of 3 featured solutions allowed. Please unfeature another solution first."
                )
            q.is_featured = True
            existing = await db.execute(
                select(FeaturedSolution).where(FeaturedSolution.question_id == q.id)
            )
            if not existing.scalar_one_or_none():
                db.add(FeaturedSolution(question_id=q.id, display_order=q.id))
        else:
            q.is_featured = False
            feat = await db.execute(
                select(FeaturedSolution).where(FeaturedSolution.question_id == q.id)
            )
            f = feat.scalar_one_or_none()
            if f:
                await db.delete(f)

    await db.commit()
    return {"status": "success", "id": q.id}


@router.delete("/questions/{question_id}", dependencies=[Depends(get_current_admin)])
async def soft_delete_question(question_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Question).where(Question.id == question_id))
    q = result.scalar_one_or_none()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")
    q.deleted_at = datetime.utcnow()
    q.status = "closed"
    await db.commit()
    return {"status": "success", "message": "Question soft-deleted"}


@router.post("/questions/bulk", dependencies=[Depends(get_current_admin)])
async def bulk_question_action(body: dict, db: AsyncSession = Depends(get_db)):
    ids = body.get("ids", [])
    action = body.get("action")
    if not ids or action not in ("delete", "mark_solved"):
        raise HTTPException(status_code=400, detail="Invalid bulk action")

    result = await db.execute(select(Question).where(Question.id.in_(ids)))
    questions = result.scalars().all()
    for q in questions:
        if action == "delete":
            q.deleted_at = datetime.utcnow()
            q.status = "closed"
        elif action == "mark_solved":
            q.is_solved = True
            q.status = "solved"
    await db.commit()
    return {"status": "success", "count": len(questions)}


@router.get("/tags", dependencies=[Depends(get_current_admin)])
async def list_admin_tags(db: AsyncSession = Depends(get_db)):
    stmt = (
        select(Tag.id, Tag.name, Tag.slug, func.count(question_tag.c.question_id).label("uses"))
        .outerjoin(question_tag, Tag.id == question_tag.c.tag_id)
        .group_by(Tag.id, Tag.name, Tag.slug)
        .order_by(func.count(question_tag.c.question_id).desc())
    )
    result = await db.execute(stmt)
    return [
        {"id": r.id, "name": r.name, "slug": r.slug, "uses": r.uses or 0}
        for r in result.all()
    ]


@router.post("/tags", dependencies=[Depends(get_current_admin)])
async def create_tag(body: dict, db: AsyncSession = Depends(get_db)):
    name = (body.get("name") or "").strip().lower()
    if not name:
        raise HTTPException(status_code=400, detail="Tag name required")
    slug = re.sub(r"[^a-z0-9]+", "-", name).strip("-")
    existing = await db.execute(select(Tag).where(or_(Tag.name == name, Tag.slug == slug)))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Tag already exists")
    tag = Tag(name=name, slug=slug)
    db.add(tag)
    await db.commit()
    await db.refresh(tag)
    return {"id": tag.id, "name": tag.name, "slug": tag.slug, "uses": 0}


@router.patch("/tags/{tag_id}", dependencies=[Depends(get_current_admin)])
async def rename_tag(tag_id: int, body: dict, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Tag).where(Tag.id == tag_id))
    tag = result.scalar_one_or_none()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    new_name = (body.get("name") or "").strip().lower()
    if not new_name:
        raise HTTPException(status_code=400, detail="Name required")
    tag.name = new_name
    tag.slug = re.sub(r"[^a-z0-9]+", "-", new_name).strip("-")
    await db.commit()
    return {"id": tag.id, "name": tag.name, "slug": tag.slug}


@router.post("/tags/{tag_id}/merge", dependencies=[Depends(get_current_admin)])
async def merge_tag(tag_id: int, body: dict, db: AsyncSession = Depends(get_db)):
    target_name = (body.get("target") or "").strip().lower()
    if not target_name:
        raise HTTPException(status_code=400, detail="Target tag required")

    source = await db.execute(select(Tag).where(Tag.id == tag_id))
    src_tag = source.scalar_one_or_none()
    if not src_tag:
        raise HTTPException(status_code=404, detail="Source tag not found")

    target = await db.execute(select(Tag).where(Tag.name == target_name))
    tgt_tag = target.scalar_one_or_none()
    if not tgt_tag:
        tgt_tag = Tag(name=target_name, slug=re.sub(r"[^a-z0-9]+", "-", target_name).strip("-"))
        db.add(tgt_tag)
        await db.flush()

    q_result = await db.execute(
        select(Question).join(question_tag).where(question_tag.c.tag_id == src_tag.id)
    )
    for q in q_result.scalars().unique().all():
        if tgt_tag not in q.tags:
            q.tags.append(tgt_tag)
        if src_tag in q.tags:
            q.tags.remove(src_tag)

    await db.delete(src_tag)
    await db.commit()
    return {"status": "success", "merged_into": tgt_tag.name}


@router.delete("/tags/{tag_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(get_current_admin)])
async def delete_tag(tag_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Tag).where(Tag.id == tag_id))
    tag = result.scalar_one_or_none()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    q_result = await db.execute(
        select(Question).join(question_tag).where(question_tag.c.tag_id == tag.id)
    )
    for q in q_result.scalars().unique().all():
        if tag in q.tags:
            q.tags.remove(tag)
    await db.delete(tag)
    await db.commit()
    return


@router.get("/settings", dependencies=[Depends(get_current_admin)])
async def get_settings(db: AsyncSession = Depends(get_db)):
    cfg = await _default_config(db)
    await db.commit()
    return {
        "community_name": cfg.community_name,
        "community_tagline": cfg.community_tagline,
        "join_mode": cfg.join_mode,
        "allow_google_oauth": cfg.allow_google_oauth,
        "allow_otp_login": cfg.allow_otp_login,
        "allow_anonymous_browse": cfg.allow_anonymous_browse,
        "email_notifications": cfg.email_notifications,
        "public_leaderboard": cfg.public_leaderboard,
    }


@router.patch("/settings", dependencies=[Depends(get_current_admin)])
async def update_settings(body: dict, db: AsyncSession = Depends(get_db)):
    cfg = await _default_config(db)
    for field in (
        "community_name", "community_tagline", "join_mode",
        "allow_google_oauth", "allow_otp_login", "allow_anonymous_browse",
        "email_notifications", "public_leaderboard",
    ):
        if field in body:
            setattr(cfg, field, body[field])
    cfg.updated_at = datetime.utcnow()
    await db.commit()
    return {"status": "success"}


@router.get("/users", response_model=List[UserOut], dependencies=[Depends(get_current_admin)])
async def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User).order_by(User.created_at.desc()).offset(skip).limit(limit)
    )
    return result.scalars().all()


@router.put("/users/{user_id}/role", response_model=UserOut)
async def change_user_role(
    user_id: int,
    role: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    allowed_roles = {"solution_seeker", "contributor", "admin", "super_admin"}
    if role not in allowed_roles:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid role. Must be one of: {', '.join(allowed_roles)}"
        )

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Prevent demoting or modifying the role of the unique Super Admin (haritmandaliya@gmail.com)
    if user.email == "haritmandaliya@gmail.com":
        if role != "super_admin":
            raise HTTPException(
                status_code=400,
                detail="The unique Super Admin account (haritmandaliya@gmail.com) cannot be demoted or changed."
            )

    # Prevent promoting any other user to super_admin
    if role == "super_admin" and user.email != "haritmandaliya@gmail.com":
        raise HTTPException(
            status_code=400,
            detail="Only the unique Super Admin account (haritmandaliya@gmail.com) can hold the super_admin role."
        )

    # Only Super Admin can promote to Admin or revoke Admin access (from Admin role or to Admin role)
    is_managing_admin = (role in ("admin", "super_admin")) or (user.role in ("admin", "super_admin"))
    if is_managing_admin and current_user.role != "super_admin":
        raise HTTPException(
            status_code=403,
            detail="Only the Super Admin can promote users to Admin or revoke Admin access."
        )

    user.role = role
    await db.commit()
    await db.refresh(user)
    return user



@router.put("/users/{user_id}/status", response_model=UserOut, dependencies=[Depends(get_current_admin)])
async def toggle_user_status(user_id: int, is_active: bool, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.email == "haritmandaliya@gmail.com" and not is_active:
        raise HTTPException(
            status_code=400,
            detail="The unique Super Admin account (haritmandaliya@gmail.com) cannot be deactivated or banned."
        )

    user.is_active = is_active
    if is_active:
        user.ban_reason = None
    await db.commit()
    await db.refresh(user)
    return user


@router.get("/reviews", response_model=list[ReviewOut], dependencies=[Depends(get_current_admin)])
async def list_reviews(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Review)
        .options(selectinload(Review.user))
        .order_by(Review.created_at.desc())
    )
    return result.scalars().all()


@router.put("/reviews/{review_id}/toggle", response_model=ReviewOut, dependencies=[Depends(get_current_admin)])
async def toggle_review_visibility(review_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Review).where(Review.id == review_id))
    review = result.scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    review.is_visible = not review.is_visible
    await db.commit()
    await db.refresh(review)
    return review


@router.put("/reviews/{review_id}/approve", response_model=ReviewOut, dependencies=[Depends(get_current_admin)])
async def approve_review(review_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Review).where(Review.id == review_id))
    review = result.scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    review.is_visible = True
    await db.commit()
    await db.refresh(review)
    return review


@router.delete("/reviews/{review_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(get_current_admin)])
async def delete_review(review_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Review).where(Review.id == review_id))
    review = result.scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    await db.delete(review)
    await db.commit()
    return


@router.get("/reports", dependencies=[Depends(get_current_admin)])
async def list_reports(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Report)
        .options(selectinload(Report.reporter))
        .order_by(Report.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    reports = result.scalars().all()

    reports_data = []
    for r in reports:
        item_title = "Unknown Content"
        item_content = ""

        if r.content_type == "question":
            q_res = await db.execute(select(Question).where(Question.id == r.content_id))
            q = q_res.scalar_one_or_none()
            if q:
                item_title = q.title
                item_content = q.content
        elif r.content_type == "answer":
            a_res = await db.execute(select(Answer).where(Answer.id == r.content_id))
            a = a_res.scalar_one_or_none()
            if a:
                item_title = f"Answer to Question #{a.question_id}"
                item_content = a.content

        reports_data.append({
            "id": r.id,
            "content_type": r.content_type,
            "content_id": r.content_id,
            "reporter": {"username": r.reporter.username} if r.reporter else None,
            "reason": r.reason,
            "status": r.status,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "item_title": item_title,
            "item_content": item_content,
        })

    return reports_data


@router.patch("/reports/{report_id}", dependencies=[Depends(get_current_admin)])
async def resolve_report(report_id: int, action_data: dict, db: AsyncSession = Depends(get_db)):
    action = action_data.get("action")
    if action not in ["dismiss", "delete_content"]:
        raise HTTPException(status_code=400, detail="Invalid action")

    result = await db.execute(select(Report).where(Report.id == report_id))
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    if action == "dismiss":
        report.status = "dismissed"
    elif action == "delete_content":
        report.status = "resolved"
        if report.content_type == "question":
            q_res = await db.execute(select(Question).where(Question.id == report.content_id))
            q = q_res.scalar_one_or_none()
            if q:
                q.deleted_at = datetime.utcnow()
                q.status = "closed"
        elif report.content_type == "answer":
            a_res = await db.execute(select(Answer).where(Answer.id == report.content_id))
            a = a_res.scalar_one_or_none()
            if a:
                await db.delete(a)

    await db.commit()
    return {"status": "success", "message": f"Report {action} successfully"}


@router.post("/users/{user_id}/ban", dependencies=[Depends(get_current_admin)])
async def ban_user(user_id: int, ban_data: dict, db: AsyncSession = Depends(get_db)):
    reason = ban_data.get("reason", "No reason provided")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.email == "haritmandaliya@gmail.com":
        raise HTTPException(
            status_code=400,
            detail="The unique Super Admin account (haritmandaliya@gmail.com) cannot be deactivated or banned."
        )

    user.is_active = False
    user.ban_reason = reason
    await db.commit()
    return {"status": "success", "message": f"User {user.username} has been banned."}

