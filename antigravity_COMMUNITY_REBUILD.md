# CURSOR PROMPT — EMBEDDED COLLECTIVE: COMPLETE COMMUNITY REBUILD
## Full rebuild from ground up. Zero placeholders. Zero mocks. Production-ready.

---

## IMMUTABLE PROJECT CONTEXT

```
Harit_Portfolio/
├── frontend/
│   ├── public/videos/New_hero_intro.mp4   ← hero video (keep)
│   ├── public/audio/ambient_lab.mp3       ← ambient audio (keep)
│   └── src/
│       ├── components/                    ← portfolio sections (DO NOT BREAK)
│       ├── context/                       ← AuthContext, ThemeContext (extend, don't replace)
│       ├── services/                      ← API helpers (refactor as needed)
│       └── data/content.ts               ← portfolio copy (DO NOT TOUCH)
├── backend/
│   └── app/
│       ├── api/endpoints/                 ← auth.py, questions.py, uploads.py, admin.py
│       ├── models/                        ← SQLAlchemy models (rebuild)
│       ├── services/                      ← email, OTP services (rebuild)
│       └── db/seed.py                    ← dev seed data (rebuild)
├── .run/email_previews/                   ← existing HTML email template (use as design base)
└── run.sh / scripts/                      ← keep all scripts working
```

**Stack (fixed — do not change):**
Frontend: React 18 · Vite · TypeScript · Tailwind CSS · Framer Motion · GSAP · Three.js
Backend: FastAPI · SQLAlchemy async · Redis · SQLite (dev) / PostgreSQL (prod)
API base: `/api/v1` (Vite proxy → `http://127.0.0.1:8000`)
Uploads served at: `/uploads/static/{file}`
SMTP sender: `herry.pvt.hm@gmail.com` (Gmail App Password — read from `SMTP_PASSWORD` env var)

**Non-negotiable rules for every line of code:**
- Zero placeholder text, zero TODO, zero mock data, zero `console.log("TODO")`, zero disabled buttons that "will work later"
- Every button does something real. Every form submits to a real endpoint. Every list loads real data.
- After writing each module, test it end-to-end before moving on
- Portfolio sections (Hero, About, Skills, Experience, Projects, Achievements, Contact, Footer) must remain 100% intact

---

## PHASE 0 — DATABASE SCHEMA (build this first, everything else depends on it)

Delete `backend/app/models/` contents and rebuild completely. Use SQLAlchemy async ORM. Create `backend/app/models/__init__.py` and individual model files.

### `backend/app/models/user.py`

```python
class UserRole(str, enum.Enum):
    SOLUTION_SEEKER = "solution_seeker"
    CONTRIBUTOR     = "contributor"
    ADMIN           = "admin"

class User(Base):
    __tablename__ = "users"

    id               = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    email            = Column(String(255), unique=True, nullable=False, index=True)
    phone            = Column(String(20), unique=True, nullable=True)   # OPTIONAL
    display_name     = Column(String(80),  nullable=False)
    username         = Column(String(40),  unique=True, nullable=False, index=True)
    password_hash    = Column(String(255), nullable=True)   # null = OAuth-only users
    role             = Column(Enum(UserRole), default=UserRole.SOLUTION_SEEKER, nullable=False)
    google_id        = Column(String(128), unique=True, nullable=True)

    # Profile
    avatar_url       = Column(String(512), nullable=True)
    cover_url        = Column(String(512), nullable=True)
    bio              = Column(Text,        nullable=True)
    location         = Column(String(120), nullable=True)
    skills           = Column(JSON,        nullable=True)   # ["UART","ARM7","C"]
    interests        = Column(JSON,        nullable=True)
    github_url       = Column(String(512), nullable=True)
    linkedin_url     = Column(String(512), nullable=True)
    website_url      = Column(String(512), nullable=True)

    # Stats (denormalized for speed)
    reputation       = Column(Integer, default=0, nullable=False)
    post_count       = Column(Integer, default=0, nullable=False)
    solution_count   = Column(Integer, default=0, nullable=False)
    follower_count   = Column(Integer, default=0, nullable=False)
    following_count  = Column(Integer, default=0, nullable=False)

    # Contributor ranking (10 levels)
    level            = Column(Integer, default=1, nullable=False)   # 1–10
    level_label      = Column(String(40), default="SIGNAL_NOISE")

    # Status
    is_active        = Column(Boolean, default=True)
    is_verified      = Column(Boolean, default=False)
    is_banned        = Column(Boolean, default=False)
    ban_reason       = Column(Text, nullable=True)
    onboarding_done  = Column(Boolean, default=False)
    email_verified   = Column(Boolean, default=False)

    created_at       = Column(DateTime(timezone=True), server_default=func.now())
    updated_at       = Column(DateTime(timezone=True), onupdate=func.now())
    last_active_at   = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    posts            = relationship("Post", back_populates="author",   foreign_keys="Post.author_id")
    comments         = relationship("Comment", back_populates="author")
    notifications    = relationship("Notification", back_populates="recipient", foreign_keys="Notification.recipient_id")
    followers        = relationship("Follow", foreign_keys="Follow.following_id", back_populates="following")
    following        = relationship("Follow", foreign_keys="Follow.follower_id",  back_populates="follower")
```

### `backend/app/models/post.py`

```python
class PostType(str, enum.Enum):
    PROBLEM     = "problem"      # solution seeker asks
    SOLUTION    = "solution"     # contributor answers
    DISCUSSION  = "discussion"   # open discussion
    ARTICLE     = "article"      # contributor educational content

class PostStatus(str, enum.Enum):
    OPEN        = "open"
    IN_PROGRESS = "in_progress"
    SOLVED      = "solved"
    CLOSED      = "closed"

class PostCategory(str, enum.Enum):
    SOFTWARE    = "Software Problems"
    HARDWARE    = "Hardware Problems"
    PROGRAMMING = "Programming Issues"
    PROTOCOLS   = "Communication Protocols"
    OTHER       = "Other"

class Post(Base):
    __tablename__ = "posts"

    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    slug          = Column(String(220), unique=True, nullable=False, index=True)
    post_type     = Column(Enum(PostType),    default=PostType.PROBLEM)
    category      = Column(Enum(PostCategory), nullable=False)
    status        = Column(Enum(PostStatus),  default=PostStatus.OPEN)

    title         = Column(String(300), nullable=False)
    body          = Column(Text,        nullable=False)
    tags          = Column(JSON,        nullable=True)   # ["uart","lpc2129","firmware"]

    # Counts (denormalized)
    like_count    = Column(Integer, default=0)
    comment_count = Column(Integer, default=0)
    view_count    = Column(Integer, default=0)
    share_count   = Column(Integer, default=0)
    save_count    = Column(Integer, default=0)
    vote_score    = Column(Integer, default=0)   # net upvotes – downvotes (frequency indicator)

    # Visibility
    is_featured   = Column(Boolean, default=False)
    is_pinned     = Column(Boolean, default=False)
    is_deleted    = Column(Boolean, default=False)

    author_id     = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    parent_id     = Column(UUID(as_uuid=True), ForeignKey("posts.id"),  nullable=True)  # solution → problem

    created_at    = Column(DateTime(timezone=True), server_default=func.now())
    updated_at    = Column(DateTime(timezone=True), onupdate=func.now())
    solved_at     = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    author        = relationship("User",       back_populates="posts", foreign_keys=[author_id])
    attachments   = relationship("Attachment", back_populates="post",  cascade="all, delete")
    comments      = relationship("Comment",    back_populates="post",  cascade="all, delete")
    parent        = relationship("Post",       remote_side="Post.id",  foreign_keys=[parent_id])
    solutions     = relationship("Post",       foreign_keys=[parent_id])
```

### Additional models (create all as separate files, no stubs):

`backend/app/models/comment.py`
```python
class Comment(Base):
    __tablename__ = "comments"
    id         = Column(UUID, primary_key=True, default=uuid4)
    body       = Column(Text, nullable=False)
    is_deleted = Column(Boolean, default=False)
    like_count = Column(Integer, default=0)
    author_id  = Column(UUID, ForeignKey("users.id"), nullable=False)
    post_id    = Column(UUID, ForeignKey("posts.id"),  nullable=False)
    parent_id  = Column(UUID, ForeignKey("comments.id"), nullable=True)  # reply thread
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    author     = relationship("User", back_populates="comments")
    post       = relationship("Post", back_populates="comments")
    replies    = relationship("Comment", foreign_keys=[parent_id])
```

