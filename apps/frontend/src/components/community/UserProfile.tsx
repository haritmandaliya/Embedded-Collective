import React, { useState, useEffect, useCallback } from 'react'
import { Link, useParams, Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Calendar,
  Download,
  FileQuestion,
  Pencil,
  Trophy,
  Target,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react'
import { useCommunity, isContributorRole } from '../../context/CommunityContext'
import { Avatar } from './Avatar'
import { ContributorTag } from './ContributorTag'
import { statusChip } from './constants'
import { RelativeTime } from './RelativeTime'

interface PublicProfile {
  id: number
  username: string
  display_name: string
  role: string
  profile_pic_url?: string
  reputation: number
  created_at: string
  questions_count: number
  answers_count: number
  accepted_count: number
  bio?: string
  education?: string
  higher_edu?: string
  resume_url?: string
}

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
  }
  score: number
  views: number
  is_solved: boolean
  created_at: string
  tags: Array<{ id: number; name: string; slug: string }>
}

interface SolutionItem {
  answerId: number
  questionTitle: string
  questionSlug: string
  content: string
  isAccepted: boolean
  created_at: string
  score: number
}

type ProfileTab = 'problems' | 'solutions'

function SolutionSeekerBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 font-mono text-[10px] text-amber-400 uppercase tracking-wider">
      <HelpCircle size={9} />
      SOLUTION SEEKER
    </span>
  )
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string
  value: string | number
  icon: React.ReactNode
}) {
  return (
    <div className="glass-card p-4 rounded-lg border border-[--glass-border] text-center">
      <div className="flex justify-center mb-2 text-[--red-core]">{icon}</div>
      <p className="font-heading font-bold text-xl text-text-primary">{value}</p>
      <p className="font-mono text-[10px] text-text-secondary uppercase mt-1">{label}</p>
    </div>
  )
}

function QuestionList({ questions }: { questions: Question[] }) {
  if (questions.length === 0) {
    return (
      <div className="glass-card p-8 rounded-lg border border-[--glass-border] text-center">
        <FileQuestion size={32} className="mx-auto text-text-secondary mb-3 opacity-50" />
        <p className="font-mono text-xs text-text-secondary">No problems posted yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {questions.map((q) => {
        const chip = statusChip(q.status, q.is_solved)
        return (
          <motion.article
            key={q.id}
            layout
            className="glass-card p-5 rounded-lg border border-[--glass-border] hover:border-[--red-core]/30 transition-colors"
          >
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className={`font-mono text-[10px] px-2 py-0.5 rounded border ${chip.className}`}>
                {chip.label}
              </span>
              {q.category && (
                <span className="font-mono text-[10px] px-2 py-0.5 rounded border border-[--glass-border] text-text-secondary">
                  {q.category.replace(' Problems', '').replace(' Issues', '').replace(' Protocols', '')}
                </span>
              )}
            </div>
            <Link
              to={`/community/q/${q.slug}`}
              className="font-heading text-lg text-text-primary hover:text-[--red-glow] transition-colors block mb-2 line-clamp-2"
            >
              {q.title}
            </Link>
            <p className="font-body text-sm text-text-secondary line-clamp-2 mb-3">
              {q.content.slice(0, 150)}
              {q.content.length > 150 ? '…' : ''}
            </p>
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-text-secondary">
              <span><RelativeTime iso={q.created_at} /></span>
              <span>·</span>
              <span>{q.score} votes</span>
              <span>·</span>
              <span>{q.views} views</span>
            </div>
            {q.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {q.tags.slice(0, 4).map((t) => (
                  <span
                    key={t.id}
                    className="font-mono text-[9px] px-2 py-0.5 rounded bg-white/5 border border-[--glass-border] text-text-secondary"
                  >
                    {t.name.toUpperCase()}
                  </span>
                ))}
              </div>
            )}
          </motion.article>
        )
      })}
    </div>
  )
}

