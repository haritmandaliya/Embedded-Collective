# CURSOR PROMPT — EMBEDDED COLLECTIVE: FINAL PRODUCTION POLISH
## Zero-bug, zero-mock, world-class finishing pass

---

## PROJECT SNAPSHOT (do not re-scan the repo — use this map)

```
Harit_Portfolio/
├── frontend/src/
│   ├── components/          ← portfolio sections + community pages (all mixed here)
│   ├── context/             ← AuthContext, ThemeContext
│   ├── services/            ← API client helpers
│   └── data/content.ts      ← all portfolio copy
├── backend/app/
│   ├── api/endpoints/       ← auth.py, questions.py, uploads.py, admin.py
│   ├── models/              ← SQLAlchemy models
│   ├── services/            ← email_service.py, sms_service.py
│   └── db/seed.py
├── .run/email_previews/     ← existing HTML OTP email template lives here
│   └── engineer_at_example_com_latest.html
└── run.sh / scripts/test_full.sh / scripts/test_community_api.sh
```

**API base:** `/api/v1` (Vite proxies to `http://127.0.0.1:8000`)
**Uploads served at:** `/uploads/static/{file}`
**Dev accounts:** admin/adminpassword · firmware_guru/password123 · hardware_hacker/password123
**DB:** SQLite `backend/collective.db` (auto-recreated on delete + restart)
**Email template:** `.run/email_previews/engineer_at_example_com_latest.html` — **use this exact design** for all outgoing emails

**Rules for this entire prompt:**
- Zero placeholder code, zero TODO comments, zero mock data, zero non-functional buttons
- Every API call must be real and wired — test with the actual dev server before marking done
- Do not touch files not explicitly mentioned — keep all working features intact
- After every fix group, run `./run.sh restart` and verify in browser before proceeding

---

## FIX GROUP 1 — CRITICAL BUGS (fix first, nothing else works without these)

### 1A. Page rendering not smooth — React route transitions broken

**Symptom:** Navigating between pages requires manual browser refresh. Forms reload the whole page instead of SPA navigation.

**Root cause to find and fix in `frontend/src/`:**
- Any `<a href="...">` that should be `<Link to="...">` from react-router-dom
- Any `window.location.href = ...` assignment inside the app (replace with `useNavigate()`)
- Any `<form action="...">` without `e.preventDefault()` in the submit handler
- Missing `<Suspense fallback={<Spinner/>}>` around lazy-loaded route components

**Fix:** Audit every navigation action in the codebase. Every internal link must use react-router `<Link>` or `navigate()`. Every form must call `e.preventDefault()`. Add a global page-transition wrapper:

```tsx
// frontend/src/components/PageTransition.tsx
import { motion } from 'framer-motion'
export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}
```

Wrap every route component with `<PageTransition>` inside an `<AnimatePresence mode="wait">` in the router. This eliminates the jarring blank-screen flash between pages.

### 1B. File upload drag-and-drop not accepting files

**File:** find the AskQuestion / upload component in `frontend/src/components/`

**Fix the drop zone completely:**

```tsx
// Replace existing broken drop zone with this complete implementation:
const [isDragging, setIsDragging] = useState(false)
const dropRef = useRef<HTMLDivElement>(null)

const handleDragOver = (e: React.DragEvent) => {
  e.preventDefault()          // ← THIS IS THE CRITICAL LINE that's missing
  e.stopPropagation()
  setIsDragging(true)
}
const handleDragLeave = (e: React.DragEvent) => {
  e.preventDefault()
  setIsDragging(false)
}
const handleDrop = (e: React.DragEvent) => {
  e.preventDefault()          // ← also required on drop
  e.stopPropagation()
  setIsDragging(false)
  const files = Array.from(e.dataTransfer.files)
  handleFiles(files)          // your existing upload logic
}

// JSX:
<div
  ref={dropRef}
  onDragOver={handleDragOver}
  onDragEnter={handleDragOver}
  onDragLeave={handleDragLeave}
  onDrop={handleDrop}
  onClick={() => fileInputRef.current?.click()}
  className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer
    transition-all duration-200
    ${isDragging
      ? 'border-[--red-core] bg-[--red-core]/8 scale-[1.01]'
      : 'border-[--glass-border] hover:border-[--red-core]/50 hover:bg-[--glass-bg]'
    }`}
>
  <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.zip"
         onChange={e => handleFiles(Array.from(e.target.files || []))}
         className="hidden" />
  <Upload size={32} className={isDragging ? 'text-[--red-core]' : 'text-[--text-secondary]'} />
  <p className="mt-3 font-mono text-sm text-[--text-secondary]">
    {isDragging ? 'Release to upload' : 'Drop images here or click to browse'}
  </p>
  <p className="mt-1 font-mono text-xs text-[--text-secondary]/60">JPG, PNG, GIF, WebP · max 5 files · 10MB each</p>
</div>
```

---

## FIX GROUP 2 — AUTH SYSTEM CORRECTIONS

### 2A. Phone number → OPTIONAL everywhere (remove SMS OTP entirely)

**Files to update:**
- `frontend/src/components/` — AuthModal / SignUpForm
- `backend/app/api/endpoints/auth.py`
- `backend/app/models/` — User model

**Changes:**

In the sign-up form: mark phone field as optional with "(optional)" label. Remove any `required` attribute. Remove the "Phone OTP verification" step entirely from the sign-up flow.

In `auth.py`: remove `phone` from required fields on `/register`. Keep the phone column in the DB (nullable). Remove any block that prevents registration if phone is absent. The OTP flow is email-only.

New simplified auth flow:
```
SIGN UP:  email (required) + phone (optional, no OTP for it)
          → email OTP sent
          → verify email OTP
          → complete profile
          → JWT issued

