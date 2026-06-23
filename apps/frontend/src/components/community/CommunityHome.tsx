import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion, useMotionValue, useTransform, animate, useInView } from 'framer-motion'
import { ArrowUp, ArrowDown, MessageCircle, Eye } from 'lucide-react'
import { useCommunity, isContributorRole } from '../../context/CommunityContext'
import { Avatar } from './Avatar'
import { ContributorTag } from './ContributorTag'
import { QuestionCardSkeleton } from './QuestionCardSkeleton'
import { ImageGallery, AttachmentItem } from './ImageGallery'
import { statusChip } from './constants'
import { RelativeTime } from './RelativeTime'

interface Question {
  id: number
  title: string
  slug: string
  content: string
  category?: string
  status?: string
  author: {
    id: number
    username: string
    display_name?: string
    role?: string
    reputation: number
    profile_pic_url?: string
  }
  score: number
  views: number
  is_solved: boolean
  created_at: string
  tags: Array<{ id: number; name: string; slug: string }>
  answers?: unknown[]
  attachments?: AttachmentItem[]
}

interface LeaderboardEntry {
  id: number
  username: string
  display_name?: string
  profile_pic_url?: string
  avatar_url?: string
  reputation: number
}

function Counter({ value, decimal = false }: { value: number; decimal?: boolean }) {
  const count = useMotionValue(0)
  const rounded = useTransform(count, (latest) =>
    decimal ? latest.toFixed(1) : Math.round(latest).toString()
  )
  const ref = React.useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px 0px' })

  useEffect(() => {
    if (isInView) {
      const controls = animate(count, value, { duration: 1.2, ease: 'easeOut' })
      return controls.stop
    }
  }, [isInView, value, count])

  return <motion.span ref={ref}>{rounded}</motion.span>
}

const MEDALS = ['🥇', '🥈', '🥉']

