from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List

from app.db.session import get_db
from app.models.all_models import Review
from app.schemas.all_schemas import ReviewCreate, ReviewOut

router = APIRouter()

from app.api.deps import get_current_user
from app.models.all_models import User

@router.post("/", response_model=ReviewOut, status_code=status.HTTP_201_CREATED)
async def create_review(
    rev_in: ReviewCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Review starts as visible = False until approved by admin (display only admins wants)
    review = Review(
        author_name=rev_in.author_name,
        role_or_title=rev_in.role_or_title,
        review_text=rev_in.review_text,
        rating=rev_in.rating,
        is_visible=False,
        user_id=current_user.id
    )
    db.add(review)
    await db.flush()
    await db.commit()
    await db.refresh(review)
    return review

from sqlalchemy.orm import selectinload

@router.get("/", response_model=List[ReviewOut])
async def list_public_reviews(
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Review)
        .options(selectinload(Review.user))
        .where(Review.is_visible == True)
        .order_by(Review.created_at.desc())
    )
    return result.scalars().all()