SIGN IN:  email → email OTP → JWT   OR   Google → JWT
```

### 2B. Email OTP MUST actually send — fix the SMTP integration

**File:** `backend/app/services/email_service.py`

The existing HTML template at `.run/email_previews/engineer_at_example_com_latest.html` is the **design source**. Read that file, extract its HTML structure and inline styles. Use that exact design for all outgoing OTP emails.

```python
# backend/app/services/email_service.py — complete rewrite

import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

# Read the existing branded HTML template once at module load
_TEMPLATE_PATH = Path(__file__).parent.parent.parent.parent / \
    ".run/email_previews/engineer_at_example_com_latest.html"

def _load_template() -> str:
    try:
        return _TEMPLATE_PATH.read_text()
    except FileNotFoundError:
        # Fallback minimal template if file not found
        return """
        <html><body style="background:#000;color:#fff;font-family:monospace;padding:40px;">
        <h1 style="color:#C0192C;">⬡ EMBEDDED COLLECTIVE</h1>
        <p>Your verification code:</p>
        <h2 style="color:#fff;letter-spacing:8px;font-size:36px;">{OTP_CODE}</h2>
        <p style="color:#888;">Valid for 10 minutes. Do not share this code.</p>
        </body></html>
        """

_EMAIL_TEMPLATE = _load_template()

def _build_otp_html(otp: str, purpose: str = "verification") -> str:
    """Replace OTP placeholder in the branded template."""
    html = _EMAIL_TEMPLATE
    # Replace any existing OTP-looking 6-digit sequence with the real OTP
    import re
    html = re.sub(r'\b\d{6}\b', otp, html, count=1)
    # If no 6-digit sequence found, inject it
    if otp not in html:
        html = html.replace('</body>', f'<p style="font-size:32px;letter-spacing:8px;color:#C0192C;">{otp}</p></body>')
    return html

async def send_otp_email(to_email: str, otp: str) -> bool:
    """
    Send OTP email. In development (no SMTP config), logs to terminal + saves preview.
    In production (SMTP configured), sends real email via SMTP.
    Returns True if sent (or logged in dev), False on error.
    """
    html_body = _build_otp_html(otp)
    subject = "Your Embedded Collective verification code"

    # Dev mode: always log OTP visibly
    logger.warning(f"\n{'='*50}\n📧 OTP EMAIL\nTo: {to_email}\nCode: {otp}\n{'='*50}")

    # Save preview HTML (always, for debugging)
    preview_dir = Path(".run/email_previews")
    preview_dir.mkdir(parents=True, exist_ok=True)
    safe_name = to_email.replace("@", "_at_").replace(".", "_")
    (preview_dir / f"{safe_name}_latest.html").write_text(html_body)

    # Attempt real SMTP delivery
    if not settings.SMTP_HOST or not settings.SMTP_USER:
        logger.info("No SMTP configured — OTP logged above only.")
        return True   # Dev mode: treat as success

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = settings.SMTP_FROM or f"Embedded Collective <{settings.SMTP_USER}>"
        msg["To"] = to_email
        msg.attach(MIMEText(f"Your verification code is: {otp}", "plain"))
        msg.attach(MIMEText(html_body, "html"))

        context = ssl.create_default_context()
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.ehlo()
            server.starttls(context=context)
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_FROM or settings.SMTP_USER, to_email, msg.as_string())

        logger.info(f"✅ OTP email delivered to {to_email}")
        return True

    except Exception as e:
        logger.error(f"❌ SMTP delivery failed: {e}")
        # In development, OTP is still in the log — not a blocking error
        return settings.ENVIRONMENT == "development"
```

Ensure `auth.py` calls `await send_otp_email(email, otp)` and does NOT skip it silently. The OTP must be sent every time. In dev without SMTP, it logs to `./run.sh logs` with yellow color AND saves to `.run/email_previews/`.

### 2C. Community nav: show greeting instead of "EMBEDDED COLLECTIVE" when logged in

**Find the community navbar component** (in `frontend/src/components/`). Find where "EMBEDDED COLLECTIVE" text is rendered as the center/top heading on the community feed page (NOT the logo — that stays). Change it to:

```tsx
// In the community page hero/header section (NOT the logo in the nav bar):
const { user } = useAuth()  // from your existing AuthContext

// Replace the static heading:
// <h1>EMBEDDED COLLECTIVE</h1>
// With:
{user ? (
  <div className="flex flex-col items-center gap-1">
    <span className="font-mono text-sm text-[--cyan-spark] tracking-widest">
      // WELCOME_BACK
    </span>
    <h1 className="font-heading text-5xl lg:text-7xl text-[--text-primary]">
      {user.display_name?.split(' ')[0].toUpperCase() || user.username?.toUpperCase()}
    </h1>
    <span className="font-body text-lg text-[--text-secondary] italic">
      Ready to debug something today?
    </span>
  </div>
) : (
  <div className="flex flex-col items-center gap-1">
    <span className="font-mono text-sm text-[--red-core] tracking-widest">⬡ PLATFORM</span>
    <h1 className="font-heading text-5xl lg:text-7xl text-[--text-primary]">
      EMBEDDED COLLECTIVE
    </h1>
    <p className="font-body text-xl text-[--text-secondary] italic">
      Connect. Debug. Collaborate. Build Better Embedded Systems.
    </p>
  </div>
)}
```

---

## FIX GROUP 3 — POST CARDS: COMPLETE UI REDESIGN

This is the most visually impactful change. Every problem card in the feed must be rebuilt.

### 3A. Post card with images — Instagram-style layout

When a problem has uploaded images, render them prominently:

```tsx
// PostCard.tsx — complete redesign