function SolutionList({ solutions }: { solutions: SolutionItem[] }) {
  if (solutions.length === 0) {
    return (
      <div className="glass-card p-8 rounded-lg border border-[--glass-border] text-center">
        <CheckCircle2 size={32} className="mx-auto text-text-secondary mb-3 opacity-50" />
        <p className="font-mono text-xs text-text-secondary">No solutions posted yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {solutions.map((s) => (
        <motion.article
          key={s.answerId}
          layout
          className="glass-card p-5 rounded-lg border border-[--glass-border] hover:border-[--cyan-spark]/30 transition-colors"
        >
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {s.isAccepted && (
              <span className="font-mono text-[10px] px-2 py-0.5 rounded border bg-green-500/10 text-green-400 border-green-500/30">
                ACCEPTED
              </span>
            )}
            <span className="font-mono text-[10px] px-2 py-0.5 rounded border border-[--cyan-spark]/30 text-[--cyan-spark] bg-[--cyan-spark]/5">
              SOLUTION
            </span>
          </div>
          <Link
            to={`/community/q/${s.questionSlug}`}
            className="font-heading text-lg text-text-primary hover:text-[--cyan-spark] transition-colors block mb-2 line-clamp-1"
          >
            Re: {s.questionTitle}
          </Link>
          <p className="font-body text-sm text-text-secondary line-clamp-3 mb-3">
            {s.content.slice(0, 200)}
            {s.content.length > 200 ? '…' : ''}
          </p>
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-text-secondary">
            <span><RelativeTime iso={s.created_at} /></span>
            <span>·</span>
            <span>{s.score} votes</span>
          </div>
        </motion.article>
      ))}
    </div>
  )
}

interface LevelThreshold {
  level: number
  title: string
  minRep: number
  maxRep: number
}

const LEVEL_THRESHOLDS: LevelThreshold[] = [
  { level: 1, title: 'UART Novice', minRep: 0, maxRep: 49 },
  { level: 2, title: 'SPI Apprentice', minRep: 50, maxRep: 99 },
  { level: 3, title: 'I2C Practitioner', minRep: 100, maxRep: 199 },
  { level: 4, title: 'DMA Craftsman', minRep: 200, maxRep: 399 },
  { level: 5, title: 'Firmware Engineer', minRep: 400, maxRep: 799 },
  { level: 6, title: 'Kernel Expert', minRep: 800, maxRep: 1499 },
  { level: 7, title: 'Hardware Architect', minRep: 1500, maxRep: 2999 },
  { level: 8, title: 'Core Designer', minRep: 3000, maxRep: 5999 },
  { level: 9, title: 'System Principal', minRep: 6000, maxRep: 9999 },
  { level: 10, title: 'Embedded Guru', minRep: 10000, maxRep: 999999 },
]

function getLevelInfo(rep: number) {
  const current = LEVEL_THRESHOLDS.find(t => rep >= t.minRep && rep <= t.maxRep) || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1]
  const next = LEVEL_THRESHOLDS.find(t => t.level === current.level + 1) || null
  return { current, next }
}

