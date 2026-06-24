import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowUp, ArrowDown, Check, MessageSquare, Star, Send, Award, AlertTriangle, Share2, Linkedin, Twitter, Copy, CheckCircle2 } from 'lucide-react'
import { useCommunity, isContributorRole } from '../../context/CommunityContext'
import { Avatar } from './Avatar'
import { ContributorTag } from './ContributorTag'
import { ImageGallery, AttachmentItem } from './ImageGallery'
import { statusChip } from './constants'
import { RelativeTime } from './RelativeTime'

interface Comment {
  id: number
  content: string
  created_at: string
  author: { 
    id?: number
    username: string 
    reputation: number
    role?: string
    display_name?: string
    profile_pic_url?: string
  }
}

interface Answer {
  id: number
  content: string
  author: { id: number; username: string; reputation: number; role?: string; display_name?: string; profile_pic_url?: string }
  created_at: string
  score: number
  is_accepted: boolean
  is_solution?: boolean
  comments: Comment[]
}

interface Question {
  id: number
  title: string
  slug: string
  content: string
  author: { id: number; username: string; reputation: number; role?: string; display_name?: string; profile_pic_url?: string }
  score: number
  views: number
  is_solved: boolean
  status?: string
  created_at: string
  tags: Array<{ name: string }>
  comments: Comment[]
  answers: Answer[]
  attachments?: AttachmentItem[]
}

