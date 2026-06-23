from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Table, UniqueConstraint, Index
from sqlalchemy.orm import relationship
from app.db.base_class import Base

# Question-Tag Association Table for M2M relationship
question_tag = Table(
    "question_tag",
    Base.metadata,
    Column("question_id", Integer, ForeignKey("question.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", Integer, ForeignKey("tag.id", ondelete="CASCADE"), primary_key=True),
)

class User(Base):
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    phone = Column(String(50), unique=True, index=True, nullable=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    display_name = Column(String(100), nullable=True)
    hashed_password = Column(String(255), nullable=True)
    reputation = Column(Integer, default=0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    role = Column(String(30), default="solution_seeker", nullable=False)  # solution_seeker, contributor, admin
    bio = Column(Text, nullable=True)
    education = Column(String(200), nullable=True)
    higher_edu = Column(String(200), nullable=True)
    resume_url = Column(String(512), nullable=True)
    profile_pic_url = Column(String(512), nullable=True)
    avatar_url = Column(String(512), nullable=True)
    github_url = Column(String(255), nullable=True)
    linkedin_url = Column(String(255), nullable=True)
    is_verified = Column(Boolean, default=False, nullable=False)
    onboarding_done = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Notification preferences & admin moderation
    email_answer = Column(Boolean, default=True, nullable=False)
    email_accepted = Column(Boolean, default=True, nullable=False)
    email_digest = Column(Boolean, default=True, nullable=False)
    push_enabled = Column(Boolean, default=False, nullable=False)
    ban_reason = Column(String(255), nullable=True)

    # Relationships
    questions = relationship("Question", back_populates="author", cascade="all, delete-orphan")
    answers = relationship("Answer", back_populates="author", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="author", cascade="all, delete-orphan")
    badges = relationship("UserBadge", back_populates="user", cascade="all, delete-orphan")
    votes = relationship("Vote", back_populates="user", cascade="all, delete-orphan")
    saved_questions = relationship("SavedQuestion", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

class Tag(Base):
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, index=True, nullable=False)
    slug = Column(String(50), unique=True, index=True, nullable=False)

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

class Question(Base):
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, index=True, nullable=False)
    content = Column(Text, nullable=False)
    category = Column(String(100), nullable=True)
    status = Column(String(20), default="open", nullable=False)  # open, in_progress, solved, closed
    author_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False)
    score = Column(Integer, default=0, nullable=False)
    views = Column(Integer, default=0, nullable=False)
    is_solved = Column(Boolean, default=False, nullable=False)
    is_pinned = Column(Boolean, default=False, nullable=False)
    is_featured = Column(Boolean, default=False, nullable=False)
    deleted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    author = relationship("User", back_populates="questions")
    tags = relationship("Tag", secondary=question_tag)
    answers = relationship("Answer", back_populates="question", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="question", cascade="all, delete-orphan")
    attachments = relationship("Attachment", back_populates="question", cascade="all, delete-orphan")
    saved_by = relationship("SavedQuestion", back_populates="question", cascade="all, delete-orphan")
    votes = relationship("Vote", back_populates="question", cascade="all, delete-orphan")

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

class Answer(Base):
    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text, nullable=False)
    question_id = Column(Integer, ForeignKey("question.id", ondelete="CASCADE"), nullable=False)
    author_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False)
    is_accepted = Column(Boolean, default=False, nullable=False)
    is_solution = Column(Boolean, default=False, nullable=False)
    score = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    author = relationship("User", back_populates="answers")
    question = relationship("Question", back_populates="answers")
    comments = relationship("Comment", back_populates="answer", cascade="all, delete-orphan")
    attachments = relationship("Attachment", back_populates="answer", cascade="all, delete-orphan")
    votes = relationship("Vote", back_populates="answer", cascade="all, delete-orphan")

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

class Comment(Base):
    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text, nullable=False)
    author_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False)
    question_id = Column(Integer, ForeignKey("question.id", ondelete="CASCADE"), nullable=True)
    answer_id = Column(Integer, ForeignKey("answer.id", ondelete="CASCADE"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    author = relationship("User", back_populates="comments")
    question = relationship("Question", back_populates="comments")
    answer = relationship("Answer", back_populates="comments")

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

class Badge(Base):
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, index=True, nullable=False)
    description = Column(String(255), nullable=False)
    tier = Column(String(20), nullable=False) # bronze, silver, gold, platinum
    points_required = Column(Integer, default=0, nullable=False)

class UserBadge(Base):
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False)
    badge_id = Column(Integer, ForeignKey("badge.id", ondelete="CASCADE"), nullable=False)
    awarded_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", back_populates="badges")
    badge = relationship("Badge")

