from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.all_models import Answer, Question, User, Notification
from app.schemas.all_schemas import AnswerCreate, AnswerOut, AnswerUpdate

router = APIRouter()

async def adjust_reputation(db: AsyncSession, user_id: int, amount: int):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user:
        user.reputation = max(0, user.reputation + amount)
        await db.flush()

@router.post("/", response_model=AnswerOut, status_code=status.HTTP_201_CREATED)
async def create_answer(
    ans_in: AnswerCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify question exists
    q_result = await db.execute(select(Question).where(Question.id == ans_in.question_id))
    question = q_result.scalar_one_or_none()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
        
    if ans_in.is_solution and current_user.role == "solution_seeker":
        raise HTTPException(
            status_code=403,
            detail="Only Contributors can post solutions. Upgrade your account in Settings.",
        )

    answer = Answer(
        content=ans_in.content,
        question_id=ans_in.question_id,
        author_id=current_user.id,
        is_solution=ans_in.is_solution,
    )
    db.add(answer)
    await db.flush()
    
    # Notify question author
    if question.author_id != current_user.id:
        msg_type = "solution" if ans_in.is_solution else "answer"
        msg_text = f"{current_user.username} posted a solution to your question: '{question.title}'" if ans_in.is_solution else f"{current_user.username} answered your question: '{question.title}'"
        notif = Notification(
            user_id=question.author_id,
            type=msg_type,
            message=msg_text,
            link=f"/community/q/{question.slug}"
        )
        db.add(notif)
        await db.flush()

    # Reload answer with relations
    result = await db.execute(
        select(Answer)
        .options(
            selectinload(Answer.author),
            selectinload(Answer.comments),
            selectinload(Answer.attachments)
        )
        .where(Answer.id == answer.id)
    )
    return result.scalar_one()

@router.put("/{answer_id}", response_model=AnswerOut)
async def update_answer(
    answer_id: int,
    ans_update: AnswerUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Answer)
        .options(
            selectinload(Answer.author),
            selectinload(Answer.comments),
            selectinload(Answer.attachments)
        )
        .where(Answer.id == answer_id)
    )
    answer = result.scalar_one_or_none()
    if not answer:
        raise HTTPException(status_code=404, detail="Answer not found")
        
    if answer.author_id != current_user.id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to edit this answer"
        )
        
    answer.content = ans_update.content
    await db.flush()
    return answer

@router.delete("/{answer_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_answer(
    answer_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Answer).where(Answer.id == answer_id))
    answer = result.scalar_one_or_none()
    if not answer:
        raise HTTPException(status_code=404, detail="Answer not found")
        
    if answer.author_id != current_user.id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this answer"
        )
        
    await db.delete(answer)
    await db.flush()
    return

@router.put("/{answer_id}/accept", response_model=AnswerOut)
async def toggle_accept_answer(
    answer_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Answer)
        .options(selectinload(Answer.author), selectinload(Answer.comments))
        .where(Answer.id == answer_id)
    )
    answer = result.scalar_one_or_none()
    if not answer:
        raise HTTPException(status_code=404, detail="Answer not found")
        
    q_result = await db.execute(select(Question).where(Question.id == answer.question_id))
    question = q_result.scalar_one_or_none()
    
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
        
    if question.author_id != current_user.id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the question author can accept answers"
        )
        
    if answer.is_accepted:
        # Unaccept
        answer.is_accepted = False
        question.is_solved = False
        await db.flush()
        
        # Deduct reputation: -25 to answer author, -2 to question author
        await adjust_reputation(db, answer.author_id, -25)
        await adjust_reputation(db, question.author_id, -2)
    else:
        # Accept (and unaccept all other answers for this question)
        await db.execute(
            select(Answer)
            .where(Answer.question_id == question.id, Answer.is_accepted == True)
        )
        # We can run an update to set all other answers to is_accepted = False
        other_answers_result = await db.execute(
            select(Answer).where(Answer.question_id == question.id, Answer.is_accepted == True)
        )
        other_accepted = other_answers_result.scalars().all()
        for oa in other_accepted:
            oa.is_accepted = False
            await adjust_reputation(db, oa.author_id, -25)
            await adjust_reputation(db, question.author_id, -2)
            
        answer.is_accepted = True
        question.is_solved = True
        await db.flush()
        
        # Add reputation: +25 to answer author, +2 to question author
        await adjust_reputation(db, answer.author_id, 25)
        await adjust_reputation(db, question.author_id, 2)
        
        # Send Notification to answer author
        if answer.author_id != current_user.id:
            notif = Notification(
                user_id=answer.author_id,
                type="accept",
                message=f"Your answer was accepted by {current_user.username}!",
                link=f"/community/q/{question.slug}"
            )
            db.add(notif)
            await db.flush()
            
    return answer