export function QuestionDetail() {
  const { slug } = useParams<{ slug: string }>()
  const { user, token, setAuthModalOpen } = useCommunity()

  // State
  const [question, setQuestion] = useState<Question | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [newAnswer, setNewAnswer] = useState('')
  const [newCommentText, setNewCommentText] = useState<{ [key: string]: string }>({}) // Key: 'q' or 'a-{id}'
  const [showCommentForm, setShowCommentForm] = useState<{ [key: string]: boolean }>({})

  // Modal States
  const [showRatingModal, setShowRatingModal] = useState(false)
  const [selectedRating, setSelectedRating] = useState(5)
  const [_ratingTarget, setRatingTarget] = useState<number | null>(null)

  // Report Modal State
  const [isReportOpen, setIsReportOpen] = useState(false)
  const [reportType, setReportType] = useState<'question' | 'answer'>('question')
  const [reportTargetId, setReportTargetId] = useState<number | null>(null)
  const [reportReason, setReportReason] = useState('')
  const [reporting, setReporting] = useState(false)

  // Share state
  const [shareData, setShareData] = useState<{ linkedin_url: string; twitter_url: string; url: string } | null>(null)
  const [linkCopied, setLinkCopied] = useState(false)
  const [showSharePanel, setShowSharePanel] = useState(false)

  // Fetch question detail
  const fetchQuestionDetail = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`/api/v1/questions/${slug}`)
      if (!res.ok) throw new Error('Question not found in archives')
      const data = await res.json()
      setQuestion(data)
    } catch (err: any) {
      setError(err.message || 'Failed to download question thread')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (slug) {
      fetchQuestionDetail()
    }
  }, [slug])

  // Poll views and score updates in realtime without inflating views count
  useEffect(() => {
    if (!slug) return
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/v1/questions/${slug}?inc_views=false`)
        if (res.ok) {
          const data = await res.json()
          setQuestion(prev => prev ? {
            ...prev,
            views: data.views,
            score: data.score,
            answers: prev.answers.map(a => {
              const updated = data.answers.find((ua: any) => ua.id === a.id)
              return updated ? { ...a, score: updated.score, is_accepted: updated.is_accepted } : a
            })
          } : null)
        }
      } catch (err) {
        console.error('Failed to poll question updates', err)
      }
    }, 8000) // Poll every 8 seconds
    return () => clearInterval(interval)
  }, [slug])

  // Voting Handlers
  const handleVote = async (type: 'q' | 'a', targetId: number, value: number) => {
    if (!user) {
      setAuthModalOpen(true, 'signin')
      return
    }

    try {
      const endpoint = type === 'q' 
        ? `/api/v1/questions/${targetId}/vote` 
        : `/api/v1/answers/${targetId}/vote`

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ value })
      })

      if (res.ok) {
        const updated = await res.json()
        if (type === 'q') {
          setQuestion(prev => prev ? { ...prev, score: updated.score } : null)
        } else {
          setQuestion(prev => prev ? {
            ...prev,
            answers: prev.answers.map(a => a.id === targetId ? { ...a, score: updated.score } : a)
          } : null)
        }
      }
    } catch (err) {
      console.error('Failed to register vote', err)
    }
  }

  // Accept Answer Solution
  const handleAccept = async (answerId: number) => {
    if (!user) {
      setAuthModalOpen(true, 'signin')
      return
    }

    // Check authorization: only admin or question author can accept
    if (user.role !== 'admin' && question?.author.id !== user.id) {
      alert('Only the author of the question can accept the solution.')
      return
    }

    try {
      const res = await fetch(`/api/v1/answers/${answerId}/accept`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (res.ok) {
        const updatedAnswer = await res.json()
        // If it was accepted (is_accepted: true), open rating modal
        if (updatedAnswer.is_accepted) {
          setRatingTarget(answerId)
          setShowRatingModal(true)
        }

        // Refresh question details to reflect reputation and solved changes
        fetchQuestionDetail()
      } else {
        alert('Failed to accept solution')
      }
    } catch (err) {
      console.error(err)
    }
  }

  // Comment Submission
  const submitComment = async (type: 'q' | 'a', targetId: number) => {
    if (!user) {
      setAuthModalOpen(true, 'signin')
      return
    }

    const key = type === 'q' ? 'q' : `a-${targetId}`
    const text = newCommentText[key]
    if (!text || !text.trim()) return

    try {
      const endpoint = type === 'q' 
        ? `/api/v1/questions/${targetId}/comments` 
        : `/api/v1/answers/${targetId}/comments`

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content: text })
      })

      if (res.ok) {
        const newComment = await res.json()
        
        // Update state locally
        if (type === 'q') {
          setQuestion(prev => prev ? {
            ...prev,
            comments: [...prev.comments, newComment]
          } : null)
        } else {
          setQuestion(prev => prev ? {
            ...prev,
            answers: prev.answers.map(a => a.id === targetId ? {
              ...a,
              comments: [...a.comments, newComment]
            } : a)
          } : null)
        }

        // Clear comment box
        setNewCommentText(prev => ({ ...prev, [key]: '' }))
        setShowCommentForm(prev => ({ ...prev, [key]: false }))
      }
    } catch (err) {
      console.error(err)
    }
  }

  // Submit Answer Response
  const submitAnswer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      setAuthModalOpen(true, 'signin')
      return
    }

    if (!newAnswer.trim() || !question) return

    const isSolution = true

    try {
      const res = await fetch('/api/v1/answers/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ question_id: question.id, content: newAnswer, is_solution: isSolution })
      })

      if (res.ok) {
        const created = await res.json()
        setQuestion(prev => prev ? {
          ...prev,
          answers: [...prev.answers, created]
        } : null)
        setNewAnswer('')
      } else {
        alert('Failed to submit answer')
      }
    } catch (err) {
      console.error(err)
    }
  }

  // Report submission handler
  const handleOpenReport = (type: 'question' | 'answer', id: number) => {
    if (!user) {
      setAuthModalOpen(true, 'signin')
      return
    }
    setReportType(type)
    setReportTargetId(id)
    setReportReason('')
    setIsReportOpen(true)
  }

  const submitReport = async () => {
    if (!reportReason.trim() || !reportTargetId) return
    setReporting(true)

    try {
      const endpoint = reportType === 'question'
        ? `/api/v1/questions/${reportTargetId}/report`
        : `/api/v1/answers/${reportTargetId}/report`

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reason: reportReason })
      })

      if (res.ok) {
        alert('Thank you. Content flagged for moderation analysis.')
        setIsReportOpen(false)
      } else {
        alert('Failed to transmit flag')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setReporting(false)
    }
  }

  const renderInstagramComment = (c: Comment) => {
    return (
      <div 
        key={c.id} 
        className="flex items-start gap-3 py-2.5 px-3 bg-white/[0.01] hover:bg-white/[0.03] border border-white/[0.02] rounded-lg transition-all group"
      >
        <Link to={`/community/u/${c.author.username}`} className="flex-shrink-0">
          <Avatar user={c.author} size={28} className="ring-1 ring-cyan-spark/20" />
        </Link>
        <div className="flex-grow min-w-0">
          <div className="text-xs leading-relaxed text-text-primary">
            <Link 
              to={`/community/u/${c.author.username}`} 
              className="font-mono font-bold text-cyan-spark hover:text-cyan-glow transition-colors mr-2 inline-flex items-center gap-1"
            >
              @{c.author.username}
              {isContributorRole(c.author.role) && (
                <span className="w-1 h-1 rounded-full bg-red-core" title="Contributor" />
              )}
            </Link>
            <span className="text-text-secondary whitespace-pre-wrap select-text">{c.content}</span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-[9px] font-mono text-text-secondary/60">
            <span><RelativeTime iso={c.created_at} /></span>
            {c.author.reputation !== undefined && (
              <span className="text-red-glow/50">{c.author.reputation} XP</span>
            )}
          </div>
        </div>
      </div>
    )
  }

  const renderCommentForm = (type: 'q' | 'a', targetId: number) => {
    const key = type === 'q' ? 'q' : `a-${targetId}`
    const text = newCommentText[key] || ''
    
    if (!user) {
      return (
        <div className="mt-2 py-2 px-3 border border-dashed border-white/10 rounded-lg text-center bg-white/[0.01]">
          <button
            onClick={() => setAuthModalOpen(true, 'signin')}
            className="font-mono text-[10px] text-text-secondary hover:text-cyan-spark transition-colors"
          >
            Sign in to comment
          </button>
        </div>
      )
    }

    return (
      <div className="mt-3 flex items-center gap-2 bg-black/45 border border-white/5 focus-within:border-cyan-spark/40 rounded-lg p-1.5 transition-all">
        <div className="flex-shrink-0 pl-1">
          <Avatar user={user} size={22} />
        </div>
        <input
          type="text"
          placeholder="Add a comment..."
          value={text}
          onChange={(e) => setNewCommentText(prev => ({ ...prev, [key]: e.target.value }))}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && text.trim()) {
              submitComment(type, targetId)
            }
          }}
          className="flex-grow bg-transparent text-xs text-text-primary placeholder:text-text-secondary/40 outline-none border-none py-1 focus:ring-0"
        />
        <button
          onClick={() => submitComment(type, targetId)}
          disabled={!text.trim()}
          className={`font-mono text-[10px] font-bold px-3 py-1.5 rounded transition-all ${
            text.trim()
              ? 'bg-cyan-spark text-black hover:shadow-[0_0_8px_rgba(34,211,238,0.4)]'
              : 'bg-white/5 text-text-secondary/30 cursor-not-allowed'
          }`}
        >
          POST
        </button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-red-core border-t-transparent animate-spin" />
      </div>
    )
  }

  if (error || !question) {
    return (
      <div className="min-h-screen bg-black text-text-primary pt-24 px-6 text-center">
        <div className="max-w-md mx-auto glass-card p-8 border border-red-core/30 font-mono text-xs text-red-glow">
          {error || 'Query thread missing'}
          <div className="mt-6">
            <Link to="/community" className="text-text-primary hover:text-cyan-spark underline">
              Return to dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const isContributor = isContributorRole(user?.role)
  const isAuthor = user?.id === question.author.id
  const chip = statusChip(question.status, question.is_solved)

  const solutions = question.answers.filter(a => a.is_solution)
  const acceptedSolution = solutions.find(a => a.is_accepted)
  const otherSolutions = solutions.filter(a => !a.is_accepted)
  const commentAnswers = question.answers.filter(a => !a.is_solution)

  const renderAnswerCard = (ans: Answer) => {
    const isAcceptedSolution = ans.is_solution && ans.is_accepted
    const borderClass = isAcceptedSolution
      ? 'border-green-500 bg-green-500/[0.02] shadow-[0_0_30px_rgba(34,197,94,0.06)]'
      : ans.is_solution
        ? 'border-red-core/35 bg-red-core/[0.01]'
        : 'border-white/10 bg-white/[0.01]'

    return (
      <div
        key={ans.id}
        className={`glass-card p-6 rounded-xl border transition-all duration-300 relative overflow-hidden ${borderClass}`}
      >
        {isAcceptedSolution && (
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-green-500" />
        )}
        {!isAcceptedSolution && ans.is_solution && (
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-red-core/50" />
        )}

        <div className="flex flex-col sm:flex-row gap-5 items-start">
          {/* Answer Vote Column */}
          <div className="flex sm:flex-col items-center gap-2 bg-white/[0.01] border border-white/[0.03] p-2 rounded-lg sm:w-12 w-full justify-between sm:justify-center">
            <button
              onClick={() => handleVote('a', ans.id, 1)}
              className="text-text-secondary hover:text-cyan-spark hover:scale-110 transition-all p-1"
              title="Upvote"
            >
              <ArrowUp size={18} />
            </button>
            <span className="font-heading font-black text-base text-text-primary">{ans.score}</span>
            <button
              onClick={() => handleVote('a', ans.id, -1)}
              className="text-text-secondary hover:text-red-core hover:scale-110 transition-all p-1"
              title="Downvote"
            >
              <ArrowDown size={18} />
            </button>

            {ans.is_solution && (user?.role === 'admin' || user?.role === 'super_admin' || isAuthor) && (
              <button
                onClick={() => handleAccept(ans.id)}
                className={`mt-2 w-8 h-8 rounded-full flex items-center justify-center border transition-all ${
                  ans.is_accepted 
                    ? 'bg-green-500 border-green-500 text-black shadow-[0_0_12px_rgba(34,197,94,0.5)]' 
                    : 'border-white/10 hover:border-green-500 text-text-secondary hover:text-green-400'
                }`}
                title={ans.is_accepted ? "Solution Accepted" : "Mark as Accepted Solution"}
              >
                <Check size={14} />
              </button>
            )}
          </div>

          {/* Answer Content Column */}
          <div className="flex-grow min-w-0 w-full">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-3 pb-3 border-b border-white/[0.04]">
              <div className="flex items-center gap-2">
                <Avatar user={ans.author} size={28} className="ring-1 ring-white/10" />
                <div>
                  <div className="flex items-center gap-1.5">
                    <Link to={`/community/u/${ans.author.username}`} className="font-mono text-xs font-bold text-text-primary hover:text-red-glow transition-colors">
                      @{ans.author.username}
                    </Link>
                    {isContributorRole(ans.author.role) && <ContributorTag />}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <span className="font-mono text-[9px] text-text-secondary/50">
                  <RelativeTime iso={ans.created_at} />
                </span>
                {isAcceptedSolution && (
                  <span className="font-mono text-[9px] px-2 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20 flex items-center gap-1 uppercase font-bold tracking-wider">
                    <Award size={10} />
                    ACCEPTED
                  </span>
                )}
                {!isAcceptedSolution && ans.is_solution && (
                  <span className="font-mono text-[9px] px-2 py-0.5 rounded bg-red-core/10 text-red-glow border border-red-core/20 flex items-center gap-1 uppercase font-bold tracking-wider">
                    SOLUTION
                  </span>
                )}
              </div>
            </div>

            <div className="font-mono text-sm text-text-secondary leading-relaxed whitespace-pre-wrap select-text mb-4">
              {ans.content}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pb-3">
              <button
                onClick={() => handleOpenReport('answer', ans.id)}
                className="font-mono text-[9px] px-2.5 py-1 border border-white/5 hover:border-red-core text-text-secondary/70 hover:text-red-glow rounded transition-all uppercase font-bold tracking-wider"
              >
                Flag
              </button>
              <button
                onClick={() => setShowCommentForm(prev => ({ ...prev, [`a-${ans.id}`]: !prev[`a-${ans.id}`] }))}
                className={`font-mono text-[9px] px-2.5 py-1 border rounded transition-all uppercase font-bold tracking-wider flex items-center gap-1 ${
                  showCommentForm[`a-${ans.id}`]
                    ? 'border-cyan-spark bg-cyan-spark/10 text-cyan-spark shadow-[0_0_8px_rgba(34,211,238,0.1)]'
                    : 'border-white/5 hover:border-cyan-spark text-text-secondary/70 hover:text-cyan-glow'
                }`}
              >
                <MessageSquare size={10} />
                Comment
              </button>
            </div>

            {/* Answer Comments (Instagram style) */}
            {ans.comments && ans.comments.length > 0 && (
              <div className="mt-3 pt-3 border-t border-white/[0.04]">
                <p className="font-mono text-[9px] uppercase tracking-wider text-text-secondary/50 mb-2">
                  Solution Comments ({ans.comments.length})
                </p>
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1 scrollbar-thin">
                  {ans.comments.map(c => renderInstagramComment(c))}
                </div>
              </div>
            )}

            {/* Inline Comment Input Form */}
            {showCommentForm[`a-${ans.id}`] && renderCommentForm('a', ans.id)}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-text-primary pt-24 pb-16 px-6 relative">
      <div 
        className="absolute inset-0 opacity-[0.02] pointer-events-none" 
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 30 L30 30 L30 0' fill='none' stroke='%23C0192C' stroke-width='1'/%3E%3C/svg%3E")`,
        }}
      />

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Back Link */}
        <div className="mb-6 flex items-center justify-between">
          <Link to="/community" className="font-mono text-xs text-red-core hover:text-red-glow flex items-center gap-1.5 group transition-colors">
            <span className="inline-block transform group-hover:-translate-x-1 transition-transform">&lt;</span> Return to archives
          </Link>
          <span className="font-mono text-[10px] text-text-secondary/50 uppercase tracking-widest">
            Thread ID: #{question.id}
          </span>
        </div>

        {/* Question Card */}
        <div className="glass-card p-8 rounded-xl border border-red-core/20 mb-8 relative overflow-hidden shadow-2xl">
          {/* Subtle neon gradient light edge */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-red-core/20 via-red-core/60 to-red-core/20" />
          
          <div className="flex flex-col md:flex-row gap-6 items-start">
            {/* Vote panel */}
            <div className="flex md:flex-col items-center gap-3 bg-white/[0.02] border border-white/[0.04] p-3 rounded-lg md:w-14 justify-between w-full md:justify-center">
              <button 
                onClick={() => handleVote('q', question.id, 1)}
                className="text-text-secondary hover:text-cyan-spark hover:scale-110 transition-all p-1.5"
                title="Upvote"
              >
                <ArrowUp size={22} className="filter drop-shadow-[0_0_4px_currentColor]" />
              </button>
              <span className="font-heading font-black text-xl text-text-primary tracking-tighter md:my-1">
                {question.score}
              </span>
              <button 
                onClick={() => handleVote('q', question.id, -1)}
                className="text-text-secondary hover:text-red-core hover:scale-110 transition-all p-1.5"
                title="Downvote"
              >
                <ArrowDown size={22} className="filter drop-shadow-[0_0_4px_currentColor]" />
              </button>
            </div>

            {/* Question Body */}
            <div className="flex-grow min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-4 border-b border-white/[0.04]">
                <div className="flex items-center gap-3">
                  <Avatar user={question.author} size={40} className="ring-2 ring-red-core/20" />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Link to={`/community/u/${question.author.username}`} className="font-mono text-sm font-bold text-text-primary hover:text-red-glow transition-colors">
                        @{question.author.username}
                      </Link>
                      {isContributorRole(question.author.role) && <ContributorTag />}
                    </div>
                    <p className="font-mono text-[10px] text-text-secondary/60 mt-0.5">
                      Reputation: <span className="text-cyan-spark">{question.author.reputation} XP</span>
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 text-right">
                  <span className={`font-mono text-[9px] px-2.5 py-0.5 rounded-full border tracking-wider ${chip.className}`}>
                    {chip.label}
                  </span>
                  <div className="font-mono text-[10px] text-text-secondary/50 flex flex-col items-end">
                    <span><RelativeTime iso={question.created_at} /></span>
                    <span className="mt-0.5">{question.views} views</span>
                  </div>
                </div>
              </div>

              <h1 className="font-heading font-black text-2xl md:text-3xl uppercase tracking-wider text-text-primary mb-5 select-text">
                {question.title}
              </h1>
              
              <div className="font-mono text-sm text-text-secondary leading-relaxed whitespace-pre-wrap select-text mb-6">
                {question.content}
              </div>

              {question.attachments && question.attachments.length > 0 && (
                <div className="mb-6 p-4 bg-white/[0.01] border border-white/[0.03] rounded-lg">
                  <ImageGallery attachments={question.attachments} />
                </div>
              )}

              {/* Tags & Action Buttons */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-white/[0.04]">
                <div className="flex flex-wrap gap-2">
                  {question.tags.map(t => (
                    <span key={t.name} className="font-mono text-[10px] px-3 py-1 rounded bg-red-core/10 border border-red-core/20 text-red-glow uppercase font-bold tracking-wider">
                      #{t.name}
                    </span>
                  ))}
                </div>

                <div className="flex gap-2 flex-wrap sm:justify-end">
                  <button
                    onClick={() => handleOpenReport('question', question.id)}
                    className="font-mono text-[10px] px-3 py-1.5 border border-white/10 hover:border-red-core text-text-secondary hover:text-red-glow rounded-md transition-all uppercase font-bold tracking-wider"
                  >
                    Flag Query
                  </button>
                  <button
                    onClick={() => setShowCommentForm(prev => ({ ...prev, q: !prev.q }))}
                    className={`font-mono text-[10px] px-3 py-1.5 border rounded-md transition-all uppercase font-bold tracking-wider flex items-center gap-1.5 ${
                      showCommentForm.q 
                        ? 'border-cyan-spark bg-cyan-spark/10 text-cyan-spark shadow-[0_0_10px_rgba(34,211,238,0.1)]' 
                        : 'border-white/10 hover:border-cyan-spark text-text-secondary hover:text-cyan-glow'
                    }`}
                  >
                    <MessageSquare size={12} />
                    Comment
                  </button>
                  <button
                    onClick={async () => {
                      if (showSharePanel) { setShowSharePanel(false); return }
                      try {
                        const res = await fetch(`/api/v1/questions/${question.slug}/share`)
                        if (res.ok) {
                          const data = await res.json()
                          const localOrigin = window.location.origin
                          const sanitizedData = {
                            ...data,
                            url: data.url.replace(/https?:\/\/localhost:\d+/g, localOrigin),
                            linkedin_url: data.linkedin_url.replace(/https?:\/\/localhost:\d+/g, localOrigin),
                            twitter_url: data.twitter_url.replace(/https?:\/\/localhost:\d+/g, localOrigin)
                          }
                          setShareData(sanitizedData)
                          setShowSharePanel(true)
                        }
                      } catch (e) {
                        console.error(e)
                      }
                    }}
                    className={`font-mono text-[10px] px-3 py-1.5 border rounded-md transition-all uppercase font-bold tracking-wider flex items-center gap-1.5 ${
                      showSharePanel
                        ? 'border-green-500 bg-green-500/10 text-green-400 shadow-[0_0_10px_rgba(34,197,94,0.1)]'
                        : 'border-white/10 hover:border-green-500 text-text-secondary hover:text-green-400'
                    }`}
                  >
                    <Share2 size={12} />
                    Share
                  </button>
                </div>
              </div>

              {/* Share Panel */}
              <AnimatePresence>
                {showSharePanel && shareData && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 p-4 rounded-lg border border-green-500/20 bg-green-500/5 overflow-hidden"
                  >
                    <p className="font-mono text-[10px] text-green-400 uppercase tracking-widest mb-3">Live link generated successfully</p>
                    <div className="flex flex-wrap gap-2">
                      <a
                        href={shareData.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 font-mono text-[10px] px-3 py-1.5 rounded border border-[#0A66C2]/40 bg-[#0A66C2]/10 text-[#0A66C2] hover:bg-[#0A66C2]/20 transition-all font-bold"
                      >
                        <Linkedin size={12} />
                        LinkedIn Post
                      </a>
                      <a
                        href={shareData.twitter_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 font-mono text-[10px] px-3 py-1.5 rounded border border-white/20 bg-white/5 text-text-primary hover:bg-white/10 transition-all font-bold"
                      >
                        <Twitter size={12} />
                        Twitter / X
                      </a>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(shareData.url)
                          setLinkCopied(true)
                          setTimeout(() => setLinkCopied(false), 2000)
                        }}
                        className="flex items-center gap-1.5 font-mono text-[10px] px-3 py-1.5 rounded border border-cyan-spark/30 bg-cyan-spark/5 text-cyan-spark hover:bg-cyan-spark/10 transition-all font-bold"
                      >
                        {linkCopied ? <CheckCircle2 size={12} /> : <Copy size={12} />}
                        {linkCopied ? 'Copied!' : 'Copy Link'}
                      </button>
                    </div>
                    <p className="font-mono text-[9px] text-text-secondary/60 mt-2.5">
                      Share this thread as a live contribution link on your LinkedIn profile to showcase your problem-solving competence!
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Question Comments list */}
              {question.comments.length > 0 && (
                <div className="mt-6 border-t border-white/[0.04] pt-5">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-text-secondary/70 mb-3">
                    Question Discussion ({question.comments.length})
                  </p>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1 scrollbar-thin">
                    {question.comments.map(c => renderInstagramComment(c))}
                  </div>
                </div>
              )}

              {/* Question Comment form */}
              {showCommentForm.q && renderCommentForm('q', question.id)}
            </div>
          </div>
        </div>

        {/* Answers List */}
        <div className="mb-8 space-y-6">
          <h3 className="font-heading font-bold uppercase tracking-wider text-sm border-b border-red-core/20 pb-2 mb-4">
            Solutions &amp; Comments — {question.answers.length} responses
          </h3>

          {acceptedSolution && renderAnswerCard(acceptedSolution)}
          {otherSolutions.map(renderAnswerCard)}
          {commentAnswers.length > 0 && otherSolutions.length + (acceptedSolution ? 1 : 0) > 0 && (
            <h4 className="font-mono text-[10px] uppercase tracking-wider text-text-secondary pt-2">
              Comments
            </h4>
          )}
          {commentAnswers.map(renderAnswerCard)}
        </div>

        {/* Response Form Card */}
        <div className="mt-12">
          {!user ? (
            <div className="glass-card p-8 rounded-xl border border-red-core/20 text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-red-core/30 to-transparent" />
              <p className="font-mono text-sm text-text-secondary mb-4">
                Join the Embedded Collective to share solutions or ask questions.
              </p>
              <button
                type="button"
                onClick={() => setAuthModalOpen(true, 'signin')}
                className="font-mono text-xs font-bold px-6 py-3 rounded bg-red-core text-text-primary hover:bg-red-glow hover:shadow-[0_0_15px_rgba(192,25,44,0.4)] transition-all uppercase tracking-wider"
              >
                Sign in to join the conversation
              </button>
            </div>
          ) : isContributor ? (
            <form onSubmit={submitAnswer} className="glass-card p-6 rounded-xl border border-red-core/25 shadow-2xl relative">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-red-core/10 via-red-core/40 to-red-core/10" />
              
              <h4 className="font-heading font-black uppercase tracking-wider text-sm mb-4 text-cyan-spark">
                Post a Solution
              </h4>

              <div className="mb-4">
                <textarea
                  value={newAnswer}
                  onChange={(e) => setNewAnswer(e.target.value)}
                  placeholder="Describe your solution. Use markdown blocks for code snippets..."
                  rows={6}
                  className="w-full bg-black/60 border border-white/10 focus:border-cyan-spark/50 rounded-lg p-4 font-mono text-sm text-text-primary placeholder:text-text-secondary/30 outline-none resize-y transition-all"
                  required
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="font-mono text-xs px-6 py-3 rounded font-bold uppercase tracking-wider flex items-center gap-2 bg-red-core text-text-primary hover:bg-red-glow hover:shadow-[0_0_15px_rgba(192,25,44,0.4)] transition-all"
                >
                  <Send size={14} />
                  Post Solution
                </button>
              </div>
            </form>
          ) : (
            <div className="glass-card p-6 rounded-xl border border-white/10 text-center relative overflow-hidden">
              <p className="font-mono text-xs text-text-secondary">
                Only Contributor profiles can submit top-level solutions to thread challenges. 
                You can participate by commenting directly on the question or existing solutions above.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Star Rating Modal for Solution */}
      <AnimatePresence>
        {showRatingModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="glass-card p-8 rounded border border-cyan-spark/40 max-w-sm w-full relative"
            >
              <h3 className="font-heading font-bold text-lg text-cyan-spark uppercase tracking-widest mb-2 flex items-center gap-2">
                <Star size={20} fill="currentColor" />
                Rate Solution
              </h3>
              <p className="font-mono text-xs text-text-secondary leading-relaxed mb-6">
                Provide quality validation score for this accepted compiler/register solution.
              </p>

              {/* Stars Selection */}
              <div className="flex items-center justify-center gap-2 mb-6">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setSelectedRating(star)}
                    className="text-text-secondary hover:text-cyan-spark transition-colors"
                  >
                    <Star 
                      size={28} 
                      className={star <= selectedRating ? 'text-cyan-spark' : 'text-text-secondary'}
                      fill={star <= selectedRating ? 'currentColor' : 'none'}
                    />
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowRatingModal(false)}
                  className="w-full font-mono text-xs py-2 rounded bg-cyan-spark/20 text-cyan-spark border border-cyan-spark/40 hover:bg-cyan-spark/30 transition-colors uppercase font-bold"
                >
                  Verify rating
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Report/Flag modal */}
      <AnimatePresence>
        {isReportOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="glass-card p-6 rounded border border-red-core/30 max-w-md w-full relative"
            >
              <h3 className="font-heading font-bold text-base text-red-glow uppercase tracking-wider mb-2 flex items-center gap-2">
                <AlertTriangle size={18} />
                Flag Content Node
              </h3>
              <p className="font-mono text-[10px] text-text-secondary mb-4">
                Flag this {reportType} for review by Root Administrators. Provide specific citation reasons.
              </p>

              <textarea
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="Reason for flagging (e.g. spam, invalid code, harassment)..."
                rows={4}
                className="w-full bg-black border border-red-core/20 focus:border-red-core rounded p-3 font-mono text-xs text-text-primary outline-none resize-none mb-4"
                required
              />

              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setIsReportOpen(false)}
                  className="px-3 py-1.5 border border-glass-border hover:border-text-secondary text-text-secondary text-xs font-mono rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={submitReport}
                  disabled={reporting || !reportReason.trim()}
                  className="px-4 py-1.5 bg-red-core hover:bg-red-glow text-white text-xs font-mono rounded disabled:opacity-50 font-bold"
                >
                  {reporting ? 'Submitting...' : 'Flag node'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