class Vote(Base):
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False)
    question_id = Column(Integer, ForeignKey("question.id", ondelete="CASCADE"), nullable=True)
    answer_id = Column(Integer, ForeignKey("answer.id", ondelete="CASCADE"), nullable=True)
    value = Column(Integer, nullable=False) # 1 (upvote) or -1 (downvote)

    # Relationships
    user = relationship("User", back_populates="votes")
    question = relationship("Question", back_populates="votes")
    answer = relationship("Answer", back_populates="votes")

    __table_args__ = (
        UniqueConstraint('user_id', 'question_id', name='uq_user_question_vote'),
        UniqueConstraint('user_id', 'answer_id', name='uq_user_answer_vote'),
    )

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

class SavedQuestion(Base):
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False)
    question_id = Column(Integer, ForeignKey("question.id", ondelete="CASCADE"), nullable=False)
    saved_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", back_populates="saved_questions")
    question = relationship("Question", back_populates="saved_by")

    __table_args__ = (
        UniqueConstraint('user_id', 'question_id', name='uq_user_saved_question'),
    )

class Attachment(Base):
    id = Column(Integer, primary_key=True, index=True)
    file_name = Column(String(255), nullable=False)
    file_url = Column(String(512), nullable=False)
    size_bytes = Column(Integer, nullable=False)
    mime_type = Column(String(100), nullable=False)
    question_id = Column(Integer, ForeignKey("question.id", ondelete="CASCADE"), nullable=True)
    answer_id = Column(Integer, ForeignKey("answer.id", ondelete="CASCADE"), nullable=True)
    uploaded_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    question = relationship("Question", back_populates="attachments")
    answer = relationship("Answer", back_populates="attachments")

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

class Notification(Base):
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False)
    type = Column(String(50), nullable=False) # badge, answer, accept, comment, reputation
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False, nullable=False)
    link = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", back_populates="notifications")

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

class Review(Base):
    id = Column(Integer, primary_key=True, index=True)
    author_name = Column(String(100), nullable=False)
    role_or_title = Column(String(100), nullable=False)
    review_text = Column(Text, nullable=False)
    rating = Column(Integer, default=5, nullable=False)
    is_visible = Column(Boolean, default=True, nullable=False)
    user_id = Column(Integer, ForeignKey("user.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User")

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

class FeaturedSolution(Base):
    id = Column(Integer, primary_key=True, index=True)
    question_id = Column(Integer, ForeignKey("question.id", ondelete="CASCADE"), nullable=False)
    display_order = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    question = relationship("Question")

class PortfolioContent(Base):
    id = Column(Integer, primary_key=True, index=True)
    section = Column(String(50), nullable=False) # e.g. 'about', 'skills', 'projects', 'achievements', 'training', 'hero'
    key = Column(String(100), nullable=False)
    value_json = Column(Text, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint('section', 'key', name='uq_section_key'),
    )

class Report(Base):
    id = Column(Integer, primary_key=True, index=True)
    content_type = Column(String(20), nullable=False) # question, answer
    content_id = Column(Integer, nullable=False)
    reporter_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False)
    reason = Column(Text, nullable=False)
    status = Column(String(20), default="pending", nullable=False) # pending, resolved, dismissed
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    reporter = relationship("User")

    def __init__(self, **kwargs):
        super().__init__(**kwargs)


class CommunityConfig(Base):
    """Singleton-style platform settings for Embedded Collective."""
    id = Column(Integer, primary_key=True, index=True)
    community_name = Column(String(200), default="Embedded Collective", nullable=False)
    community_tagline = Column(String(500), default="Connect. Debug. Collaborate.", nullable=False)
    join_mode = Column(String(20), default="open", nullable=False)  # open, invite, approval
    allow_google_oauth = Column(Boolean, default=True, nullable=False)
    allow_otp_login = Column(Boolean, default=True, nullable=False)
    allow_anonymous_browse = Column(Boolean, default=False, nullable=False)
    email_notifications = Column(Boolean, default=True, nullable=False)
    public_leaderboard = Column(Boolean, default=True, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class QuestionView(Base):
    id = Column(Integer, primary_key=True, index=True)
    question_id = Column(Integer, ForeignKey("question.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=True)
    ip_address = Column(String(45), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
