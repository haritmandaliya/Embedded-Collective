import math
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import func, or_
from typing import List, Optional

from app.db.session import get_db
from app.models.all_models import Question
from app.schemas.all_schemas import QuestionOut

router = APIRouter()


@router.get("/")
async def search_questions(
    q: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    sort: str = Query("newest"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Question).where(Question.deleted_at.is_(None))

    if q and q.strip():
        search = q.strip()
        stmt = stmt.where(
            or_(
                Question.title.ilike(f"%{search}%"),
                Question.content.ilike(f"%{search}%"),
            )
        )

    if category:
        stmt = stmt.where(Question.category == category)

    if status == "solved":
        stmt = stmt.where(Question.is_solved == True)
    elif status == "open":
        stmt = stmt.where(Question.is_solved == False)

    if sort == "votes":
        stmt = stmt.order_by(Question.is_pinned.desc(), Question.score.desc())
    elif sort == "activity":
        stmt = stmt.order_by(Question.is_pinned.desc(), Question.created_at.desc())
    else:
        stmt = stmt.order_by(Question.is_pinned.desc(), Question.created_at.desc())

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = await db.scalar(count_stmt) or 0

    stmt = (
        stmt.options(
            selectinload(Question.author),
            selectinload(Question.tags),
            selectinload(Question.attachments),
        )
        .offset((page - 1) * limit)
        .limit(limit)
    )
    result = await db.execute(stmt)
    items = result.scalars().all()

    return {
        "items": items,
        "total": total,
        "page": page,
        "pages": max(1, math.ceil(total / limit)) if total else 1,
    }


@router.get("/legacy", response_model=List[QuestionOut])
async def search_questions_legacy(
    q: str = Query(..., min_length=1),
    db: AsyncSession = Depends(get_db),
):
    search_query = q.strip()
    fallback_stmt = (
        select(Question)
        .options(selectinload(Question.author), selectinload(Question.tags))
        .where(
            or_(
                Question.title.ilike(f"%{search_query}%"),
                Question.content.ilike(f"%{search_query}%"),
            )
        )
        .order_by(Question.created_at.desc())
        .limit(20)
    )
    result = await db.execute(fallback_stmt)
    return result.scalars().all()
