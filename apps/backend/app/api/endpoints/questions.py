import re
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import func
from typing import List, Optional
from jose import jwt

from app.core.config import settings
from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.all_models import Question, User, Tag, question_tag, Notification, QuestionView
from app.schemas.all_schemas import QuestionCreate, QuestionOut, QuestionDetailOut, QuestionUpdate

router = APIRouter()

async def get_current_user_optional(
    request: Request,
    db: AsyncSession = Depends(get_db)
) -> Optional[User]:
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None
    try:
        token = auth_header.split(" ")[1]
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        user_id = int(payload.get("sub"))
        result = await db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()
    except Exception:
        return None

def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[\s_-]+', '-', text)
    return text

async def get_unique_slug(db: AsyncSession, title: str) -> str:
    base_slug = slugify(title)
    if not base_slug:
        base_slug = "question"
        
    slug = base_slug
    idx = 1
    while True:
        result = await db.execute(select(Question).where(Question.slug == slug))
        if not result.scalar_one_or_none():
            break
        slug = f"{base_slug}-{idx}"
        idx += 1
    return slug

async def get_or_create_tags(db: AsyncSession, tag_names: List[str]) -> List[Tag]:
    tags = []
    for name in tag_names:
        name_clean = name.strip().lower()
        if not name_clean:
            continue
        result = await db.execute(select(Tag).where(Tag.name == name_clean))
        tag = result.scalar_one_or_none()
        if not tag:
            tag = Tag(name=name_clean, slug=slugify(name_clean))
            db.add(tag)
            await db.flush()
        tags.append(tag)
    return tags

@router.post("/", response_model=QuestionOut, status_code=status.HTTP_201_CREATED)
async def create_question(
    q_in: QuestionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    slug = await get_unique_slug(db, q_in.title)
    tags = await get_or_create_tags(db, q_in.tags)
    
    question = Question(
        title=q_in.title,
        slug=slug,
        content=q_in.content,
        author_id=current_user.id,
        category=q_in.category,
        tags=tags
    )
    
    db.add(question)
    await db.flush()
    
    from app.api.endpoints.answers import adjust_reputation
    q_count = await db.scalar(
        select(func.count(Question.id)).where(Question.author_id == current_user.id)
    )
    if q_count == 1:
        await adjust_reputation(db, current_user.id, 10)
    
    # Reload with relationships
    result = await db.execute(
        select(Question)
        .options(selectinload(Question.author), selectinload(Question.tags))
        .where(Question.id == question.id)
    )
    return result.scalar_one()

@router.get("/", response_model=List[QuestionOut])
async def list_questions(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    tag: Optional[str] = None,
    category: Optional[str] = None,
    status: Optional[str] = None,
    solved: Optional[bool] = None,
    q: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    query = select(Question).options(selectinload(Question.author), selectinload(Question.tags)).where(
        Question.deleted_at.is_(None)
    )
    
    if tag:
        tag_clean = tag.strip().lower()
        query = query.join(Question.tags).where(Tag.name == tag_clean)

    if category:
        query = query.where(Question.category == category)

    if status == "solved":
        query = query.where(Question.is_solved == True)
    elif status == "open":
        query = query.where(Question.is_solved == False)
        
    if solved is not None:
        query = query.where(Question.is_solved == solved)

    if q:
        query = query.where(
            (Question.title.ilike(f"%{q}%")) | (Question.content.ilike(f"%{q}%"))
        )
        
    query = query.order_by(Question.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()

@router.get("/{slug}", response_model=QuestionDetailOut)
async def get_question(
    slug: str,
    request: Request,
    inc_views: bool = True,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    query = (
        select(Question)
        .options(
            selectinload(Question.author),
            selectinload(Question.tags),
            selectinload(Question.comments).selectinload(Comment.author),
            selectinload(Question.attachments),
            selectinload(Question.answers)
            .selectinload(Answer.author),
            selectinload(Question.answers)
            .selectinload(Answer.comments)
            .selectinload(Comment.author),
            selectinload(Question.answers)
            .selectinload(Answer.attachments)
        )
        .where(Question.slug == slug, Question.deleted_at.is_(None))
    )
    
    result = await db.execute(query)
    question = result.scalar_one_or_none()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
        
    # Increment views (one user = one view for particular post)
    if inc_views:
        ip_addr = request.client.host if request.client else "unknown"
        
        # Check query for existing view record
        view_check = select(QuestionView).where(QuestionView.question_id == question.id)
        if current_user:
            view_check = view_check.where(
                (QuestionView.user_id == current_user.id) | (QuestionView.ip_address == ip_addr)
            )
        else:
            view_check = view_check.where(QuestionView.ip_address == ip_addr)
            
        view_result = await db.execute(view_check)
        existing_view = view_result.scalar_one_or_none()
        
        if not existing_view:
            # Create a view record and increment
            new_view = QuestionView(
                question_id=question.id,
                user_id=current_user.id if current_user else None,
                ip_address=ip_addr
            )
            db.add(new_view)
            question.views += 1
            await db.flush()
            await db.commit()
            
    return question

@router.put("/{slug}", response_model=QuestionOut)
async def update_question(
    slug: str,
    q_update: QuestionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Question)
        .options(selectinload(Question.author), selectinload(Question.tags))
        .where(Question.slug == slug)
    )
    question = result.scalar_one_or_none()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
        
    if question.author_id != current_user.id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to edit this question"
        )
        
    if q_update.title is not None:
        question.title = q_update.title
        question.slug = await get_unique_slug(db, q_update.title)
    if q_update.content is not None:
        question.content = q_update.content
    if q_update.is_solved is not None:
        question.is_solved = q_update.is_solved
        
    await db.flush()
    return question

@router.delete("/{slug}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_question(
    slug: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Question).where(Question.slug == slug))
    question = result.scalar_one_or_none()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
        
    if question.author_id != current_user.id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this question"
        )
        
    await db.delete(question)
    await db.flush()
    return

