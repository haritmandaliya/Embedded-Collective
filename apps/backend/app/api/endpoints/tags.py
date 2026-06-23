from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func

from app.db.session import get_db
from app.models.all_models import Tag, question_tag, Question

router = APIRouter()


@router.get("/")
async def list_tags(
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Return tags sorted by usage count (non-deleted questions only)."""
    stmt = (
        select(Tag.name, Tag.slug, func.count(Question.id).label("count"))
        .outerjoin(question_tag, Tag.id == question_tag.c.tag_id)
        .outerjoin(
            Question,
            (Question.id == question_tag.c.question_id) & (Question.deleted_at.is_(None)),
        )
        .group_by(Tag.id, Tag.name, Tag.slug)
        .order_by(func.count(Question.id).desc())
        .limit(limit)
    )
    result = await db.execute(stmt)
    rows = result.all()
    return [{"name": r.name, "slug": r.slug, "count": r.count or 0} for r in rows]