`backend/app/models/interaction.py`
```python
class Like(Base):          # polymorphic: post or comment
    __tablename__ = "likes"
    id          = Column(UUID, primary_key=True, default=uuid4)
    user_id     = Column(UUID, ForeignKey("users.id"), nullable=False)
    target_type = Column(String(10), nullable=False)  # "post" | "comment"
    target_id   = Column(UUID, nullable=False)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())
    __table_args__ = (UniqueConstraint("user_id","target_type","target_id"),)

class Vote(Base):          # up/down for frequency scoring
    __tablename__ = "votes"
    id          = Column(UUID, primary_key=True, default=uuid4)
    user_id     = Column(UUID, ForeignKey("users.id"), nullable=False)
    post_id     = Column(UUID, ForeignKey("posts.id"), nullable=False)
    value       = Column(SmallInteger, nullable=False)   # +1 or -1 only
    created_at  = Column(DateTime(timezone=True), server_default=func.now())
    __table_args__ = (UniqueConstraint("user_id","post_id"),)

class Save(Base):
    __tablename__ = "saves"
    user_id    = Column(UUID, ForeignKey("users.id"), primary_key=True)
    post_id    = Column(UUID, ForeignKey("posts.id"), primary_key=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Follow(Base):
    __tablename__ = "follows"
    follower_id  = Column(UUID, ForeignKey("users.id"), primary_key=True)
    following_id = Column(UUID, ForeignKey("users.id"), primary_key=True)
    created_at   = Column(DateTime(timezone=True), server_default=func.now())
    follower     = relationship("User", foreign_keys=[follower_id],  back_populates="following")
    following    = relationship("User", foreign_keys=[following_id], back_populates="followers")
```

`backend/app/models/notification.py`
```python
class NotificationType(str, enum.Enum):
    LIKE         = "like"
    COMMENT      = "comment"
    REPLY        = "reply"
    FOLLOW       = "follow"
    MENTION      = "mention"
    SOLUTION     = "solution"
    POST_SOLVED  = "post_solved"
    BADGE        = "badge"
    SYSTEM       = "system"

class Notification(Base):
    __tablename__ = "notifications"
    id           = Column(UUID, primary_key=True, default=uuid4)
    type         = Column(Enum(NotificationType), nullable=False)
    title        = Column(String(120), nullable=False)
    body         = Column(String(300), nullable=False)
    link         = Column(String(512), nullable=True)
    is_read      = Column(Boolean, default=False)
    recipient_id = Column(UUID, ForeignKey("users.id"), nullable=False)
    actor_id     = Column(UUID, ForeignKey("users.id"), nullable=True)  # who triggered it
    created_at   = Column(DateTime(timezone=True), server_default=func.now())
    recipient    = relationship("User", foreign_keys=[recipient_id], back_populates="notifications")
    actor        = relationship("User", foreign_keys=[actor_id])
```

`backend/app/models/attachment.py`
```python
class Attachment(Base):
    __tablename__ = "attachments"
    id         = Column(UUID, primary_key=True, default=uuid4)
    url        = Column(String(512), nullable=False)
    filename   = Column(String(255), nullable=False)
    mime_type  = Column(String(80),  nullable=False)
    size_bytes = Column(Integer,     nullable=False)
    width      = Column(Integer,     nullable=True)   # for images
    height     = Column(Integer,     nullable=True)
    post_id    = Column(UUID, ForeignKey("posts.id"),  nullable=True)
    user_id    = Column(UUID, ForeignKey("users.id"),  nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    post       = relationship("Post", back_populates="attachments")
```

`backend/app/models/otp.py`
```python
class OTPCode(Base):
    __tablename__ = "otp_codes"
    id         = Column(UUID, primary_key=True, default=uuid4)
    contact    = Column(String(255), nullable=False, index=True)  # email or phone
    code_hash  = Column(String(255), nullable=False)              # bcrypt hash
    purpose    = Column(String(30),  nullable=False)              # "signup" | "login" | "reset"
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used_at    = Column(DateTime(timezone=True), nullable=True)
    attempts   = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
```

`backend/app/models/activity_log.py`
```python
class ActivityLog(Base):
    __tablename__ = "activity_logs"
    id         = Column(UUID, primary_key=True, default=uuid4)
    user_id    = Column(UUID, ForeignKey("users.id"), nullable=True)
    action     = Column(String(80),  nullable=False)    # "login","post_created","vote","ban"...
    target     = Column(String(120), nullable=True)     # e.g. "post:uuid" "user:uuid"
    ip_address = Column(String(45),  nullable=True)
    user_agent = Column(String(300), nullable=True)
    meta       = Column(JSON,        nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
```

`backend/app/models/featured_solution.py`
```python
class FeaturedSolution(Base):
    __tablename__ = "featured_solutions"
    id            = Column(UUID, primary_key=True, default=uuid4)
    post_id       = Column(UUID, ForeignKey("posts.id"), nullable=False)
    display_order = Column(Integer, default=0)
    post          = relationship("Post")
```

After writing all models, update `backend/app/db/seed.py` to seed:
- 3 dev users (admin/adminpassword, firmware_guru/password123, hardware_hacker/password123)
- 10 sample posts across all categories
- Sample comments, votes, follows
- Sample notifications
- 3 featured solutions (for portfolio "Problems I Solved" section)

---

## PHASE 1 — BACKEND API (complete, all endpoints working)

### `backend/app/api/endpoints/auth.py` — complete rewrite

```python
# ALL endpoints must be real. No stubs. Test each with curl before proceeding.

POST /auth/register
  Body: { email, password?, display_name, username, role, phone? }
  → Validate email not taken, username not taken
  → Hash password with bcrypt if provided
  → Create User (email_verified=False, onboarding_done=False)
  → Send welcome email + OTP verification email
  → Return { user, access_token, refresh_token }

POST /auth/login/password
  Body: { email, password }
  → Verify bcrypt hash
  → Check not banned
  → Update last_active_at
  → Log to activity_logs (action="login")
  → Return { user, access_token, refresh_token }

POST /auth/otp/send
  Body: { contact: email_or_phone, purpose: "signup"|"login"|"reset" }
  → Validate contact format
  → Reject disposable email domains
  → Generate 6-digit OTP, bcrypt hash, store in otp_codes (10 min TTL, max 5 sends/hr/contact via Redis)
  → Call email_service.send_otp(contact, otp, purpose)   ← real SMTP, not mock
  → Return { message: "Code sent" }   ← OTP NEVER in response body

POST /auth/otp/verify
  Body: { contact, code, purpose }
  → Fetch non-expired, non-used OTP row for contact+purpose
  → bcrypt.checkpw — max 5 attempts before lockout
  → Mark used_at, return { verified: true, token?: str }
  → For "login": issue JWT if user exists, else return needs_registration: true
  → For "signup": set Redis flag otp_verified:{contact}:signup = 1 (TTL 30 min)

POST /auth/google
  Body: { id_token }
  → Verify with Google tokeninfo API (httpx call, not library — verifies audience matches GOOGLE_CLIENT_ID)
  → Require email_verified: true in Google response
  → Upsert user (match on google_id, fallback email)
  → Return { user, access_token, refresh_token, is_new_user }

POST /auth/refresh
  Body: { refresh_token }
  → Verify JWT signature and expiry
  → Issue new access_token (15 min) + new refresh_token (30 days, rolling)

POST /auth/logout
  Header: Authorization: Bearer {token}
  → Blacklist refresh token in Redis (key: blacklist:{jti}, TTL = token remaining TTL)

POST /auth/password/reset/request
  Body: { email }
  → Send OTP with purpose="reset"

POST /auth/password/reset/confirm
  Body: { email, code, new_password }
  → Verify OTP → update password_hash → invalidate all sessions

GET  /auth/check-username/{username}
  → Return { available: bool }

POST /auth/onboarding
  Body: { display_name, username, bio?, role, skills?, avatar_url? }
  Requires: auth
  → Update user record, set onboarding_done=True
  → Send welcome email
  → Return updated user
```

### `backend/app/api/endpoints/posts.py` — complete rewrite