@router.post("/{answer_id}/vote", response_model=AnswerOut)
async def vote_answer(
    answer_id: int,
    vote_data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    value = vote_data.get("value")
    if value not in [1, -1]:
        raise HTTPException(status_code=400, detail="Invalid vote value")
        
    result = await db.execute(select(Answer).where(Answer.id == answer_id))
    answer = result.scalar_one_or_none()
    if not answer:
        raise HTTPException(status_code=404, detail="Answer not found")
        
    from app.models.all_models import Vote
    v_result = await db.execute(
        select(Vote).where(Vote.user_id == current_user.id, Vote.answer_id == answer_id)
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
        new_vote = Vote(user_id=current_user.id, answer_id=answer_id, value=value)
        db.add(new_vote)
        
    await db.flush()
    from sqlalchemy import func
    actual_score = await db.scalar(
        select(func.coalesce(func.sum(Vote.value), 0))
        .where(Vote.answer_id == answer_id)
    )
    answer.score = actual_score
    await db.flush()
    
    # Adjust reputation of answer author: +10 for upvote, -2 for downvote
    if answer.author_id != current_user.id:
        if value == 1:
            await adjust_reputation(db, answer.author_id, 10 if diff > 0 else -10)
            if diff > 0:
                q_res = await db.execute(select(Question).where(Question.id == answer.question_id))
                q = q_res.scalar_one_or_none()
                q_slug = q.slug if q else ""
                notif = Notification(
                    user_id=answer.author_id,
                    type="reputation",
                    message=f"{current_user.username} upvoted your answer to: '{q.title if q else ''}'",
                    link=f"/community/q/{q_slug}"
                )
                db.add(notif)
                await db.flush()
        else:
            await adjust_reputation(db, answer.author_id, -2 if diff < 0 else 2)
            
    result = await db.execute(
        select(Answer)
        .options(selectinload(Answer.author), selectinload(Answer.comments))
        .where(Answer.id == answer_id)
    )
    return result.scalar_one()

@router.post("/{answer_id}/comments", response_model=dict)
async def comment_answer(
    answer_id: int,
    comment_data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    content = comment_data.get("content")
    if not content or not content.strip():
        raise HTTPException(status_code=400, detail="Comment content cannot be empty")
        
    result = await db.execute(select(Answer).where(Answer.id == answer_id))
    answer = result.scalar_one_or_none()
    if not answer:
        raise HTTPException(status_code=404, detail="Answer not found")
        
    from app.models.all_models import Comment
    comment = Comment(
        content=content.strip(),
        answer_id=answer_id,
        author_id=current_user.id
    )
    db.add(comment)
    await db.flush()

    # Notify answer author
    if answer.author_id != current_user.id:
        q_res = await db.execute(select(Question).where(Question.id == answer.question_id))
        q = q_res.scalar_one_or_none()
        q_slug = q.slug if q else ""
        notif = Notification(
            user_id=answer.author_id,
            type="comment",
            message=f"{current_user.username} commented on your answer to: '{q.title if q else ''}'",
            link=f"/community/q/{q_slug}"
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

@router.post("/{answer_id}/report", response_model=dict)
async def report_answer(
    answer_id: int,
    report_data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    reason = report_data.get("reason")
    if not reason or not reason.strip():
        raise HTTPException(status_code=400, detail="Report reason is required")
        
    result = await db.execute(select(Answer).where(Answer.id == answer_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Answer not found")
        
    from app.models.all_models import Report
    report = Report(
        content_type="answer",
        content_id=answer_id,
        reporter_id=current_user.id,
        reason=reason.strip()
    )
    db.add(report)
    await db.flush()
    return {"message": "Answer reported successfully"}
