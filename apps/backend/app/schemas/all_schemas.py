from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
from datetime import datetime

# Token Schemas
class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class TokenPayload(BaseModel):
    sub: Optional[int] = None

class RegisterSchema(BaseModel):
    email: EmailStr
    phone: Optional[str] = None
    role: str = "solution_seeker"
    display_name: str
    username: str
    password: Optional[str] = None
    education: Optional[str] = None
    higher_edu: Optional[str] = None
    bio: Optional[str] = None
    google_id: Optional[str] = None
    google_avatar: Optional[str] = None

class RegisterResponse(BaseModel):
    user: "UserOut"
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    username: str
    phone: Optional[str] = None
    role: str = "solution_seeker"
    email_answer: bool = True
    email_accepted: bool = True
    email_digest: bool = True
    push_enabled: bool = True


class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    username: Optional[str] = None
    phone: Optional[str] = None
    password: Optional[str] = None

class UserOut(UserBase):
    id: int
    display_name: Optional[str] = None
    bio: Optional[str] = None
    education: Optional[str] = None
    higher_edu: Optional[str] = None
    resume_url: Optional[str] = None
    profile_pic_url: Optional[str] = None
    avatar_url: Optional[str] = None
    github_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    is_verified: bool = False
    onboarding_done: bool = False
    reputation: int
    created_at: datetime

    class Config:
        from_attributes = True

# Tag Schemas
class TagBase(BaseModel):
    name: str
    slug: str

class TagCreate(TagBase):
    pass

class TagOut(TagBase):
    id: int

    class Config:
        from_attributes = True

# Comment Schemas
class CommentBase(BaseModel):
    content: str

class CommentCreate(CommentBase):
    question_id: Optional[int] = None
    answer_id: Optional[int] = None

class CommentOut(CommentBase):
    id: int
    author_id: int
    author: UserOut
    created_at: datetime

    class Config:
        from_attributes = True

# Attachment Schemas
class AttachmentOut(BaseModel):
    id: int
    file_name: str
    file_url: str
    size_bytes: int
    mime_type: str
    uploaded_at: datetime

    class Config:
        from_attributes = True

# Answer Schemas
class AnswerBase(BaseModel):
    content: str

class AnswerCreate(AnswerBase):
    question_id: int
    is_solution: bool = False

class AnswerUpdate(BaseModel):
    content: str

class AnswerOut(AnswerBase):
    id: int
    question_id: int
    author_id: int
    author: UserOut
    is_accepted: bool
    is_solution: bool = False
    score: int
    created_at: datetime
    comments: List[CommentOut] = []
    attachments: List[AttachmentOut] = []

    class Config:
        from_attributes = True

# Question Schemas
class QuestionBase(BaseModel):
    title: str
    content: str

class QuestionCreate(QuestionBase):
    tags: List[str] = []
    category: Optional[str] = None

class QuestionUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    is_solved: Optional[bool] = None

class QuestionOut(QuestionBase):
    id: int
    slug: str
    author_id: int
    author: UserOut
    score: int
    views: int
    is_solved: bool
    category: Optional[str] = None
    status: Optional[str] = None
    created_at: datetime
    tags: List[TagOut] = []

    class Config:
        from_attributes = True

class QuestionDetailOut(QuestionOut):
    answers: List[AnswerOut] = []
    comments: List[CommentOut] = []
    attachments: List[AttachmentOut] = []

    class Config:
        from_attributes = True

# Vote Schemas
class VoteBase(BaseModel):
    value: int = Field(..., ge=-1, le=1) # 1 or -1

class VoteCreate(VoteBase):
    question_id: Optional[int] = None
    answer_id: Optional[int] = None

class VoteOut(VoteBase):
    id: int
    user_id: int
    question_id: Optional[int] = None
    answer_id: Optional[int] = None

    class Config:
        from_attributes = True

# Badge Schemas
class BadgeOut(BaseModel):
    id: int
    name: str
    description: str
    tier: str
    points_required: int

    class Config:
        from_attributes = True

class UserBadgeOut(BaseModel):
    id: int
    user_id: int
    badge_id: int
    badge: BadgeOut
    awarded_at: datetime

    class Config:
        from_attributes = True

# Review Schemas
class ReviewCreate(BaseModel):
    author_name: str
    role_or_title: str
    review_text: str
    rating: int = Field(5, ge=1, le=5)

class ReviewOut(ReviewCreate):
    id: int
    is_visible: bool
    created_at: datetime
    user_id: Optional[int] = None
    user: Optional[UserOut] = None

    class Config:
        from_attributes = True

# OTP Schemas
class OTPRequest(BaseModel):
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    mode: Optional[str] = None

class OTPVerify(BaseModel):
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    code: str