```python
GET  /posts
  Params: ?category&status&type&tag&sort[newest|popular|trending|top]&q&page&limit&author
  → LEFT JOIN votes for my_vote (if authenticated)
  → LEFT JOIN saves for is_saved
  → LEFT JOIN likes for is_liked
  → Include author with role, avatar_url, level, level_label
  → Include first 3 attachment URLs
  → Paginated { items, total, page, pages }

POST /posts
  Body: { title, body, category, post_type, tags, parent_id? }
  Requires: auth
  → Solution Seekers: only post_type="problem" or "discussion"
  → Contributors: any post_type
  → Auto-generate slug
  → Increment author.post_count
  → Create activity_log entry
  → Return full post

GET  /posts/{slug}
  → Increment view_count (idempotent: Redis key view:{post_id}:{user_ip} TTL 1hr)
  → Return full post with all comments, all attachments, author profile, solutions
  → Include my_vote, is_saved, is_liked for auth user

PATCH /posts/{slug}
  Requires: auth, author or admin
  → Update title, body, tags, category
  → Create activity_log entry

DELETE /posts/{slug}
  Requires: auth, author or admin
  → Soft delete: is_deleted=True
  → Do not actually remove from DB

POST /posts/{id}/like
  Requires: auth
  → Toggle Like row (Like target_type="post")
  → Increment/decrement post.like_count
  → If new like: create Notification(type=LIKE, recipient=post.author)
  → Return { liked: bool, count: int }

POST /posts/{id}/vote
  Requires: auth
  Body: { value: 1 | -1 | 0 }
  → Upsert Vote (value must be -1, 0, or +1 — reject others)
  → Update post.vote_score atomically
  → Update author reputation (+5 upvote, -2 downvote)
  → Return { score: int, my_vote: int }

POST /posts/{id}/save
  Requires: auth
  → Toggle Save row
  → Update post.save_count
  → Return { saved: bool, count: int }

POST /posts/{id}/share
  → Increment post.share_count (no auth required — share is public action)
  → Return { count: int, share_url: str }

POST /posts/{id}/report
  Requires: auth
  Body: { reason: str }
  → Create Report row
  → If post reaches 5 reports: notify admin via notification

POST /posts/{id}/accept-solution
  Requires: auth, must be the problem post's author
  Body: { solution_post_id: str }
  → Set problem status="solved", solved_at=now()
  → Set solution_post is_featured=True
  → Award solution author +25 reputation
  → Create notification for solution author
  → Trigger level recalculation for solution author
  → Return updated problem post
```

### `backend/app/api/endpoints/comments.py`

```python
GET  /posts/{post_id}/comments
  → Return threaded comments (top-level with replies nested)
  → Include author with avatar, role, level
  → Include is_liked for auth user

POST /posts/{post_id}/comments
  Requires: auth
  Body: { body, parent_id? }
  → Create Comment
  → Increment post.comment_count
  → Create Notification: if reply → notify parent comment author; else → notify post author
  → Scan body for @mentions → create MENTION notifications
  → Return new comment

PATCH /comments/{id}
  Requires: auth, must be comment author
  Body: { body }

DELETE /comments/{id}
  Requires: auth, comment author or admin
  → Soft delete: is_deleted=True, body="[deleted]"

POST /comments/{id}/like
  Requires: auth
  → Toggle Like (target_type="comment")
  → Return { liked: bool, count: int }
```

### `backend/app/api/endpoints/users.py`

```python
GET  /users/me
  Requires: auth
  → Full profile including private fields (email, phone, notification prefs)

PATCH /users/me
  Requires: auth
  Body: { display_name?, username?, bio?, location?, skills?, interests?,
          github_url?, linkedin_url?, website_url?, phone? }
  → Validate username uniqueness
  → Update user
  → Return updated user

PATCH /users/me/avatar
  Requires: auth
  Body: multipart/form-data file
  → Resize to 400×400 with Pillow
  → Upload to storage
  → Update user.avatar_url

PATCH /users/me/cover
  Requires: auth
  Body: multipart/form-data file
  → Resize to 1200×400 with Pillow
  → Upload to storage
  → Update user.cover_url

PATCH /users/me/role
  Requires: auth
  Body: { role: "solution_seeker" | "contributor" }
  → Instant role switch, no approval needed
  → Log to activity_logs
  → Return updated user

PATCH /users/me/password
  Requires: auth
  Body: { current_password, new_password }

GET  /users/{username}
  → Public profile
  → Contributor: show full profile (bio, skills, stats, level)
  → Seeker: show display_name, username, avatar, post_count only
  → Include: follower_count, following_count, is_following (if auth)
  → Include: recent_posts (last 6), level data

GET  /users/{username}/posts
  Params: ?type&page
  → Paginated posts by this user

GET  /users/leaderboard
  Params: ?period[week|month|all]&limit=20
  → Sort by reputation DESC
  → Include level, level_label, solution_count, follower_count

POST /users/{username}/follow
  Requires: auth
  → Toggle Follow row
  → Update follower_count, following_count on both users
  → Create FOLLOW notification
  → Return { following: bool, count: int }

GET  /users/me/feed
  Requires: auth
  → Posts from users the current user follows + own posts
  → Paginated, newest first

GET  /users/check/{username}
  → Return { available: bool }
```

### `backend/app/api/endpoints/notifications.py`

```python
GET  /notifications
  Requires: auth
  Params: ?unread_only&page&limit=20
  → Return notifications for current user, newest first
  → Include actor with avatar, username

GET  /notifications/count
  Requires: auth
  → Return { unread: int }

POST /notifications/{id}/read
  Requires: auth
  → Mark single notification as read

POST /notifications/read-all
  Requires: auth
  → Mark all as read

DELETE /notifications/{id}
  Requires: auth
```

### `backend/app/api/endpoints/search.py`

```python
GET /search
  Params: ?q&type[posts|users|tags]&category&page
  → Posts: ilike on title + body, ranked by relevance + recency
  → Users: ilike on username + display_name
  → Tags: ilike on tag name with usage count
  → Return { posts: [], users: [], tags: [] }

GET /search/suggest
  Params: ?q (min 2 chars)
  → Return up to 8 suggestions: 5 post titles + 3 usernames
  → Response in < 100ms (use LIMIT aggressively)
```

### `backend/app/api/endpoints/admin.py`

```python
# ALL routes: Depends(require_admin) — 403 for anyone else

GET  /admin/stats
  → {
      total_users, active_users_today, new_users_7d, new_users_30d,
      total_posts, total_comments, total_solutions, open_problems, solved_problems,
      total_views, total_likes, top_categories[5],
      daily_signups[30],   ← array of {date, count}
      daily_posts[30],
      avg_resolution_hours
    }

GET  /admin/users?search&role&is_banned&page
PATCH /admin/users/{id}   → change role, ban/unban, verify
DELETE /admin/users/{id}  → hard delete (irreversible, prompt confirmation)
GET  /admin/users/{id}/activity  → activity_logs for this user

GET  /admin/posts?status&category&is_deleted&page
PATCH /admin/posts/{id}   → feature, pin, delete, change status
DELETE /admin/posts/{id}  → hard delete

GET  /admin/reports?resolved&page
PATCH /admin/reports/{id} → { action: "dismiss"|"delete_content"|"ban_user" }

GET  /admin/featured-solutions
POST /admin/featured-solutions  → { post_ids: [str, str, str] }   (max 3, ordered)

GET  /admin/activity-logs?action&user_id&page

GET  /admin/email-logs?page   → log of all emails sent
```

### `backend/app/api/endpoints/uploads.py`

```python
POST /uploads/
  Params: ?post_id (optional)
  Requires: auth
  Body: multipart, field "file"
  Allowed: JPEG, PNG, GIF, WebP, PDF, ZIP, TXT — max 10MB
  → Save to backend/uploads/static/{uuid}_{filename}
  → If image: extract width, height with Pillow
  → Create Attachment row
  → If post_id: link to post
  → Return { id, url, filename, mime_type, width, height }

DELETE /uploads/{attachment_id}
  Requires: auth, must be uploader or admin
```

### `backend/app/api/endpoints/public.py` (no auth required)

```python
GET /stats/public
  → { total_posts, solved_posts, member_count, avg_rating }

GET /featured-solutions
  → Ordered list of up to 3 FeaturedSolution rows
  → Each enriched with: post title, slug, category, solution excerpt, asker avatar, asker username, star_rating

GET /config
  → { google_client_id: str|null }   ← frontend reads this to know if Google login is available
```