@router.post("/{question_id}/vote", response_model=QuestionOut)
async def vote_question(
    question_id: int,
    vote_data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    value = vote_data.get("value")
    if value not in [1, -1]:
        raise HTTPException(status_code=400, detail="Invalid vote value")
        
    result = await db.execute(select(Question).where(Question.id == question_id))
    question = result.scalar_one_or_none()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
        
    from app.models.all_models import Vote
    v_result = await db.execute(
        select(Vote).where(Vote.user_id == current_user.id, Vote.question_id == question_id)
    )
    existing_vote = v_result.scalar_one_or_none()
    
    diff = 0
    if existing_vote:
        if existing_vote.value == value:
            diff = -value
            await db.delete(existing_vote)
        else:
            diff = 2 * value
            existing_vote.value = value
    else:
        diff = value
        new_vote = Vote(user_id=current_user.id, question_id=question_id, value=value)
        db.add(new_vote)
        
    await db.flush()
    from sqlalchemy import func
    actual_score = await db.scalar(
        select(func.coalesce(func.sum(Vote.value), 0))
        .where(Vote.question_id == question_id)
    )
    question.score = actual_score
    await db.flush()
    
    if question.author_id != current_user.id:
        from app.api.endpoints.answers import adjust_reputation
        if value == 1:
            await adjust_reputation(db, question.author_id, 5 if diff > 0 else -5)
            if diff > 0:
                notif = Notification(
                    user_id=question.author_id,
                    type="reputation",
                    message=f"{current_user.username} upvoted your question: '{question.title}'",
                    link=f"/community/q/{question.slug}"
                )
                db.add(notif)
                await db.flush()
        else:
            await adjust_reputation(db, question.author_id, -2 if diff < 0 else 2)
            
    result = await db.execute(
        select(Question)
        .options(selectinload(Question.author), selectinload(Question.tags))
        .where(Question.id == question_id)
    )
    return result.scalar_one()

@router.post("/{question_id}/comments", response_model=dict)
async def comment_question(
    question_id: int,
    comment_data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    content = comment_data.get("content")
    if not content or not content.strip():
        raise HTTPException(status_code=400, detail="Comment content cannot be empty")
        
    result = await db.execute(select(Question).where(Question.id == question_id))
    question = result.scalar_one_or_none()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
        
    comment = Comment(
        content=content.strip(),
        question_id=question_id,
        author_id=current_user.id
    )
    db.add(comment)
    await db.flush()

    # Notify question author
    if question.author_id != current_user.id:
        notif = Notification(
            user_id=question.author_id,
            type="comment",
            message=f"{current_user.username} commented on your question: '{question.title}'",
            link=f"/community/q/{question.slug}"
        )
        db.add(notif)
        await db.flush()
    
    return {
        "id": comment.id,
        "content": comment.content,
        "created_at": comment.created_at.isoformat(),
        "author": {
            "id": current_user.id,
            "username": current_user.username,
            "display_name": current_user.display_name,
            "profile_pic_url": current_user.profile_pic_url,
            "avatar_url": current_user.avatar_url,
            "role": current_user.role,
            "reputation": current_user.reputation
        }
    }

@router.post("/{question_id}/report", response_model=dict)
async def report_question(
    question_id: int,
    report_data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    reason = report_data.get("reason")
    if not reason or not reason.strip():
        raise HTTPException(status_code=400, detail="Report reason is required")
        
    result = await db.execute(select(Question).where(Question.id == question_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Question not found")
        
    from app.models.all_models import Report
    report = Report(
        content_type="question",
        content_id=question_id,
        reporter_id=current_user.id,
        reason=reason.strip()
    )
    db.add(report)
    await db.flush()
    return {"message": "Question reported successfully"}

# We must import Comment model here to avoid selectinload issues
from app.models.all_models import Comment, Answer