export function UserProfile() {
  const { username: routeUsername, id: routeId } = useParams<{ username?: string; id?: string }>()
  const { user } = useCommunity()

  const [resolvedUsername, setResolvedUsername] = useState<string | null>(routeUsername ?? null)
  const [legacyRedirect, setLegacyRedirect] = useState<string | null>(null)
  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [solutions, setSolutions] = useState<SolutionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingSolutions, setLoadingSolutions] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<ProfileTab>('problems')

  const isContributor = profile ? isContributorRole(profile.role) : false
  const isOwnProfile = user?.username === profile?.username

  // Resolve username or ID from route params
  useEffect(() => {
    if (routeUsername) {
      setResolvedUsername(routeUsername)
      return
    }

    if (routeId) {
      setResolvedUsername(routeId)
      return
    }

    setError('User not found')
    setLoading(false)
  }, [routeUsername, routeId])

  const fetchQuestions = useCallback(async (username: string) => {
    const res = await fetch('/api/v1/questions/?limit=20')
    if (!res.ok) return []
    const data: Question[] = await res.json()
    if (!Array.isArray(data)) return []
    return data.filter((q) => q.author?.username === username)
  }, [])

  const fetchSolutions = useCallback(async (username: string) => {
    setLoadingSolutions(true)
    try {
      const listRes = await fetch('/api/v1/questions/?solved=true&limit=30')
      if (!listRes.ok) return []
      const solvedQuestions: Question[] = await listRes.json()
      if (!Array.isArray(solvedQuestions)) return []

      const detailResults = await Promise.all(
        solvedQuestions.slice(0, 15).map(async (q) => {
          const res = await fetch(`/api/v1/questions/${q.slug}`)
          if (!res.ok) return []
          const detail = await res.json()
          const answers = detail.answers ?? []
          return answers
            .filter((a: { author?: { username?: string } }) => a.author?.username === username)
            .map(
              (a: {
                id: number
                content: string
                is_accepted: boolean
                created_at: string
                score: number
              }) => ({
                answerId: a.id,
                questionTitle: detail.title,
                questionSlug: detail.slug,
                content: a.content,
                isAccepted: a.is_accepted,
                created_at: a.created_at,
                score: a.score,
              }),
            )
        }),
      )

      return detailResults.flat() as SolutionItem[]
    } finally {
      setLoadingSolutions(false)
    }
  }, [])

  // Fetch public profile and questions
  useEffect(() => {
    if (!resolvedUsername || legacyRedirect) return

    let cancelled = false
    setLoading(true)
    setError(null)

    const load = async () => {
      try {
        const profileRes = await fetch(
          `/api/v1/users/${encodeURIComponent(resolvedUsername)}`,
        )
        if (!profileRes.ok) {
          if (!cancelled) {
            setError(profileRes.status === 404 ? 'User not found' : 'Failed to load profile')
            setProfile(null)
          }
          return
        }

        const profileData: PublicProfile = await profileRes.json()
        if (cancelled) return
        setProfile(profileData)
        
        if (routeId) {
          setLegacyRedirect(`/community/u/${profileData.username}`)
          return
        }

        const userQuestions = await fetchQuestions(profileData.username)
        if (cancelled) return
        setQuestions(userQuestions)

        if (isContributorRole(profileData.role)) {
          const userSolutions = await fetchSolutions(profileData.username)
          if (!cancelled) setSolutions(userSolutions)
        }
      } catch {
        if (!cancelled) setError('Connection error')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [resolvedUsername, legacyRedirect, fetchQuestions, fetchSolutions])

  if (legacyRedirect) {
    return <Navigate to={legacyRedirect} replace />
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[--bg-void] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[--red-core] border-t-transparent animate-spin" />
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-[--bg-void] text-text-primary pt-24 pb-16 px-6">
        <div className="max-w-md mx-auto glass-card p-8 rounded-lg border border-[--red-core]/30 text-center">
          <p className="font-mono text-xs text-[--red-glow] uppercase">{error ?? 'User not found'}</p>
          <Link
            to="/community"
            className="inline-block mt-6 font-mono text-xs text-[--red-core] hover:text-[--red-glow] transition-colors"
          >
            ← Back to community
          </Link>
        </div>
      </div>
    )
  }

  const acceptRate =
    profile.answers_count > 0
      ? Math.round((profile.accepted_count / profile.answers_count) * 100)
      : 0

  const joinedDate = new Date(profile.created_at).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
  })

  const rep = profile.reputation
  const { current: lvl, next: nextLvl } = getLevelInfo(rep)
  const progressPercent = nextLvl ? Math.min(100, Math.max(0, ((rep - lvl.minRep) / (nextLvl.minRep - lvl.minRep)) * 100)) : 100

  const tabs: { key: ProfileTab; label: string; count: number }[] = isContributor
    ? [
        { key: 'solutions', label: 'SOLUTIONS', count: profile.answers_count },
        { key: 'problems', label: 'PROBLEMS', count: profile.questions_count },
      ]
    : [{ key: 'problems', label: 'PROBLEMS', count: profile.questions_count }]

  return (
    <div className="min-h-screen bg-[--bg-void] text-text-primary pt-24 pb-16 px-6 relative">
      <div
        className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 30 L30 30 L30 0' fill='none' stroke='%23C0192C' stroke-width='1'/%3E%3C/svg%3E")`,
        }}
      />

      <div className="max-w-3xl mx-auto relative z-10">
        {/* Header card */}
        <div className="glass-card p-6 md:p-8 rounded-lg border border-[--glass-border] mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start gap-6">
            {/* Avatar */}
            <div className="shrink-0 mx-auto sm:mx-0">
              {isContributor ? (
                <div className="rounded-full p-1 ring-2 ring-[--red-core]/70 ring-offset-2 ring-offset-[--bg-void]">
                  <Avatar user={profile} size={96} className="ring-0" />
                </div>
              ) : (
                <Avatar user={profile} size={80} />
              )}
            </div>

            {/* Identity */}
            <div className="flex-1 text-center sm:text-left min-w-0">
              <div className="flex flex-wrap items-center justify-center sm:justify-between gap-3 mb-1">
                <h1 className="font-heading font-bold text-2xl text-text-primary truncate">
                  {profile.display_name}
                </h1>
                {isOwnProfile && (
                  <Link
                    to="/community/settings"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-[--glass-border] font-mono text-[10px] uppercase text-text-secondary hover:text-text-primary hover:border-[--red-core]/40 transition-colors"
                  >
                    <Pencil size={12} />
                    Edit Profile
                  </Link>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-4">
                <span className="font-mono text-sm text-text-secondary">@{profile.username}</span>
                <span className="text-text-secondary opacity-40">·</span>
                {isContributor ? <ContributorTag /> : <SolutionSeekerBadge />}
                <span className="text-text-secondary opacity-40">·</span>
                <span className="font-mono text-[11px] text-text-secondary inline-flex items-center gap-1">
                  <Calendar size={12} className="text-[--red-core]" />
                  Joined {joinedDate}
                </span>
              </div>

              {/* Contributor-only fields */}
              {isContributor && (
                <>
                  {(profile.education || profile.higher_edu) && (
                    <div className="flex flex-wrap justify-center sm:justify-start gap-2 mb-4">
                      {profile.education && (
                        <span className="font-mono text-[10px] px-2.5 py-1 rounded-full bg-white/5 border border-[--glass-border] text-text-secondary">
                          {profile.education}
                        </span>
                      )}
                      {profile.higher_edu && (
                        <span className="font-mono text-[10px] px-2.5 py-1 rounded-full bg-white/5 border border-[--glass-border] text-text-secondary">
                          {profile.higher_edu}
                        </span>
                      )}
                    </div>
                  )}

                  {profile.bio && (
                    <p className="font-body text-sm text-text-secondary leading-relaxed mb-4 max-w-xl">
                      {profile.bio}
                    </p>
                  )}
                </>
              )}

              {/* Stats */}
              {isContributor ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  <StatCard label="XP" value={profile.reputation.toLocaleString()} icon={<Trophy size={18} />} />
                  <StatCard label="Solved" value={profile.accepted_count} icon={<CheckCircle2 size={18} />} />
                  <StatCard label="Accept Rate" value={`${acceptRate}%`} icon={<Target size={18} />} />
                  <StatCard label="Asked" value={profile.questions_count} icon={<HelpCircle size={18} />} />
                </div>
              ) : (
                <div className="flex flex-wrap justify-center sm:justify-start gap-4 mb-2">
                  <div className="glass-card px-4 py-2 rounded-lg border border-[--glass-border]">
                    <p className="font-mono text-[10px] text-text-secondary uppercase">Problems Posted</p>
                    <p className="font-heading font-bold text-lg text-text-primary">{profile.questions_count}</p>
                  </div>
                  <div className="glass-card px-4 py-2 rounded-lg border border-[--glass-border]">
                    <p className="font-mono text-[10px] text-text-secondary uppercase">Comments</p>
                    <p className="font-heading font-bold text-lg text-text-primary">{profile.answers_count}</p>
                  </div>
                </div>
              )}

              {/* Resume download */}
              {isContributor && profile.resume_url && (
                <a
                  href={profile.resume_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 mt-2 px-4 py-2 rounded border border-[--cyan-spark]/30 bg-[--cyan-spark]/5 font-mono text-xs text-[--cyan-spark] hover:bg-[--cyan-spark]/10 transition-colors"
                >
                  <Download size={14} />
                  Download Resume
                </a>
              )}
              {/* Contributor Level Progress Bar */}
              {isContributor && (
                <div className="mt-6 mb-2 glass-card p-4 rounded-lg border border-white/5 bg-white/[0.01]">
                  <div className="flex justify-between items-center mb-1.5 font-mono text-[10px]">
                    <span className="text-white font-bold">
                      LEVEL {lvl.level}: <span className="text-[--cyan-spark]">{lvl.title.toUpperCase()}</span>
                    </span>
                    <span className="text-text-secondary">
                      {rep} / {nextLvl ? nextLvl.minRep : 'MAX'} XP
                    </span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden border border-white/[0.08]">
                    <div
                      className="bg-gradient-to-r from-[--red-core] to-[--cyan-spark] h-full rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(192,25,44,0.5)]"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  {nextLvl && (
                    <p className="font-mono text-[9px] text-text-muted mt-1.5 text-right uppercase">
                      {nextLvl.minRep - rep} XP TO LEVEL {nextLvl.level} ({nextLvl.title})
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-[--glass-border]">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 font-mono text-xs uppercase tracking-wider transition-colors border-b-2 -mb-px ${
                activeTab === tab.key
                  ? 'border-[--red-core] text-text-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              {tab.label}
              <span className="ml-1.5 opacity-60">({tab.count})</span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'problems' && <QuestionList questions={questions} />}

        {activeTab === 'solutions' && isContributor && (
          loadingSolutions ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 rounded-full border-2 border-[--cyan-spark] border-t-transparent animate-spin" />
            </div>
          ) : (
            <SolutionList solutions={solutions} />
          )
        )}
      </div>
    </div>
  )
}