### `backend/app/services/email_service.py` — REAL SMTP, NO MOCK

```python
"""
SMTP configuration:
  SMTP_HOST = smtp.gmail.com
  SMTP_PORT = 587
  SMTP_USER = herry.pvt.hm@gmail.com
  SMTP_PASSWORD = {Gmail App Password from .env}
  SMTP_FROM = Embedded Collective <herry.pvt.hm@gmail.com>

In development (ENVIRONMENT=development):
  - Always log OTP to terminal with yellow color
  - Save HTML preview to .run/email_previews/{email}_latest.html
  - Attempt SMTP if configured; if not configured, dev mode = success

In production (ENVIRONMENT=production):
  - SMTP must be configured or service raises startup error
  - All emails must deliver successfully or raise exception for retry
"""

import smtplib, ssl, secrets, logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path
from datetime import datetime
from app.core.config import settings

logger = logging.getLogger(__name__)

# ── EMAIL TEMPLATES ──────────────────────────────────────────────────────────

def _base_html(content: str) -> str:
    """Branded base email wrapper — dark theme matching the portfolio."""
    return f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  *{{box-sizing:border-box;margin:0;padding:0}}
  body{{background:#0a0a0a;color:#f0f0f0;font-family:'Courier New',monospace;padding:0}}
  .wrap{{max-width:600px;margin:0 auto;padding:40px 20px}}
  .logo{{display:flex;align-items:center;gap:10px;margin-bottom:32px}}
  .logo-icon{{width:36px;height:36px;background:#C0192C;border-radius:8px;
              display:flex;align-items:center;justify-content:center;
              font-size:18px;color:#fff;font-weight:bold}}
  .logo-text{{font-size:16px;font-weight:bold;color:#f0f0f0;letter-spacing:2px}}
  .logo-sub{{font-size:10px;color:#A0A0A0;letter-spacing:3px;margin-top:2px}}
  .card{{background:rgba(255,255,255,0.04);border:1px solid rgba(192,25,44,0.25);
          border-radius:16px;padding:32px;margin-bottom:24px}}
  h1{{font-size:24px;color:#f0f0f0;margin-bottom:16px;line-height:1.3}}
  p{{color:#A0A0A0;line-height:1.8;margin-bottom:16px;font-size:14px}}
  .otp-box{{background:#000;border:1px solid #C0192C;border-radius:12px;
             padding:24px;text-align:center;margin:24px 0}}
  .otp-code{{font-size:42px;letter-spacing:12px;color:#fff;font-weight:bold;
              font-family:'Courier New',monospace}}
  .otp-timer{{color:#A0A0A0;font-size:12px;margin-top:8px}}
  .cta{{display:inline-block;background:#C0192C;color:#fff;padding:14px 32px;
         border-radius:8px;text-decoration:none;font-size:14px;
         letter-spacing:1px;margin-top:8px;font-weight:bold}}
  .divider{{border:none;border-top:1px solid rgba(192,25,44,0.2);margin:20px 0}}
  .footer{{color:#555;font-size:11px;text-align:center;margin-top:24px;line-height:1.6}}
  .tag{{display:inline-block;background:rgba(192,25,44,0.15);
         border:1px solid rgba(192,25,44,0.3);border-radius:6px;
         padding:2px 8px;font-size:11px;color:#C0192C;margin:2px}}
  .warn{{background:rgba(251,191,36,0.08);border:1px solid rgba(251,191,36,0.3);
          border-radius:8px;padding:12px 16px;font-size:12px;color:#FCD34D}}
</style></head>
<body><div class="wrap">
  <div class="logo">
    <div class="logo-icon">⬡</div>
    <div><div class="logo-text">EMBEDDED COLLECTIVE</div>
    <div class="logo-sub">HARIT MANDALIYA</div></div>
  </div>
  {content}
  <div class="footer">
    © {datetime.now().year} Harit Mandaliya · haritmandaliya@gmail.com<br>
    ARM7 · LPC2129 · UART · SPI · I2C · CAN · Linux Embedded Systems<br>
    <a href="http://127.0.0.1:5173/community" style="color:#C0192C;text-decoration:none">
      Visit Embedded Collective
    </a>
  </div>
</div></body></html>"""

def otp_email_html(otp: str, purpose: str, name: str = "Engineer") -> str:
    purpose_label = {"signup": "Sign Up", "login": "Sign In", "reset": "Password Reset"}.get(purpose, "Verification")
    return _base_html(f"""
    <div class="card">
      <h1>Your {purpose_label} Code 🔐</h1>
      <p>Hello {name}, use this code to complete your {purpose_label.lower()}:</p>
      <div class="otp-box">
        <div class="otp-code">{otp}</div>
        <div class="otp-timer">⏱ Expires in 10 minutes</div>
      </div>
      <div class="warn">⚠ Never share this code. Embedded Collective will never ask for your OTP.</div>
      <hr class="divider">
      <p style="font-size:12px">If you didn't request this, you can safely ignore this email.</p>
    </div>""")

def welcome_email_html(name: str, username: str, role: str) -> str:
    return _base_html(f"""
    <div class="card">
      <h1>Welcome, {name}! 🎉</h1>
      <p>You've joined <strong style="color:#C0192C">Embedded Collective</strong> —
         the community where embedded engineers debug, solve, and build together.</p>
      <p>Your profile: <span style="color:#00F5FF">@{username}</span>
         &nbsp;·&nbsp; Role: <span style="color:#C0192C">{role.replace('_',' ').title()}</span></p>
      <hr class="divider">
      <p><strong>What you can do:</strong></p>
      <p>
        <span class="tag">Ask Problems</span>
        <span class="tag">Post Solutions</span>
        <span class="tag">Follow Engineers</span>
        <span class="tag">Earn Reputation</span>
      </p>
      <hr class="divider">
      <a href="http://127.0.0.1:5173/community" class="cta">EXPLORE THE COMMUNITY →</a>
    </div>""")

def contact_ack_html(sender_name: str, message_excerpt: str) -> str:
    return _base_html(f"""
    <div class="card">
      <h1>Message received, {sender_name} 👋</h1>
      <p>Thank you for reaching out. I've received your message and will respond shortly.</p>
      <hr class="divider">
      <p style="color:#777;font-size:12px"><em>Your message:</em></p>
      <p style="color:#C0C0C0;font-style:italic">"{message_excerpt}"</p>
      <hr class="divider">
      <p>While you wait, explore the community I built for embedded engineers:</p>
      <a href="http://127.0.0.1:5173/community" class="cta">VISIT EMBEDDED COLLECTIVE →</a>
    </div>""")

async def send_email(to: str, subject: str, html: str) -> bool:
    """Send email via SMTP. Falls back to dev log if SMTP not configured."""
    logger.warning(f"\n{'═'*55}\n📧 EMAIL → {to}\n📌 {subject}\n{'═'*55}")
    preview_dir = Path(".run/email_previews")
    preview_dir.mkdir(parents=True, exist_ok=True)
    safe = to.replace("@","_at_").replace(".","_")
    (preview_dir / f"{safe}_latest.html").write_text(html)

    if not settings.SMTP_HOST or not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.info("ℹ SMTP not configured — email logged above only.")
        return True

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"]    = settings.SMTP_FROM or f"Embedded Collective <{settings.SMTP_USER}>"
        msg["To"]      = to
        msg.attach(MIMEText(html, "html"))
        ctx = ssl.create_default_context()
        with smtplib.SMTP(settings.SMTP_HOST, int(settings.SMTP_PORT or 587)) as s:
            s.ehlo(); s.starttls(context=ctx); s.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            s.sendmail(settings.SMTP_USER, to, msg.as_string())
        logger.info(f"✅ Email delivered to {to}")
        return True
    except Exception as e:
        logger.error(f"❌ SMTP error: {e}")
        return settings.ENVIRONMENT == "development"

async def send_otp_email(to: str, otp: str, purpose: str, name: str = "Engineer"):
    html = otp_email_html(otp, purpose, name)
    subj = {"signup":"Verify your email","login":"Sign in code","reset":"Reset your password"}.get(purpose,"OTP Code")
    return await send_email(to, f"[Embedded Collective] {subj}: {otp}", html)

async def send_welcome_email(to: str, name: str, username: str, role: str):
    return await send_email(to, "Welcome to Embedded Collective! 🎉", welcome_email_html(name, username, role))

async def send_contact_ack(to: str, sender_name: str, message: str):
    return await send_email(to, "Thanks for reaching out — Harit Mandaliya", contact_ack_html(sender_name, message[:200]))
```