export function CommunityHome() {
  const { user, token, setAuthModalOpen } = useCommunity()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const loadMoreRef = useRef<HTMLDivElement>(null)

  const filters = {
    q: searchParams.get('q') || '',
    category: searchParams.get('category') || '',
    status: searchParams.get('status') || '',
    sort: searchParams.get('sort') || 'newest',
    page: parseInt(searchParams.get('page') || '1', 10),
  }

  const [questions, setQuestions] = useState<Question[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [stats, setStats] = useState({ members: 0, questions: 0, solved: 0, rating: 4.9 })
  const [contributors, setContributors] = useState<LeaderboardEntry[]>([])
  const [activeTags, setActiveTags] = useState<Array<{ name: string; count: number }>>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPublicStats = () => {
      fetch('/api/stats/public')
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d) {
            setStats({
              members: d.member_count || 12,
              questions: d.total_questions || 23,
              solved: d.solved_questions || 8,
              rating: d.avg_rating || 4.9,
            })
          }
        })
        .catch(() => {})
    }

    fetchPublicStats()
    const statsInterval = setInterval(fetchPublicStats, 8000)

    fetch('/api/v1/users/leaderboard?limit=5')
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setContributors(data)
      })
      .catch(() => {})

    fetch('/api/v1/tags/?limit=8')
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data)) {
          setActiveTags(data.map((t: { name: string; count: number }) => ({ name: t.name, count: t.count })))
        }
      })
      .catch(() => {})

    return () => {
      clearInterval(statsInterval)
    }
  }, [])

  const fetchProblems = useCallback(
    async (page: number, append: boolean) => {
      if (page === 1) setLoading(true)
      else setLoadingMore(true)
      setFetchError(null)

      const params = new URLSearchParams()
      if (filters.q) params.set('q', filters.q)
      if (filters.category) params.set('category', filters.category)
      if (filters.status) params.set('status', filters.status)
      params.set('sort', filters.sort)
      params.set('page', String(page))
      params.set('limit', '15')

      try {
        const res = await fetch(`/api/v1/search/?${params}`)
        if (!res.ok) throw new Error('Failed to load')
        const data = await res.json()
        const items: Question[] = data.items || []
        setQuestions((prev) => (append ? [...prev, ...items] : items))
        setTotalPages(data.pages || 1)
      } catch {
        if (!append) {
          setQuestions([])
          setFetchError('Could not load problems. Check that the backend is running.')
        }
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [filters.q, filters.category, filters.status, filters.sort]
  )

  useEffect(() => {
    fetchProblems(1, false)
  }, [fetchProblems])

  useEffect(() => {
    if (filters.page > 1) fetchProblems(filters.page, true)
  }, [filters.page, fetchProblems])

  useEffect(() => {
    const el = loadMoreRef.current
    if (!el || filters.page >= totalPages) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !loadingMore) {
          setSearchParams((p) => {
            p.set('page', String(filters.page + 1))
            return p
          })
        }
      },
      { threshold: 0.2 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [filters.page, totalPages, loadingMore, setSearchParams])

  const requireAuth = (action: () => void) => {
    if (!user) {
      setAuthModalOpen(true, 'signin')
      return
    }
    action()
  }

  const handleVote = async (questionId: number, value: number) => {
    requireAuth(async () => {
      const res = await fetch(`/api/v1/questions/${questionId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ value }),
      })
      if (res.ok) {
        const updated = await res.json()
        setQuestions((prev) => prev.map((q) => (q.id === questionId ? { ...q, score: updated.score } : q)))
      }
    })
  }

  const renderCard = (q: Question, index: number) => {
    const chip = statusChip(q.status, q.is_solved)
    const commentCount = q.answers?.length ?? 0
    const authorName = q.author.display_name || q.author.username

    return (
      <article
        key={q.id}
        className={`glass-card rounded-xl border border-white/10 hover:border-red-core/30 overflow-hidden transition-all duration-300 shadow-lg hover:shadow-[0_4px_20px_rgba(0,0,0,0.4)] flex flex-col ${
          q.is_solved ? 'border-green-500/20' : ''
        }`}
        style={{ animationDelay: `${index * 80}ms` }}
      >
        {/* Post Card Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <Link to={`/community/u/${q.author.username}`}>
              <Avatar user={q.author} size={36} />
            </Link>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <Link
                  to={`/community/u/${q.author.username}`}
                  className="text-text-primary text-sm font-semibold hover:text-red-glow transition-colors"
                >
                  {authorName}
                </Link>
                {isContributorRole(q.author.role) && <ContributorTag />}
              </div>
              <span className="text-[10px] text-text-muted font-mono">
                @{q.author.username} · <RelativeTime iso={q.created_at} />
              </span>
            </div>
          </div>
          <span className={`font-mono text-[9px] px-2 py-0.5 rounded border uppercase tracking-wider ${chip.className}`}>
            {chip.label}
          </span>
        </div>

        {/* Post Card Body */}
        <div className="p-5 flex-1 flex flex-col">
          <Link
            to={`/community/q/${q.slug}`}
            className="font-heading font-bold text-lg text-text-primary hover:text-red-glow transition-colors block mb-2 leading-snug"
          >
            {q.title}
          </Link>
          <p className="text-sm text-text-secondary leading-relaxed mb-4 flex-1 line-clamp-3">
            {q.content}
          </p>

          {/* Image Gallery Grid */}
          {q.attachments && q.attachments.some((a) => a.mime_type.startsWith('image/')) && (
            <Link to={`/community/q/${q.slug}`} className="block mb-4">
              <ImageGallery attachments={q.attachments} compact />
            </Link>
          )}

          {/* Tags */}
          {q.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {q.tags.slice(0, 4).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() =>
                    setSearchParams((p) => {
                      p.delete('category')
                      p.set('q', t.name)
                      p.set('page', '1')
                      return p
                    })
                  }
                  className="font-mono text-[10px] px-2 py-0.5 rounded border border-cyan-spark/20 bg-cyan-spark/5 text-cyan-spark hover:border-cyan-spark/50 hover:bg-cyan-spark/10 transition-all"
                >
                  #{t.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Post Card Footer Actions */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-white/[0.02] border-t border-white/[0.06]">
          {/* Vote widget */}
          <div className="flex items-center gap-1.5 bg-white/[0.04] border border-white/10 rounded-full px-2.5 py-1">
            <button
              type="button"
              onClick={() => handleVote(q.id, 1)}
              className="text-text-secondary hover:text-[var(--accent-cyan)] transition-colors p-0.5"
              aria-label="Upvote"
            >
              <ArrowUp size={16} />
            </button>
            <span className="font-mono text-xs font-bold text-text-primary px-0.5 min-w-[12px] text-center">{q.score}</span>
            <button
              type="button"
              onClick={() => handleVote(q.id, -1)}
              className="text-text-secondary hover:text-[var(--accent-red)] transition-colors p-0.5"
              aria-label="Downvote"
            >
              <ArrowDown size={16} />
            </button>
          </div>

          {/* Comments & Views */}
          <div className="flex items-center gap-4 text-xs text-text-muted font-mono">
            <Link to={`/community/q/${q.slug}`} className="flex items-center gap-1.5 hover:text-text-primary transition-colors">
              <MessageCircle size={14} className="text-red-core/60" />
              <span>{commentCount} replies</span>
            </Link>
            <span className="flex items-center gap-1.5">
              <Eye size={14} />
              <span>{q.views} views</span>
            </span>
          </div>
        </div>
      </article>
    )
  }

  return (
    <div className="relative">
      <section className="community-hero relative min-h-[60vh] flex items-center px-6 border-b border-[var(--border-subtle)]">
        <div className="max-w-[1200px] mx-auto w-full py-16 relative z-10">
          <p className="font-mono text-[var(--accent-cyan)] text-xs mb-4 tracking-wider">// PLATFORM GATEWAY</p>
          <h1
            className="font-[family-name:var(--font-display)] font-bold text-4xl md:text-[56px] text-text-primary mb-4 leading-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {user ? `⬡ WELCOME BACK, ${user.username.toUpperCase()}` : '⬡ EMBEDDED COLLECTIVE'}
          </h1>
          <p className="italic text-text-secondary max-w-2xl mb-8 text-lg">
            &ldquo;Connect. Debug. Collaborate. Build Better Embedded Systems.&rdquo;
          </p>

          <div className="community-hero-line max-w-3xl mb-10" />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10 max-w-3xl">
            {[
              { label: 'QUESTIONS', value: stats.questions },
              { label: 'SOLVED', value: stats.solved, suffix: ' ✓' },
              { label: 'MEMBERS', value: stats.members },
              { label: 'RATING', value: stats.rating, decimal: true, suffix: '★' },
            ].map((item) => (
              <div key={item.label} className="stat-card p-4 text-center">
                <span className="font-[family-name:var(--font-display)] font-bold text-2xl md:text-3xl text-text-primary block">
                  <Counter value={item.value} decimal={item.decimal} />
                  {item.suffix || ''}
                </span>
                <span className="font-mono text-[10px] text-text-muted uppercase tracking-wider mt-1 block">
                  {item.label}
                </span>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            {user ? (
              <>
                <button
                  type="button"
                  onClick={() => navigate('/community/ask')}
                  className="font-mono text-xs px-5 py-2.5 rounded-full bg-[var(--accent-red)] text-white hover:shadow-[var(--shadow-glow-r)] transition-all glow-pulse-btn"
                >
                  Ask a Question ↗
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/community/u/${user.username}`)}
                  className="font-mono text-xs px-5 py-2.5 rounded-full border border-[var(--border-normal)] hover:border-[var(--accent-cyan)] hover:shadow-[var(--shadow-glow-c)] transition-all"
                >
                  My Profile →
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => window.scrollTo({ top: 520, behavior: 'smooth' })}
                  className="font-mono text-xs px-5 py-2.5 rounded-full border border-[var(--border-normal)] hover:border-[var(--accent-cyan)] hover:shadow-[var(--shadow-glow-c)] transition-all"
                >
                  Take a Tour →
                </button>
                <button
                  type="button"
                  onClick={() => requireAuth(() => navigate('/community/ask'))}
                  className="font-mono text-xs px-5 py-2.5 rounded-full bg-[var(--accent-red)] text-white hover:shadow-[var(--shadow-glow-r)] transition-all glow-pulse-btn"
                >
                  Join the Platform ↗
                </button>
                <button
                  type="button"
                  onClick={() => setAuthModalOpen(true, 'signup')}
                  className="font-mono text-xs px-5 py-2.5 rounded-full border border-[var(--border-cyan)] text-[var(--text-code)] hover:bg-[var(--accent-cyan-dim)] transition-colors"
                >
                  Join Free
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      <div className="community-main">
        <div className="space-y-4 min-w-0">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <QuestionCardSkeleton key={i} />)
          ) : fetchError ? (
            <div className="problem-card p-12 text-center">
              <p className="text-[var(--accent-red)] font-mono text-sm mb-2">{fetchError}</p>
              <button type="button" onClick={() => fetchProblems(1, false)} className="font-mono text-xs underline">
                Retry
              </button>
            </div>
          ) : questions.length === 0 ? (
            <div className="problem-card p-12 text-center">
              <span className="text-[var(--accent-red)] text-3xl block mb-4">⬡</span>
              <p className="font-[family-name:var(--font-display)] text-text-primary mb-2">
                No problems match your filters.
              </p>
              <p className="text-sm text-text-secondary mb-6">Be the first to post in this category</p>
              <button
                type="button"
                onClick={() => requireAuth(() => navigate('/community/ask'))}
                className="font-mono text-xs text-[var(--accent-red)] hover:underline"
              >
                Post the first problem →
              </button>
            </div>
          ) : (
            questions.map((q, i) => renderCard(q, i))
          )}

          {loadingMore && <QuestionCardSkeleton />}
          <div ref={loadMoreRef} className="h-4" />
        </div>

        <aside className="hidden lg:block space-y-6">
          <div className="glass-card p-5 rounded-[var(--radius-lg)] border border-[var(--border-subtle)]">
            <h3 className="font-mono text-xs uppercase tracking-wider text-text-primary mb-4 border-b border-[var(--border-subtle)] pb-2">
              Top Contributors
            </h3>
            <ul className="space-y-3">
              {contributors.map((c, i) => (
                <li key={c.id}>
                  <Link
                    to={`/community/u/${c.username}`}
                    className="flex items-center gap-2 group hover:text-[var(--accent-cyan)] transition-colors"
                  >
                    <span className="w-5 text-center text-sm">{MEDALS[i] || '·'}</span>
                    <Avatar user={c} size={28} />
                    <span className="font-mono text-xs text-text-primary group-hover:text-[var(--accent-cyan)] truncate">
                      {c.display_name || c.username}
                    </span>
                    <span className="font-mono text-[10px] text-text-muted ml-auto shrink-0">
                      {c.reputation} ans
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              to="/community/leaderboard"
              className="mt-4 block font-mono text-[10px] text-[var(--accent-red)] hover:underline"
            >
              See full leaderboard →
            </Link>
          </div>

          <div className="glass-card p-5 rounded-[var(--radius-lg)] border border-[var(--border-subtle)]">
            <h3 className="font-mono text-xs uppercase tracking-wider text-text-primary mb-4 border-b border-[var(--border-subtle)] pb-2">
              Active Tags
            </h3>
            <div className="flex flex-wrap gap-2">
              {activeTags.map((t) => (
                <button
                  key={t.name}
                  type="button"
                  onClick={() =>
                    setSearchParams((p) => {
                      p.delete('category')
                      p.set('q', t.name)
                      p.set('page', '1')
                      return p
                    })
                  }
                  className="tag-pill-cyan"
                >
                  #{t.name}({t.count})
                </button>
              ))}
            </div>
          </div>

          <div className="glass-card p-5 rounded-[var(--radius-lg)] border border-[var(--border-accent)]">
            <h3 className="font-mono text-xs uppercase tracking-wider text-[var(--accent-red)] mb-1">
              Ask a Question
            </h3>
            <div className="h-0.5 w-12 bg-[var(--accent-red)] mb-3" />
            <p className="font-mono text-[11px] text-text-secondary mb-4">Having an embedded problem?</p>
            <button
              type="button"
              onClick={() => requireAuth(() => navigate('/community/ask'))}
              className="w-full font-mono text-xs py-2.5 rounded bg-[var(--accent-red)] text-white hover:shadow-[var(--shadow-glow-r)] transition-all"
            >
              Post Your Problem →
            </button>
          </div>
        </aside>
      </div>
    </div>
  )
}