function PostCard({ question, currentUser }) {
  const hasImages = question.attachments?.length > 0
  const imageAttachments = question.attachments?.filter(a =>
    ['image/jpeg','image/png','image/gif','image/webp'].includes(a.mime_type)
  ) || []

  return (
    <article className={`
      rounded-2xl overflow-hidden border transition-all duration-300 group
      bg-[--glass-bg] border-[--glass-border]
      hover:border-[--red-core]/40 hover:shadow-[0_0_32px_rgba(192,25,44,0.1)]
      backdrop-blur-sm
    `}>

      {/* IMAGE SECTION — Instagram-style, full width, only if images exist */}
      {imageAttachments.length > 0 && (
        <div className="relative w-full bg-black" style={{ aspectRatio: '16/9' }}>
          {/* Single image: fill the space */}
          {imageAttachments.length === 1 && (
            <img
              src={imageAttachments[0].url}
              alt="Problem screenshot"
              className="w-full h-full object-cover"
              loading="lazy"
            />
          )}
          {/* 2 images: side by side */}
          {imageAttachments.length === 2 && (
            <div className="grid grid-cols-2 h-full gap-px">
              {imageAttachments.map(img => (
                <img key={img.id} src={img.url} className="w-full h-full object-cover" />
              ))}
            </div>
          )}
          {/* 3+ images: first large + grid of 2 on right */}
          {imageAttachments.length >= 3 && (
            <div className="grid grid-cols-2 h-full gap-px">
              <img src={imageAttachments[0].url} className="w-full h-full object-cover" />
              <div className="grid grid-rows-2 gap-px">
                <img src={imageAttachments[1].url} className="w-full h-full object-cover" />
                <div className="relative">
                  <img src={imageAttachments[2].url} className="w-full h-full object-cover" />
                  {imageAttachments.length > 3 && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <span className="font-heading text-2xl text-white">+{imageAttachments.length - 3}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          {/* Category badge overlay */}
          <div className="absolute top-3 left-3">
            <CategoryChip category={question.category} />
          </div>
          {/* Status badge overlay */}
          <div className="absolute top-3 right-3">
            <StatusChip status={question.status} />
          </div>
        </div>
      )}

      {/* CONTENT BODY */}
      <div className="p-5">
        {/* Category + Status (only when no image — already shown as overlay) */}
        {!hasImages && (
          <div className="flex items-center gap-2 mb-3">
            <CategoryChip category={question.category} />
            <StatusChip status={question.status} />
          </div>
        )}

        {/* Title */}
        <h2 className="font-heading text-xl text-[--text-primary] leading-tight
                       group-hover:text-[--red-glow] transition-colors cursor-pointer mb-2">
          {question.title}
        </h2>

        {/* Description excerpt */}
        <p className="font-body text-sm text-[--text-secondary] leading-relaxed line-clamp-2 mb-3">
          {question.description}
        </p>

        {/* Hashtags — parsed from tags array */}
        {question.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {question.tags.map(tag => (
              <span key={tag}
                className="font-mono text-xs text-[--cyan-spark] hover:text-[--red-core]
                           cursor-pointer transition-colors">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Bottom bar: author + metrics */}
        <div className="flex items-center justify-between pt-3 border-t border-[--glass-border]">
          {/* Author */}
          <div className="flex items-center gap-2">
            <Avatar user={question.author} size={28} />
            <div>
              <span className="font-mono text-xs text-[--text-primary]">
                @{question.author.username}
              </span>
              {question.author.role === 'contributor' && (
                <span className="ml-1.5 font-mono text-[9px] text-[--cyan-spark]
                                 border border-[--cyan-spark]/40 rounded px-1 py-0.5">
                  CONTRIBUTOR
                </span>
              )}
            </div>
            <span className="font-mono text-xs text-[--text-secondary]">· {timeAgo(question.created_at)}</span>
          </div>

          {/* Metrics */}
          <div className="flex items-center gap-3">
            <VoteWidget question={question} currentUser={currentUser} />
            <span className="flex items-center gap-1 font-mono text-xs text-[--text-secondary]">
              <MessageSquare size={12} /> {question.reply_count || 0}
            </span>
            <span className="flex items-center gap-1 font-mono text-xs text-[--text-secondary]">
              <Eye size={12} /> {question.view_count || 0}
            </span>
            <ShareButton question={question} />
          </div>
        </div>
      </div>
    </article>
  )
}
```

### 3B. Post card WITHOUT images — no abstract placeholder, clean text card

When there are no images, the card shows a clean, text-focused layout with a subtle left-accent bar:

```tsx
// No-image card: just add a colored left border based on category
// The border color maps to category:
const CATEGORY_COLORS = {
  'Software Problems':         '#6366F1',   // indigo
  'Hardware Problems':         '#F59E0B',   // amber
  'Programming Issues':        '#22C55E',   // green
  'Communication Protocols':   '#00F5FF',   // cyan (brand)
  'Other':                     '#A0A0A0',   // gray
}

// In the no-image card, add this left accent:
<article className={`rounded-2xl overflow-hidden border ... border-l-4`}
  style={{ borderLeftColor: CATEGORY_COLORS[question.category] || '#C0192C' }}>
  ...
</article>
```

### 3C. Vote widget — correct logic (↑ score ↓, one vote per user)

The vote counts show **problem frequency / commonness** — how many engineers share the same issue. Each user can vote exactly +1 or -1, toggling off if clicked again.

```tsx
// VoteWidget.tsx — complete implementation

function VoteWidget({ question, currentUser }) {
  // userVote: +1, -1, or 0 (from API or local state)
  const [score, setScore]     = useState(question.vote_count ?? 0)
  const [userVote, setUserVote] = useState<1|-1|0>(question.my_vote ?? 0)
  const [loading, setLoading]  = useState(false)

  const vote = async (value: 1 | -1) => {
    if (!currentUser) { openAuthModal(); return }
    if (loading) return

    // Toggle: if clicking the same direction, remove the vote
    const newValue = userVote === value ? 0 : value

    // Optimistic update
    const delta = newValue - userVote
    setScore(s => s + delta)
    setUserVote(newValue)
    setLoading(true)

    try {
      await api.post(`/questions/${question.id}/vote`, { value: newValue })
    } catch {
      // Revert on error
      setScore(s => s - delta)
      setUserVote(userVote)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-1">
      {/* UP ARROW */}
      <button
        onClick={() => vote(1)}
        disabled={loading}
        className={`p-1 rounded transition-all ${
          userVote === 1
            ? 'text-[--red-core]'
            : 'text-[--text-secondary] hover:text-[--red-core]'
        }`}
      >
        <ChevronUp size={18} strokeWidth={userVote === 1 ? 2.5 : 1.5} />
      </button>

      {/* SCORE — shown as frequency indicator */}
      <span className={`font-heading text-sm tabular-nums ${
        score > 0 ? 'text-[--red-core]' : score < 0 ? 'text-[--text-secondary]' : 'text-[--text-secondary]'
      }`}>
        {score}
      </span>

      {/* DOWN ARROW */}
      <button
        onClick={() => vote(-1)}
        disabled={loading}
        className={`p-1 rounded transition-all ${
          userVote === -1
            ? 'text-blue-400'
            : 'text-[--text-secondary] hover:text-blue-400'
        }`}
      >
        <ChevronDown size={18} strokeWidth={userVote === -1 ? 2.5 : 1.5} />
      </button>
    </div>
  )
}
```

**Backend vote endpoint** (in `backend/app/api/endpoints/questions.py`) — ensure this logic:
```python
@router.post("/{question_id}/vote")
async def vote_question(question_id: str, value: int, current_user = Depends(require_auth), db = Depends(get_db)):
    # value must be -1, 0, or +1 only
    if value not in (-1, 0, 1):
        raise HTTPException(400, "Vote value must be -1, 0, or 1")

    # Find existing vote by this user on this question
    existing = await db.scalar(
        select(Vote).where(Vote.user_id == current_user.id, Vote.question_id == question_id)
    )

    old_value = existing.value if existing else 0
    delta = value - old_value

    if existing:
        if value == 0:
            await db.delete(existing)
        else:
            existing.value = value
    elif value != 0:
        db.add(Vote(user_id=current_user.id, question_id=question_id, value=value))

    # Update question vote_count atomically
    await db.execute(
        update(Question).where(Question.id == question_id)
        .values(vote_count=Question.vote_count + delta)
    )
    # Reputation: +5 per upvote to question author, -2 per downvote
    if delta != 0:
        await update_reputation(question.author_id, delta * (5 if delta > 0 else 2), db)

    await db.commit()
    return {"score": question.vote_count + delta, "my_vote": value}
```

The `my_vote` field must be included in every `GET /questions` response — join the Vote table for the current user. Without this, the UI doesn't know what the user already voted.

### 3D. Share button — works for EVERYONE including guests

```tsx
function ShareButton({ question }) {
  const [copied, setCopied] = useState(false)
  const url = `${window.location.origin}/community/q/${question.slug}`

  const share = async () => {
    if (navigator.share) {
      await navigator.share({ title: question.title, url })
    } else {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <button onClick={share}
      className="flex items-center gap-1 font-mono text-xs text-[--text-secondary]
                 hover:text-[--text-primary] transition-colors">
      {copied ? <Check size={12} className="text-green-400" /> : <Share2 size={12} />}
      {copied ? 'Copied' : 'Share'}
    </button>
  )
}
```

No auth required for share — it just copies/shares the public URL.

---

## FIX GROUP 4 — POPULARITY & STARS IN PORTFOLIO

In the portfolio's "Problems I Solved" section (`SolvedShowcase` component), replace any existing indicator (bar, number, chip) with a **star-only rating display**:

```tsx
// Replace existing popularity indicators with:
function StarRating({ rating }: { rating: number }) {
  const full  = Math.floor(rating)
  const half  = rating % 1 >= 0.5 ? 1 : 0
  const empty = 5 - full - half
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array(full ).fill(0).map((_,i) => <Star key={`f${i}`} size={14} className="text-[--red-core] fill-[--red-core]" />)}
      {half === 1 && <StarHalf size={14} className="text-[--red-core] fill-[--red-core]" />}
      {Array(empty).fill(0).map((_,i) => <Star key={`e${i}`} size={14} className="text-[--text-secondary]" />)}
      <span className="ml-1 font-mono text-xs text-[--text-secondary]">{rating.toFixed(1)}</span>
    </div>
  )
}
```

Apply this to every place a "popularity" or "rating" indicator appears in portfolio sections. Remove any percentage bars, number badges, or colored chips that communicate the same thing — stars only.

---

## FIX GROUP 5 — CONTRIBUTOR RANKING SYSTEM (10 levels, real algorithm)

### 5A. Backend: Level calculation logic

Add to `backend/app/models/` or a new `backend/app/services/ranking_service.py`:

```python
# Contributor Level System
# Level is earned by a combination of:
#   A. Total problems solved (answers accepted) → max 100 problems → contributes 50% of score
#   B. Frequent/common problems solved (vote_count >= 10 on the question) → max 50 → contributes 50%
#   Level 10 requires: 100 total solved AND 50 frequent-problem solved

LEVELS = [
    (1,  "SIGNAL_NOISE",        0,    0),    # (level, label, min_solved, min_frequent)
    (2,  "GPIO_PIONEER",        5,    0),
    (3,  "UART_ENGINEER",       10,   2),
    (4,  "BUS_DEBUGGER",        20,   5),
    (5,  "PROTOCOL_EXPERT",     35,   10),
    (6,  "FIRMWARE_CRAFTSMAN",  50,   15),
    (7,  "SYSTEM_ARCHITECT",    65,   25),
    (8,  "SILICON_MASTER",      80,   35),
    (9,  "EMBEDDED_LEGEND",     90,   42),
    (10, "SILICON_GOD",         100,  50),   # max: 100 solved + 50 frequent
]

async def calculate_contributor_level(user_id: str, db) -> dict:
    """Returns level info for a contributor user."""

    # Total accepted solutions by this user
    total_solved = await db.scalar(
        select(func.count(Answer.id))
        .where(Answer.author_id == user_id, Answer.is_accepted == True)
    )

    # Accepted solutions on FREQUENT problems (question.vote_count >= 10)
    frequent_solved = await db.scalar(
        select(func.count(Answer.id))
        .join(Question, Answer.question_id == Question.id)
        .where(
            Answer.author_id == user_id,
            Answer.is_accepted == True,
            Question.vote_count >= 10        # "frequent/common" threshold
        )
    )

    total_solved   = min(total_solved or 0, 100)   # cap at 100
    frequent_solved = min(frequent_solved or 0, 50) # cap at 50

    # Determine level
    current_level = LEVELS[0]
    for lvl in LEVELS:
        if total_solved >= lvl[2] and frequent_solved >= lvl[3]:
            current_level = lvl

    # Next level requirements
    current_idx = LEVELS.index(current_level)
    next_level = LEVELS[current_idx + 1] if current_idx < len(LEVELS) - 1 else None

    return {
        "level":          current_level[0],
        "label":          current_level[1],
        "total_solved":   total_solved,
        "frequent_solved": frequent_solved,
        "next_level":     next_level[0] if next_level else None,
        "next_label":     next_level[1] if next_level else None,
        "next_needs_solved":   next_level[2] if next_level else 100,
        "next_needs_frequent": next_level[3] if next_level else 50,
        "progress_solved":   total_solved / (next_level[2] if next_level else 100),
        "progress_frequent": frequent_solved / max(next_level[3], 1) if next_level else 1.0,
    }
```

Expose this in `GET /users/{username}` response and `GET /users/leaderboard` response.

### 5B. Frontend: Level display on profile and leaderboard

```tsx
// LevelBadge.tsx
const LEVEL_COLORS = {
  1: 'text-zinc-400 border-zinc-600',
  2: 'text-red-400 border-red-800',
  3: 'text-red-300 border-red-600',
  4: 'text-orange-400 border-orange-700',
  5: 'text-cyan-400 border-cyan-700',
  6: 'text-cyan-300 border-cyan-500',
  7: 'text-blue-400 border-blue-600',
  8: 'text-violet-400 border-violet-600',
  9: 'text-yellow-400 border-yellow-600',
  10: 'text-yellow-300 border-yellow-400',   // gold for Level 10
}

function LevelBadge({ level, label }) {
  return (
    <span className={`font-mono text-[10px] tracking-widest px-2 py-0.5 rounded-full
                      border ${LEVEL_COLORS[level] || LEVEL_COLORS[1]}`}>
      LVL {level} · {label}
    </span>
  )
}

// Progress bar on profile page:
function LevelProgress({ levelData }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between font-mono text-xs text-[--text-secondary]">
        <span>Problems solved: {levelData.total_solved} / {levelData.next_needs_solved}</span>
        <span>{Math.round(levelData.progress_solved * 100)}%</span>
      </div>
      <div className="h-1.5 bg-[--glass-bg] rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-[--red-core] rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${levelData.progress_solved * 100}%` }}
          transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
        />
      </div>

      <div className="flex justify-between font-mono text-xs text-[--text-secondary]">
        <span>Common problems: {levelData.frequent_solved} / {levelData.next_needs_frequent}</span>
        <span>{Math.round(levelData.progress_frequent * 100)}%</span>
      </div>
      <div className="h-1.5 bg-[--glass-bg] rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-[--cyan-spark] rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${levelData.progress_frequent * 100}%` }}
          transition={{ duration: 1, ease: 'easeOut', delay: 0.5 }}
        />
      </div>

      {levelData.next_label && (
        <p className="font-mono text-xs text-[--text-secondary] text-center">
          Next: <span className="text-[--red-core]">{levelData.next_label}</span>
        </p>
      )}
    </div>
  )
}
```

---

## FIX GROUP 6 — WORLD-CLASS LIGHT THEME

The current light theme has invisible text (white on white, or low-contrast gray). Fix every surface.

### 6A. CSS variable corrections for light mode (in `frontend/src/index.css`)

```css
[data-theme="light"] {
  /* Backgrounds */
  --bg-void:            #F2F3F5;
  --bg-deep:            #FFFFFF;
  --glass-bg:           rgba(255, 255, 255, 0.90);
  --glass-border:       rgba(0, 0, 0, 0.08);

  /* Text — HIGH CONTRAST, readable from far angle */
  --text-primary:       #0A0A0B;      /* near-black, not pure black */
  --text-secondary:     #3D3D4A;      /* dark gray, 7:1 contrast on white */

  /* Brand stays — never change these */
  --red-core:           #C0192C;
  --red-glow:           #E8172E;
  --red-dim:            #FFD0D5;
  --cyan-spark:         #0891B2;      /* darker cyan for light bg readability */
  --cyan-dim:           #BAE6FD;

  /* Shadows */
  --shadow-card:        0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.06);
  --shadow-elevated:    0 4px 24px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.08);

  /* Glass cards on light bg */
  --card-bg:            #FFFFFF;
  --card-border:        rgba(0, 0, 0, 0.07);
}
```

### 6B. Fonts — world-class combination

In `frontend/src/index.css`, ensure the font stack has fallbacks that work before custom fonts load:

```css
/* Heading font — Motivate Bold */
.font-heading {
  font-family: 'Motivate', 'Inter', 'SF Pro Display', system-ui, sans-serif;
  font-weight: 700;
  letter-spacing: -0.02em;
}

/* Body font — Eternal Bloom */
.font-body {
  font-family: 'Eternal Bloom', 'Inter', 'SF Pro Text', system-ui, sans-serif;
  font-weight: 400;
  line-height: 1.75;
}

/* Mono font */
.font-mono {
  font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
  font-weight: 400;
}

/* Body text minimum sizes for readability */
p, li, td { font-size: 0.9375rem; }    /* 15px minimum */

/* Light theme: increase contrast for all secondary text */
[data-theme="light"] .text-\[--text-secondary\] {
  color: #3D3D4A;    /* override: darker than the CSS var default */
}
```

### 6C. Community home light mode: component-level fixes

Find every community page component and ensure:
- `bg-[--bg-void]` used for page background (NOT hardcoded `bg-black` or `bg-gray-900`)
- `text-[--text-primary]` on all body text
- `text-[--text-secondary]` on all meta/secondary text (will be dark #3D3D4A in light mode)
- All glass cards: `bg-[--card-bg] border-[--card-border]` in light mode
- Code blocks: ALWAYS dark (`bg-[#1E1E2E] text-[#CDD6F4]`) regardless of theme — add `!important` overrides for code blocks so they stay dark in both modes:
  ```css
  pre, code, .code-block {
    background: #1E1E2E !important;
    color: #CDD6F4 !important;
  }
  ```

### 6D. Category and status chips — theme-aware

```tsx
// CategoryChip — neutral in both themes
function CategoryChip({ category }: { category: string }) {
  return (
    <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md
                     bg-[--glass-bg] border border-[--glass-border]
                     text-[--text-secondary]">
      {category}
    </span>
  )
}

// StatusChip — semantic colors, override theme
const STATUS_STYLES = {
  open:         'bg-amber-500/15 text-amber-600 border-amber-500/30',
  solved:       'bg-green-500/15 text-green-600 border-green-500/30',
  in_progress:  'bg-cyan-500/15 text-cyan-600 border-cyan-500/30',
  closed:       'bg-zinc-500/15 text-zinc-500 border-zinc-500/30',
}
function StatusChip({ status }: { status: string }) {
  return (
    <span className={`font-mono text-[10px] uppercase tracking-wider px-2 py-0.5
                      rounded-md border ${STATUS_STYLES[status] || STATUS_STYLES.open}`}>
      {status.replace('_', ' ')}
    </span>
  )
}
```

---

## FIX GROUP 7 — HERO VIDEO: UNMUTED BY DEFAULT, AUDIO SYNC

Current behavior: video plays muted. Correct behavior per brief: **video starts UNMUTED** (plays with audio if audio track exists), and only mutes when user explicitly clicks mute or scrolls away.

**Find `Hero.tsx` or the hero video component:**

```tsx
// CORRECT hero video behavior:
const videoRef = useRef<HTMLVideoElement>(null)
const [isMuted, setIsMuted] = useState(false)    // ← FALSE = unmuted by default
const heroInViewRef = useRef(true)

// On mount: attempt autoplay with audio
// (browsers may block unmuted autoplay — handle gracefully)
useEffect(() => {
  const video = videoRef.current
  if (!video) return
  video.muted = false
  video.volume = 0.7    // not too loud
  video.play().catch(() => {
    // Browser blocked unmuted autoplay → fall back to muted autoplay
    video.muted = true
    setIsMuted(true)
    video.play().catch(console.error)
  })
}, [])

// IntersectionObserver: mute when hero leaves viewport
useEffect(() => {
  const observer = new IntersectionObserver(
    ([entry]) => {
      const video = videoRef.current
      if (!video) return
      heroInViewRef.current = entry.isIntersecting
      if (!entry.isIntersecting) {
        video.muted = true        // auto-mute on scroll away
        setIsMuted(true)
      } else {
        // Re-unmute when hero comes back IF user never manually muted
        if (!userManuallMuted.current) {
          video.muted = false
          setIsMuted(false)
        }
      }
    },
    { threshold: 0.1 }
  )
  if (heroRef.current) observer.observe(heroRef.current)
  return () => observer.disconnect()
}, [])

const userManuallMuted = useRef(false)

const toggleMute = () => {
  const video = videoRef.current
  if (!video) return
  if (isMuted) {
    video.muted = false
    setIsMuted(false)
    userManuallMuted.current = false
  } else {
    video.muted = true
    setIsMuted(true)
    userManuallMuted.current = true  // remember: user chose to mute
  }
}

// Ambient audio: sync with video mute state
useEffect(() => {
  const ambient = ambientRef.current
  if (!ambient) return
  if (isMuted) ambient.pause()
  else if (heroInViewRef.current) ambient.play().catch(() => {})
}, [isMuted])

// Mute button — bottom right, visible always when hero is in view
// Icon: isMuted ? <VolumeX> : <Volume2>
// Label: isMuted ? 'MUTED' : 'LIVE'
```

**The video `<video>` element:**
```tsx
<video
  ref={videoRef}
  src="/videos/New_hero_intro.mp4"
  autoPlay
  loop
  playsInline
  // DO NOT set the `muted` attribute — we control muting via JS
  poster="/videos/hero_poster.jpg"
  className="absolute inset-0 w-full h-full object-cover"
/>
```
Removing the HTML `muted` attribute is essential — if it's present as an attribute, browsers ignore JS `.muted = false`.

---

## FIX GROUP 8 — CONTACT FORM: AUTH GATE + AUTO-RESPONSE EMAIL

### 8A. Auth gate on the contact form

In the portfolio's `Contact.tsx` / `ContactForm` component:

```tsx
const { user } = useAuth()   // from existing AuthContext

const handleSubmit = async (e) => {
  e.preventDefault()
  // Gate: must be logged in to submit
  if (!user) {
    // Open auth modal — user must sign in first
    openAuthModal()
    return
  }
  // ... existing submit logic
}

// Show a subtle hint before the submit button when not logged in:
{!user && (
  <p className="font-mono text-xs text-[--text-secondary] text-center mb-2">
    <span className="text-[--red-core]">Sign in</span> to send a message
  </p>
)}
```

### 8B. Auto-response HTML email on contact form submission

In `backend/app/api/endpoints/` — find the contact form endpoint (or create one at `POST /api/v1/contact`):

```python
# Contact form auto-response HTML template
CONTACT_RESPONSE_HTML = """
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { background: #000; color: #F0F0F0; font-family: 'Courier New', monospace; margin: 0; padding: 0; }
  .wrapper { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
  .logo { color: #C0192C; font-size: 24px; font-weight: bold; margin-bottom: 8px; }
  .tagline { color: #A0A0A0; font-size: 12px; letter-spacing: 2px; margin-bottom: 32px; }
  .card { background: rgba(255,255,255,0.04); border: 1px solid rgba(192,25,44,0.25);
          border-radius: 16px; padding: 32px; margin-bottom: 24px; }
  h1 { color: #F0F0F0; font-size: 28px; margin: 0 0 16px; }
  p { color: #A0A0A0; line-height: 1.8; margin: 0 0 16px; }
  .highlight { color: #C0192C; }
  .cta { display: inline-block; background: #C0192C; color: #fff; padding: 12px 28px;
         border-radius: 8px; text-decoration: none; font-size: 14px; letter-spacing: 1px; margin-top: 8px; }
  .footer { color: #555; font-size: 11px; text-align: center; margin-top: 32px; }
  .divider { border: none; border-top: 1px solid rgba(192,25,44,0.2); margin: 24px 0; }
</style>
</head>
<body>
<div class="wrapper">
  <div class="logo">⬡ HARIT MANDALIYA</div>
  <div class="tagline">EMBEDDED SYSTEMS ENGINEER</div>

  <div class="card">
    <h1>Thanks for reaching out, <span class="highlight">{sender_name}</span> 👋</h1>
    <p>I've received your message and will get back to you shortly.</p>
    <p>In the meantime, explore my work and the <span class="highlight">Embedded Collective</span> —
       a community I built for engineers to solve real hardware and firmware challenges together.</p>
    <hr class="divider">
    <p><strong>Your message:</strong></p>
    <p style="color:#C0C0C0; font-style:italic;">"{message_excerpt}"</p>
    <hr class="divider">
    <a href="http://127.0.0.1:5173/community" class="cta">VISIT EMBEDDED COLLECTIVE →</a>
  </div>

  <div class="footer">
    © Harit Mandaliya · haritmandaliya@gmail.com<br>
    ARM7 · LPC2129 · UART · SPI · I2C · CAN · Linux
  </div>
</div>
</body>
</html>
"""

@router.post("/contact")
async def submit_contact(data: ContactFormData, current_user = Depends(require_auth)):
    # Send auto-response to the user
    html = CONTACT_RESPONSE_HTML.format(
        sender_name=data.name or current_user.display_name,
        message_excerpt=data.message[:200] + ('...' if len(data.message) > 200 else '')
    )
    await send_email(
        to=data.email or current_user.email,
        subject="Thanks for reaching out — Harit Mandaliya",
        html=html
    )
    # Forward the message to Harit's email
    await send_email(
        to="haritmandaliya@gmail.com",
        subject=f"[Portfolio Contact] {data.name}: {data.subject}",
        html=f"<p>From: {data.name} &lt;{data.email}&gt;</p><p>{data.message}</p>"
    )
    return {"status": "sent"}
```

---

## FIX GROUP 9 — FOOTER EXPANSION

**File:** `Footer.tsx` (or the portfolio footer component)

Replace the minimal footer with a full sitemap footer:

```tsx
// Full footer with all sections listed:
// Grid layout: 4 columns on desktop, 2 on tablet, 1 on mobile

const FOOTER_SECTIONS = [
  {
    title: 'PORTFOLIO',
    links: [
      { label: 'About',        href: '#about' },
      { label: 'Skills',       href: '#skills' },
      { label: 'Experience',   href: '#experience' },
      { label: 'Education',    href: '#education' },
      { label: 'Training',     href: '#training' },
      { label: 'Projects',     href: '#projects' },
      { label: 'Achievements', href: '#achievements' },
      { label: 'Contributor',  href: '#contributor' },
      { label: 'Contact',      href: '#contact' },
    ]
  },
  {
    title: 'COMMUNITY',
    links: [
      { label: 'Feed',         href: '/community' },
      { label: 'Ask a Problem',href: '/community/ask' },
      { label: 'Knowledge Base',href: '/community/kb' },
      { label: 'Leaderboard', href: '/community/leaderboard' },
      { label: 'Sign Up',      href: '/community', action: 'openAuth' },
    ]
  },
  {
    title: 'CONNECT',
    links: [
      { label: 'LinkedIn',     href: 'https://www.linkedin.com/in/harit-mandaliya-92756027b/', external: true },
      { label: 'HackerRank',   href: 'https://www.hackerrank.com/profile/haritmandaliya', external: true },
      { label: 'LeetCode',     href: 'https://leetcode.com/u/harit_mandaliya/', external: true },
      { label: 'Email',        href: 'mailto:haritmandaliya@gmail.com' },
    ]
  },
  {
    title: 'IDENTITY',
    content: (   // special "C struct" block — no links, decorative code
      <pre className="font-mono text-xs text-[--text-secondary] leading-relaxed">
{`struct India {
  Made_in_India
    Make_in_India;
};

EmbeddedSys->
  Make_in_India`}
      </pre>
    )
  }
]
```

Footer height: minimum `py-16`. Include the "SYSTEM ONLINE" blinking dot. Include copyright. Include the scanning top-border line animation (already exists in current footer).

---

## FIX GROUP 10 — SETTINGS PAGE VISIBILITY

The settings page (visible in screenshot) has invisible form fields — white inputs on white background in light mode.

In all form inputs across the app:

```css
/* Add to index.css — all inputs, textareas, selects */
input, textarea, select {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  color: var(--text-primary);
  border-radius: 8px;
  padding: 10px 14px;
  font-family: inherit;
  transition: border-color 0.15s;
}
input:focus, textarea:focus, select:focus {
  outline: none;
  border-color: var(--red-core);
  box-shadow: 0 0 0 3px rgba(192, 25, 44, 0.12);
}
input::placeholder, textarea::placeholder {
  color: var(--text-secondary);
  opacity: 0.6;
}

[data-theme="light"] input,
[data-theme="light"] textarea,
[data-theme="light"] select {
  background: #FFFFFF;
  border-color: rgba(0, 0, 0, 0.12);
  color: #0A0A0B;
}
[data-theme="light"] input::placeholder,
[data-theme="light"] textarea::placeholder {
  color: #6B7280;
}
```

---

## END-TO-END TEST SCRIPT

After all fixes, add/update `scripts/test_full.sh` to verify every critical path:

```bash
#!/bin/bash
# scripts/test_full.sh — Full E2E verification
set -e
BASE="http://127.0.0.1:8000/api/v1"

echo "=== 1. BACKEND HEALTH ==="
curl -sf "$BASE/../health" | grep -q "ok" && echo "✅ Backend alive" || echo "❌ Backend down"

echo "=== 2. PUBLIC STATS ==="
curl -sf "$BASE/stats/public" | python3 -m json.tool | grep "total_questions" && echo "✅ Stats working"

echo "=== 3. EMAIL OTP SEND ==="
RESP=$(curl -sf -X POST "$BASE/auth/otp/send" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","type":"email"}')
echo "$RESP" | grep -q "message" && echo "✅ OTP endpoint responding"
ls .run/email_previews/ 2>/dev/null | grep -q "latest" && echo "✅ Email preview saved" || echo "⚠️  No preview file"

echo "=== 4. FILE UPLOAD ==="
TOKEN=$(curl -sf -X POST "$BASE/auth/dev-login" -d '{"username":"firmware_guru","password":"password123"}' \
  -H "Content-Type: application/json" | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")
curl -sf -X POST "$BASE/uploads/" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@frontend/public/favicon.svg" \
  | grep -q "url" && echo "✅ Upload working" || echo "❌ Upload broken"

echo "=== 5. VOTE LOGIC ==="
Q_ID=$(curl -sf "$BASE/questions/?limit=1" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['items'][0]['id'] if d.get('items') else '')")
if [ -n "$Q_ID" ]; then
  curl -sf -X POST "$BASE/questions/$Q_ID/vote" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"value":1}' | grep -q "score" && echo "✅ Vote working" || echo "❌ Vote broken"
fi

echo "=== 6. FRONTEND BUILD ==="
cd frontend && npx tsc --noEmit 2>&1 | tail -5
echo "✅ TypeScript clean"

echo ""
echo "All checks complete. Review any ❌ above."
```

---

## EXECUTION ORDER

Work through these groups in sequence. Verify in browser after each group.

```
Group 1 → Fix routing + drag-drop (critical, blocks everything else)
Group 2 → Auth corrections (phone optional, email OTP real delivery)
Group 3 → Post card UI redesign (biggest visual impact)
Group 4 → Stars in portfolio
Group 5 → Contributor levels (backend algorithm + UI)
Group 6 → Light theme + fonts
Group 7 → Hero video unmuted by default + audio sync
Group 8 → Contact form auth gate + auto-response email
Group 9 → Footer expansion
Group 10→ Settings page input visibility
Final   → Run scripts/test_full.sh — all checks must pass
```

Every feature must be real and testable. No mock data. No console errors.
Run `./run.sh logs` to see OTP codes during testing (yellow highlighted).