### Ranking service — `backend/app/services/ranking_service.py`

```python
"""
10 Contributor Levels.
Level up = based on (A) total accepted solutions + (B) frequent-problem solutions.
A "frequent problem" = any post with vote_score >= 10 (many engineers share the issue).
Level 10 requires: 100 total solutions AND 50 frequent-problem solutions.
"""

LEVELS = [
    # (level, label,            min_total, min_frequent)
    (1,  "SIGNAL_NOISE",           0,    0),
    (2,  "GPIO_PIONEER",           5,    0),
    (3,  "UART_ENGINEER",         10,    2),
    (4,  "BUS_DEBUGGER",          20,    5),
    (5,  "PROTOCOL_EXPERT",       35,   10),
    (6,  "FIRMWARE_CRAFTSMAN",    50,   15),
    (7,  "SYSTEM_ARCHITECT",      65,   25),
    (8,  "SILICON_MASTER",        80,   35),
    (9,  "EMBEDDED_LEGEND",       90,   42),
    (10, "SILICON_GOD",          100,   50),
]

async def recalculate_level(user_id: str, db) -> dict:
    from app.models.post import Post
    from sqlalchemy import select, func

    total = await db.scalar(
        select(func.count(Post.id))
        .where(Post.author_id == user_id, Post.is_featured == True,
               Post.post_type == "solution", Post.is_deleted == False)
    )
    frequent = await db.scalar(
        select(func.count(Post.id))
        .join(Post.parent)  # join to the problem post
        .where(Post.author_id == user_id, Post.is_featured == True,
               Post.post_type == "solution", Post.parent.has(vote_score__gte=10))
    )
    total    = min(int(total or 0), 100)
    frequent = min(int(frequent or 0), 50)

    current = LEVELS[0]
    for lvl in LEVELS:
        if total >= lvl[2] and frequent >= lvl[3]:
            current = lvl

    idx  = LEVELS.index(current)
    nxt  = LEVELS[idx + 1] if idx < len(LEVELS) - 1 else None

    return {
        "level": current[0], "label": current[1],
        "total_solutions": total, "frequent_solutions": frequent,
        "next_level": nxt[0] if nxt else None, "next_label": nxt[1] if nxt else None,
        "progress_total":    total    / (nxt[2] if nxt else 100),
        "progress_frequent": frequent / max(nxt[3] if nxt else 50, 1),
        "next_needs_total":    nxt[2] if nxt else 100,
        "next_needs_frequent": nxt[3] if nxt else 50,
    }

async def update_user_level(user_id: str, db):
    from app.models.user import User
    from sqlalchemy import update
    data = await recalculate_level(user_id, db)
    await db.execute(
        update(User).where(User.id == user_id)
        .values(level=data["level"], level_label=data["label"])
    )
    return data
```

---

## PHASE 2 — FRONTEND COMMUNITY REBUILD

Delete all existing community page components and rebuild from scratch.
Keep: `context/AuthContext.tsx`, `context/ThemeContext.tsx`, portfolio components in `components/`.
Create: `frontend/src/community/` directory with the following structure:

```
frontend/src/community/
├── components/
│   ├── CommunityNav.tsx         ← top navigation for all /community/* pages
│   ├── PostCard.tsx             ← the main feed card (Instagram-inspired)
│   ├── PostCardSkeleton.tsx     ← loading skeleton matching PostCard layout
│   ├── Avatar.tsx               ← user avatar with initials fallback
│   ├── LevelBadge.tsx           ← contributor level display
│   ├── VoteWidget.tsx           ← ↑ score ↓ with correct toggle logic
│   ├── StarRating.tsx           ← star display (portfolio section + reviews)
│   ├── CategoryChip.tsx         ← category tag
│   ├── StatusChip.tsx           ← post status badge
│   ├── ContributorTag.tsx       ← "CONTRIBUTOR" cyan badge
│   ├── AuthModal.tsx            ← login / signup modal
│   ├── NotificationDropdown.tsx ← bell icon + notification list
│   ├── SearchSpotlight.tsx      ← Cmd+K full-screen search
│   ├── Toast.tsx + ToastContext ← toast notification system
│   ├── DropZone.tsx             ← file upload with real drag-and-drop
│   ├── ImageCarousel.tsx        ← multi-image carousel with lightbox
│   ├── CommentThread.tsx        ← threaded comments with replies
│   ├── MarkdownEditor.tsx       ← textarea + preview toggle for body
│   └── PageTransition.tsx       ← Framer Motion route transition wrapper
├── pages/
│   ├── CommunityLanding.tsx     ← /community (feed + hero)
│   ├── PostDetail.tsx           ← /community/p/:slug
│   ├── AskQuestion.tsx          ← /community/ask
│   ├── UserProfile.tsx          ← /community/u/:username
│   ├── Settings.tsx             ← /community/settings
│   ├── Leaderboard.tsx          ← /community/leaderboard
│   ├── KnowledgeBase.tsx        ← /community/kb
│   └── AdminDashboard.tsx       ← /community/admin (keep, improve)
├── hooks/
│   ├── usePosts.ts              ← data fetching + infinite scroll
│   ├── useAuth.ts               ← re-export from context
│   ├── useNotifications.ts      ← polling + state
│   └── useInfiniteScroll.ts     ← IntersectionObserver-based load-more
└── services/
    └── api.ts                   ← typed API client (fetch wrapper, auto-refresh token)
```

### Design System — apply to ALL community components

```css
/* Community-specific additions to index.css */

/* Instagram-inspired card */
.post-card {
  background: var(--card-bg, var(--glass-bg));
  border: 1px solid var(--card-border, var(--glass-border));
  border-radius: 16px;
  overflow: hidden;
  transition: box-shadow 0.2s, border-color 0.2s;
}
.post-card:hover {
  border-color: rgba(192, 25, 44, 0.35);
  box-shadow: 0 4px 32px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(192, 25, 44, 0.1);
}

/* Light mode card */
[data-theme="light"] .post-card {
  background: #FFFFFF;
  border-color: rgba(0, 0, 0, 0.07);
  box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.04);
}
[data-theme="light"] .post-card:hover {
  border-color: rgba(192, 25, 44, 0.25);
  box-shadow: 0 4px 20px rgba(0,0,0,0.08);
}

/* All inputs — both themes */
.input-field {
  width: 100%;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: 10px;
  padding: 11px 14px;
  color: var(--text-primary);
  font-family: inherit;
  font-size: 14px;
  transition: border-color 0.15s, box-shadow 0.15s;
  outline: none;
}
.input-field:focus {
  border-color: var(--red-core);
  box-shadow: 0 0 0 3px rgba(192, 25, 44, 0.1);
}
.input-field::placeholder { color: var(--text-secondary); opacity: 0.6; }

[data-theme="light"] .input-field {
  background: #FFFFFF;
  border-color: rgba(0,0,0,0.12);
  color: #0A0A0B;
}
[data-theme="light"] .input-field::placeholder { color: #9CA3AF; }

/* Code blocks — ALWAYS dark */
pre, code, .code-block {
  background: #1E1E2E !important;
  color:      #CDD6F4 !important;
  border-radius: 8px;
}
```

### `frontend/src/community/services/api.ts` — typed API client

```typescript
// Typed fetch wrapper: auto-attaches JWT, auto-refreshes on 401, handles errors

const BASE = "/api/v1"

class ApiError extends Error {
  constructor(public status: number, message: string, public data?: any) {
    super(message)
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("ec_access_token")
  const headers: Record<string, string> = {
    ...(init.body && !(init.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...init.headers as Record<string, string>,
  }

  let res = await fetch(`${BASE}${path}`, { ...init, headers })

  // Auto-refresh on 401
  if (res.status === 401 && localStorage.getItem("ec_refresh_token")) {
    const refreshed = await fetch(`${BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: localStorage.getItem("ec_refresh_token") }),
    })
    if (refreshed.ok) {
      const { access_token } = await refreshed.json()
      localStorage.setItem("ec_access_token", access_token)
      headers.Authorization = `Bearer ${access_token}`
      res = await fetch(`${BASE}${path}`, { ...init, headers })
    } else {
      // Refresh failed — log out
      localStorage.removeItem("ec_access_token")
      localStorage.removeItem("ec_refresh_token")
      window.dispatchEvent(new Event("auth:logout"))
    }
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new ApiError(res.status, data.detail || res.statusText, data)
  }
  return res.json() as Promise<T>
}

export const api = {
  get:    <T>(path: string) => request<T>(path),
  post:   <T>(path: string, body?: any) =>
            request<T>(path, { method: "POST", body: body instanceof FormData ? body : JSON.stringify(body) }),
  patch:  <T>(path: string, body: any) =>
            request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  upload: <T>(path: string, file: File, extra?: Record<string, string>) => {
    const fd = new FormData()
    fd.append("file", file)
    if (extra) Object.entries(extra).forEach(([k,v]) => fd.append(k, v))
    return request<T>(path, { method: "POST", body: fd })
  },
}
```

### `CommunityNav.tsx`

```tsx
// Sticky top nav for all /community/* pages
// Left:   ⬡ logo → /community
// Center: Search bar (click or Cmd+K opens SearchSpotlight)
// Right:  [Bell 🔔] [☀/☾] [Avatar ▾ | Join Free]

// When logged in — show:
//   "Welcome, {firstName}!" greeting text in top strip (24px tall, above nav, bg-[--red-core]/8)
//   Avatar dropdown: My Profile, My Posts, Settings, Switch Role, Logout
// When logged out — show:
//   [Sign In] glass button + [Join Free] red filled button

// Greeting strip (only on /community index, disappears on scroll past 100px):
{user && location.pathname === '/community' && !scrolledPast && (
  <div className="w-full h-6 bg-[--red-core]/8 border-b border-[--red-core]/15
                  flex items-center justify-center">
    <span className="font-mono text-xs text-[--red-core] tracking-wider">
      // WELCOME_BACK · @{user.username}
    </span>
  </div>
)}

// Role switcher in avatar dropdown:
<button onClick={() => switchRole()}>
  Switch to {user.role === 'contributor' ? 'Solution Seeker' : 'Contributor'} mode
</button>
// → PATCH /users/me/role, update context, show success toast
```

### `PostCard.tsx` — Instagram-inspired, complete implementation

```tsx
interface PostCardProps {
  post: Post
  currentUser: User | null
  onLike: (id: string) => void
  onSave: (id: string) => void
  onClick: () => void   // navigate to /community/p/:slug
}

// CARD LAYOUT:
//
// ┌─────────────────────────────────────────────────────────┐
// │ [IMAGES — if any, full-width, carousel or grid]         │
// │ [Category badge overlay top-left]                       │
// │ [Status badge overlay top-right]                        │
// ├─────────────────────────────────────────────────────────┤
// │ [Category+Status chips — only if NO images]             │
// │                                                         │
// │ Post Title (font-heading, hover: red glow)             │
// │                                                         │
// │ Body excerpt (2 lines, font-body text-sm text-secondary)│
// │                                                         │
// │ #tag1 #tag2 #tag3  (cyan, font-mono text-xs)           │
// │                                                         │
// ├─────────────────────────────────────────────────────────┤
// │ [Avatar] @username [CONTRIBUTOR?] · 3h ago              │
// │                                                         │
// │ [↑ score ↓]  [💬 12]  [👁 48]  [★ avg]  [Share] [Save]│
// └─────────────────────────────────────────────────────────┘

// Image section (if images exist):
{imageAttachments.length === 1 && (
  <div style={{ aspectRatio: '16/9' }} className="relative overflow-hidden bg-black">
    <img src={imageAttachments[0].url} className="w-full h-full object-cover" loading="lazy" />
  </div>
)}
{imageAttachments.length === 2 && (
  <div className="grid grid-cols-2 gap-0.5" style={{ aspectRatio: '16/9' }}>
    {imageAttachments.map(img => <img key={img.id} src={img.url} className="w-full h-full object-cover" />)}
  </div>
)}
{imageAttachments.length >= 3 && (
  <div className="grid grid-cols-2 gap-0.5" style={{ aspectRatio: '16/9' }}>
    <img src={imageAttachments[0].url} className="w-full h-full object-cover" />
    <div className="grid grid-rows-2 gap-0.5">
      <img src={imageAttachments[1].url} className="w-full h-full object-cover" />
      <div className="relative">
        <img src={imageAttachments[2].url} className="w-full h-full object-cover" />
        {imageAttachments.length > 3 && (
          <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
            <span className="font-heading text-xl text-white">+{imageAttachments.length - 3}</span>
          </div>
        )}
      </div>
    </div>
  </div>
)}

// No-image card: colored left border by category
const CATEGORY_ACCENT: Record<string, string> = {
  "Software Problems":      "#6366F1",
  "Hardware Problems":      "#F59E0B",
  "Programming Issues":     "#22C55E",
  "Communication Protocols":"#00F5FF",
  "Other":                  "#A0A0A0",
}
// border-l-4 with inline style {{ borderLeftColor: CATEGORY_ACCENT[post.category] }}

// Popularity score (star-based — only stars, no numbers):
// Uses post.vote_score to determine star fill: 0-2=1★, 3-6=2★, 7-12=3★, 13-20=4★, 21+=5★
function popularityStars(score: number): number {
  if (score >= 21) return 5
  if (score >= 13) return 4
  if (score >= 7)  return 3
  if (score >= 3)  return 2
  return Math.max(1, Math.ceil(score / 2))
}
```

### `VoteWidget.tsx` — correct logic

```tsx
// ↑ SCORE ↓ — vertical layout matching the image in the requirements
// Each user: +1 or -1 only. Click same direction = remove vote. Click opposite = switch.
// Score shows net frequency across all users — it's a problem commonality indicator.

function VoteWidget({ post, currentUser, onVote }) {
  const [score,    setScore]    = useState(post.vote_score)
  const [myVote,   setMyVote]   = useState<1|-1|0>(post.my_vote ?? 0)
  const [loading,  setLoading]  = useState(false)

  const vote = async (val: 1 | -1) => {
    if (!currentUser) { openAuthModal(); return }
    const newVal: 1|-1|0 = myVote === val ? 0 : val  // toggle off if same
    const delta = newVal - myVote
    setScore(s => s + delta)   // optimistic
    setMyVote(newVal)
    setLoading(true)
    try {
      const res = await api.post(`/posts/${post.id}/vote`, { value: newVal })
      setScore(res.score)
      setMyVote(res.my_vote)
      onVote?.(res)
    } catch { setScore(s => s - delta); setMyVote(myVote) }
    finally  { setLoading(false) }
  }

  return (
    <div className="flex flex-col items-center gap-1.5 select-none">
      <motion.button whileTap={{ scale: 0.85 }} onClick={() => vote(1)} disabled={loading}
        className={`p-1.5 rounded-lg transition-colors ${myVote===1?'text-[--red-core] bg-[--red-core]/10':'text-[--text-secondary] hover:text-[--red-core] hover:bg-[--red-core]/8'}`}>
        <ChevronUp size={18} strokeWidth={myVote===1?3:2} />
      </motion.button>
      <span className={`font-mono text-sm font-bold tabular-nums ${score>0?'text-[--red-core]':score<0?'text-blue-400':'text-[--text-secondary]'}`}>
        {score}
      </span>
      <motion.button whileTap={{ scale: 0.85 }} onClick={() => vote(-1)} disabled={loading}
        className={`p-1.5 rounded-lg transition-colors ${myVote===-1?'text-blue-400 bg-blue-400/10':'text-[--text-secondary] hover:text-blue-400 hover:bg-blue-400/8'}`}>
        <ChevronDown size={18} strokeWidth={myVote===-1?3:2} />
      </motion.button>
    </div>
  )
}
```

### `AuthModal.tsx` — 3-tab, real OTP, Google

```tsx
// Tabs: [SIGN IN | SIGN UP]
// Sign In sub-tabs: [Continue with Google] [Email OTP]
// Sign Up flow: 3 steps
//   Step 1: Email (required) + Phone (optional, no OTP) + Role selection
//   Step 2: Email OTP verification (6 auto-advance boxes)
//   Step 3: Profile setup (display_name, username, bio, avatar upload)
//
// OTP boxes: 6 individual inputs, auto-focus-next on digit, backspace goes back, paste fills all
// Countdown: 60s resend timer
// Error: shake animation on wrong OTP

// After successful login/register:
// 1. Store access_token + refresh_token in localStorage
// 2. Update AuthContext user state
// 3. Show toast: "Welcome back, {name}!" or "Welcome to Embedded Collective! 🎉"
// 4. Close modal
// 5. Re-render the page without navigation (user state change triggers re-render)
```

### `DropZone.tsx` — real drag-and-drop

```tsx
// CRITICAL: e.preventDefault() on BOTH onDragOver and onDrop events
// This is the fix for the broken drag-and-drop

const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragging(true) }
const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setDragging(false) }
const handleDrop = (e: React.DragEvent) => {
  e.preventDefault()   // ← REQUIRED
  e.stopPropagation()
  setDragging(false)
  processFiles(Array.from(e.dataTransfer.files))
}

// After drop: immediately upload via api.upload('/uploads/', file)
// Show upload progress per file (XHR with onprogress, not fetch)
// Show thumbnail previews with remove button
// Max 5 files, 10MB each — validate before upload, show error toast if violated
```

### `CommunityLanding.tsx` — main feed page

```tsx
// URL: /community
// Layout: two columns on desktop (feed 65% + sidebar 35%), single on mobile

// HERO STRIP (only shown when no category filter active + on first visit):
// - When user logged in: "Welcome {name}!" greeting, platform stats, quick actions
// - When logged out: "Embedded Collective" heading, tagline, stats, Join/Browse CTAs
// - Stats from GET /stats/public (cached 60s)
// - Collapses to thin bar on scroll past 200px

// CATEGORY FILTER BAR (sticky top-[64px] z-40):
// [All] [Software] [Hardware] [Programming] [Protocols] [Other]
// + [Sort: Newest ▾ | Popular | Trending | Top Voted]
// + [Status: All ▾ | Open | Solved | In Progress]
// All state in URL query params (?category=...&sort=...&status=...)
// Change = update URL → triggers re-fetch (no React state for filters, URL is state)

// FEED:
// - Load 10 posts per page
// - IntersectionObserver on last card → fetch next page (infinite scroll)
// - Show PostCardSkeleton while loading
// - "No posts found" illustrated empty state when 0 results
// - Real data from GET /posts with query params from URL

// SIDEBAR (desktop only, sticky top-24):
// - Top Contributors (GET /users/leaderboard?limit=3)
// - Active Tags (derived from recent posts)
// - "Post a Problem" CTA box
// - if logged in: "Your Stats" mini card (rep, post count, level)

// WELCOME GREETING (community nav strip, only when logged in + on /community):
// "// WELCOME_BACK · @username"
```

### `PostDetail.tsx` — full post page

```tsx
// URL: /community/p/:slug
// GET /posts/{slug} on mount → increment view_count (backend handles idempotent)

// Layout:
// - Post header: status + category + tags
// - Title (large, font-heading)
// - Author bar: avatar, username, role badge, level badge, time ago
// - Action bar: vote widget, like, save, share, report
// - Post body (markdown rendered — use 'marked' library, sanitize with 'DOMPurify')
// - Image gallery (ImageCarousel component — lightbox on click)
// - Solutions section (contributor-only posts with is_featured or post_type=solution)
//   - Accepted solution pinned top with green left border + "✓ ACCEPTED SOLUTION" chip
// - Comments section (CommentThread component — threaded, with reply support)
// - Answer/comment editor (role-gated: contributors see full editor, seekers see comment-only textarea)

// Real-time updates: poll GET /posts/{slug}/comments every 30s and merge new entries
// (WebSocket is complex — polling is fine for this scale)

// Accept solution button (only for problem author + only on solution-type posts):
// → POST /posts/{problem_slug}/accept-solution { solution_post_id }
// → On success: pin solution, show confetti animation, update status chip
```

### `UserProfile.tsx` — role-split display

```tsx
// URL: /community/u/:username
// GET /users/{username}

// COVER PHOTO: full-width 200px tall, bg-gradient fallback if null
// AVATAR: overlapping cover, 80px circle, red ring border
// NAME + USERNAME + ROLE BADGE
// LEVEL BADGE (contributors only): LVL 5 · FIRMWARE_CRAFTSMAN

// CONTRIBUTOR profile shows:
// - Bio, Location, Skills (tags), Interests
// - Education, Social links (GitHub, LinkedIn, Website)
// - Stats: Reputation, Solutions, Acceptance rate, Followers/Following
// - Level progress bars (total solutions + frequent solutions)
// - Resume download button (if resume_url set)
// - Badges earned

// SOLUTION SEEKER profile shows:
// - Display name, username, avatar, join date
// - Posts count, Following count
// - Recent posts (last 6)
// ← No email, no phone, no education shown publicly

// OWN PROFILE: edit button → inline edit mode
// - Click avatar → file upload → resize → update
// - Click cover → file upload → resize → update
// - All fields editable inline, save on [Save Changes]

// FOLLOW/UNFOLLOW button (if not own profile + logged in):
// → POST /users/{username}/follow
// → Toggles, updates count, creates notification
```

### `Settings.tsx` — 4 tabs, all functional

```tsx
// URL: /community/settings
// Requires: auth (redirect to AuthModal if not logged in)

// Tab 1: PROFILE
// - Avatar upload (click → file input → immediate preview → upload → update user)
// - Cover photo upload (same flow, wider crop)
// - Display name (text input)
// - Username (text input + live availability check)
// - Bio (textarea, 300 char limit, live count)
// - Location (text input)
// - Skills (tag-like multi-input: type → Enter to add, ✕ to remove)
// - GitHub URL, LinkedIn URL, Website URL
// - Education (text input, contributor only)
// - Resume upload PDF (contributor only)
// - [Save Changes] → PATCH /users/me → success toast

// Tab 2: ACCOUNT
// - Change password (only if not Google-only user)
// - Connected methods: Google ✓ / Email ✓
// - Switch role button: "Switch to Contributor" / "Switch to Solution Seeker"
//   → Instant, no confirmation needed, success toast
// - Danger zone: Delete account (confirmation input: type "DELETE" to confirm)

// Tab 3: NOTIFICATIONS
// Toggle switches (glass pill design) for:
// - Email me when someone comments on my post
// - Email me when my solution is accepted
// - Email me new follower notifications
// - Weekly activity digest
// → PATCH /users/me/notification-prefs

// Tab 4: APPEARANCE
// - Theme: [Dark] [Light] [System] — 3 card options
// - Selecting updates ThemeContext + localStorage immediately
```

### `Leaderboard.tsx`

```tsx
// URL: /community/leaderboard
// GET /users/leaderboard?period=all (or week/month from tab)

// PODIUM — top 3:
// 2nd (left, 90% height): silver ring avatar 64px, name, rep, level
// 1st (center, full height): gold ring avatar 80px, name, rep, level, larger card
// 3rd (right, 80% height): bronze ring avatar 56px, name, rep, level

// TABLE rank 4-20:
// Rank | Avatar+Name | Level badge | Rep | Solutions | Accept% | Top Category
// Click row → navigate to /community/u/:username

// My rank (sticky bottom, only logged in):
// "Your rank: #34 · 680 XP · UART_ENGINEER"
```

### `AdminDashboard.tsx` — complete analytics + management

```tsx
// URL: /community/admin — requires role=admin
// GET /admin/stats for all KPI data

// TABS: Overview | Users | Posts | Reports | Featured | Email Logs

// Overview: 6 KPI cards + sparkline charts + real-time activity
// Users: searchable table, role change, ban, delete, view activity
// Posts: filterable table, feature/pin, delete, change status
// Reports: queue of reported content, resolve/dismiss/ban
// Featured: drag-to-order 3 featured solutions (appear in portfolio)
// Email Logs: list of all sent emails with status

// All charts use recharts with brand color overrides:
// primary series: --red-core, secondary: --cyan-spark, bg: transparent
```

---

## PHASE 3 — PORTFOLIO FIXES

Do not break any existing portfolio component. Make only these surgical changes:

### Hero video — unmuted by default, audio synced

```tsx
// In Hero.tsx / hero component:
// 1. Remove the HTML `muted` attribute from <video> (CRITICAL — JS .muted=false is ignored if attr set)
// 2. Set video.volume = 0.7 on mount
// 3. Try video.play() — on AbortError (browser blocked), retry with video.muted=true
// 4. Track isMuted state (default: false — unmuted)
// 5. Mute/unmute button: bottom-right corner, fixed position
//    - Shows when hero is in viewport
//    - Hides (opacity:0) when hero scrolls out of view
//    - Icon: Volume2 (unmuted) / VolumeX (muted)
//    - Label: "LIVE" / "MUTED"
//    - Clicking mute sets userManuallyMuted.current = true
// 6. IntersectionObserver on hero: when ratio < 0.1 → auto-mute
//    When ratio >= 0.1 → re-unmute ONLY if !userManuallyMuted.current
// 7. Ambient audio (if file exists): sync with video mute state
//    If video is unmuted → ambient plays. If muted → ambient pauses.
```

### Contact form — auth gate + auto-response

```tsx
// In Contact.tsx:
// Before submit: check if user is logged in
// If not → open AuthModal with a message "Sign in to send a message"
// If yes → submit form, then call POST /contact (backend sends auto-response email)
```

### Footer — full sitemap

```tsx
// Replace minimal footer with 4-column sitemap grid:
// Col 1 PORTFOLIO: About, Skills, Experience, Education, Training, Projects, Achievements, Contact
// Col 2 COMMUNITY: Feed, Ask a Problem, Knowledge Base, Leaderboard, Sign Up
// Col 3 CONNECT: LinkedIn, HackerRank, LeetCode, Email
// Col 4 IDENTITY: C struct pointer block (Motivate font, animated → operator pulse)
// Bottom bar: copyright + "SYSTEM ONLINE" blink + theme toggle
```

### Training section scrollbar — fix

```tsx
// Replace horizontal scroll container with 3-card windowed carousel
// < > buttons, dot indicators (pill/circle morphing), keyboard arrows when in view
// No overflow-x anywhere — overflow: hidden on wrapper only
```

---

## PHASE 4 — ENVIRONMENT & WIRING

### `backend/.env.example` (update with all required vars)

```bash
# Database
DATABASE_URL=sqlite+aiosqlite:///./collective.db

# Redis
REDIS_URL=redis://localhost:6379/0

# Auth
SECRET_KEY=change-this-to-a-random-64-char-string
ENVIRONMENT=development

# Google OAuth
GOOGLE_CLIENT_ID=

# SMTP — herry.pvt.hm@gmail.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=herry.pvt.hm@gmail.com
SMTP_PASSWORD=       ← Gmail App Password (not account password)
SMTP_FROM=Embedded Collective <herry.pvt.hm@gmail.com>

# Storage
R2_ACCESS_KEY_ID=    ← optional: Cloudflare R2
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=
```

### Gmail App Password setup (add to README):

```
To enable real email delivery:
1. Enable 2-Factor Authentication on herry.pvt.hm@gmail.com
2. Go to Google Account → Security → App Passwords
3. Create new App Password for "Mail" → "Other" → name it "Embedded Collective"
4. Copy the 16-character password → paste into SMTP_PASSWORD in backend/.env
5. Run: ./run.sh restart
6. Test: curl -X POST http://127.0.0.1:8000/api/v1/auth/otp/send \
     -H "Content-Type: application/json" \
     -d '{"contact":"your@email.com","purpose":"login"}'
   → Check herry.pvt.hm@gmail.com Sent folder for the delivered email
```

---

## PHASE 5 — E2E TEST SCRIPT

Update `scripts/test_full.sh` to verify every critical path:

```bash
#!/usr/bin/env bash
set -euo pipefail
BASE="http://127.0.0.1:8000/api/v1"
PASS=0; FAIL=0

check() {
  local name="$1"; local cmd="$2"
  if eval "$cmd" &>/dev/null; then echo "  ✅ $name"; ((PASS++))
  else echo "  ❌ $name"; ((FAIL++)); fi
}

echo ""; echo "═══ BACKEND ════════════════════════════"
check "Server alive"     "curl -sf $BASE/../health"
check "Public stats"     "curl -sf $BASE/stats/public | grep total_posts"
check "OTP send works"   "curl -sf -XPOST $BASE/auth/otp/send -H'Content-Type:application/json' -d'{\"contact\":\"test@example.com\",\"purpose\":\"login\"}' | grep message"
check "Email preview saved" "ls .run/email_previews/ 2>/dev/null | grep -q latest"

TOK=$(curl -sf -XPOST $BASE/auth/dev-login -H'Content-Type:application/json' \
  -d'{"username":"firmware_guru","password":"password123"}' 2>/dev/null | python3 -c "import sys,json;print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null)

if [ -n "$TOK" ]; then
  echo ""; echo "═══ AUTHENTICATED ══════════════════════"
  check "Get /users/me"   "curl -sf -H'Authorization:Bearer $TOK' $BASE/users/me | grep username"
  check "Get posts"       "curl -sf $BASE/posts | grep items"
  check "Vote endpoint"   "curl -sf -XPOST -H'Authorization:Bearer $TOK' -H'Content-Type:application/json' \
    $BASE/posts/\$(curl -sf $BASE/posts | python3 -c 'import sys,json;d=json.load(sys.stdin);print(d[\"items\"][0][\"id\"] if d.get(\"items\") else \"\")' 2>/dev/null)/vote \
    -d'{\"value\":1}' 2>/dev/null | grep score"
  check "Upload file"     "curl -sf -XPOST -H'Authorization:Bearer $TOK' $BASE/uploads/ \
    -F file=@frontend/public/favicon.svg 2>/dev/null | grep url"
  check "Notifications"   "curl -sf -H'Authorization:Bearer $TOK' $BASE/notifications | grep -E '\[|\{'"
fi

echo ""; echo "═══ FRONTEND ════════════════════════════"
check "TypeScript clean"  "cd frontend && npx tsc --noEmit 2>&1 | grep -c 'error' | grep -q '^0$'"
check "Build succeeds"    "cd frontend && npm run build 2>&1 | grep -q 'built in'"

echo ""
echo "Result: ${PASS} passed · ${FAIL} failed"
[ $FAIL -eq 0 ] && echo "🎉 All checks passed!" || echo "🔴 Fix the failures above."
exit $FAIL
```

---

## EXECUTION ORDER

```
Phase 0 → Models (run ./run.sh restart after, verify tables created)
Phase 0 → seed.py (verify dev accounts work: curl /auth/dev-login)
Phase 1 → auth.py (test OTP send/verify end-to-end)
Phase 1 → posts.py (test CRUD + vote + like)
Phase 1 → comments.py
Phase 1 → users.py (test profile + follow)
Phase 1 → notifications.py
Phase 1 → search.py
Phase 1 → admin.py
Phase 1 → email_service.py (verify email actually delivers to test inbox)
Phase 1 → ranking_service.py

Phase 2 → api.ts (typed client)
Phase 2 → AuthModal.tsx (test all 3 sign-in methods)
Phase 2 → CommunityNav.tsx
Phase 2 → PostCard.tsx + VoteWidget.tsx
Phase 2 → CommunityLanding.tsx (feed loads, filters work, infinite scroll works)
Phase 2 → PostDetail.tsx (comments, vote, like, accept solution)
Phase 2 → UserProfile.tsx (contributor vs seeker display)
Phase 2 → Settings.tsx (all 4 tabs save correctly)
Phase 2 → Leaderboard.tsx
Phase 2 → AdminDashboard.tsx (all tabs, all data real)
Phase 2 → NotificationDropdown.tsx
Phase 2 → SearchSpotlight.tsx (Cmd+K)

Phase 3 → Hero video fix (unmuted by default)
Phase 3 → Contact form auth gate + auto-response email
Phase 3 → Footer full sitemap
Phase 3 → Training carousel fix

Phase 4 → .env.example update + README Gmail App Password section
Phase 5 → scripts/test_full.sh → all checks must pass

FINAL:
  ./run.sh restart
  Run scripts/test_full.sh
  Open http://127.0.0.1:5173 → verify portfolio intact
  Open http://127.0.0.1:5173/community → verify feed loads with real data
  Sign up as new user → verify welcome email arrives
  Sign in with email OTP → verify OTP email arrives
  Post a problem → verify drag-and-drop works, post appears in feed
  Vote on a post → verify score updates, my_vote state persists on refresh
  Follow a user → verify notification appears for that user
  Admin login → verify all admin tabs show real data
```

Zero placeholder components. Zero mock data. Every feature tested end-to-end.
