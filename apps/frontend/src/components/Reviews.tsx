import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, MessageSquare, Plus, X, Award, Check } from 'lucide-react'
import { useCommunity } from '../context/CommunityContext'
import { Avatar } from './community/Avatar'

interface Review {
  id: number
  author_name: string
  role_or_title: string
  review_text: string
  rating: number
  is_visible: boolean
  created_at: string
  user_id?: number
  user?: {
    id: number
    username: string
    display_name?: string
    avatar_url?: string
    profile_pic_url?: string
    role: string
    reputation: number
  }
}

export function Reviews() {
  const { user, token, setAuthModalOpen } = useCommunity()
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showAllReviews, setShowAllReviews] = useState(false)

  // Form State
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [text, setText] = useState('')
  const [rating, setRating] = useState(5)
  const [hoveredRating, setHoveredRating] = useState<number | null>(null)
  const [successMsg, setSuccessMsg] = useState(false)

  // Auto-fill name if user is logged in
  useEffect(() => {
    if (user) {
      setName(user.display_name || user.username)
    }
  }, [user])

  const fetchReviews = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/v1/reviews/')
      if (res.ok) {
        const data = await res.json()
        setReviews(data)
      }
    } catch (err) {
      console.error('Failed to fetch reviews', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReviews()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) {
      setAuthModalOpen(true, 'signin')
      return
    }
    if (!name.trim() || !role.trim() || !text.trim()) return

    setSubmitting(true)
    try {
      const res = await fetch('/api/v1/reviews/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          author_name: name,
          role_or_title: role,
          review_text: text,
          rating: rating
        })
      })

      if (res.ok) {
        setSuccessMsg(true)
        setName('')
        setRole('')
        setText('')
        setRating(5)
        // Refresh reviews list
        await fetchReviews()
        // Dispatch event for other components (e.g. stats counters) to update in realtime
        window.dispatchEvent(new Event('review-submitted'))
        setTimeout(() => {
          setSuccessMsg(false)
          setShowModal(false)
        }, 15000)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  const averageRating = reviews.length > 0
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : '4.9'

  return (
    <section id="reviews" className="relative w-full py-24 bg-[--bg-void] overflow-hidden border-t border-[--glass-border]/50">
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-80 h-80 rounded-full bg-[rgba(192,25,44,0.06)] blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 -translate-y-1/2 w-96 h-96 rounded-full bg-[rgba(0,240,255,0.03)] blur-3xl pointer-events-none" />

      <div className="max-w-content mx-auto px-6 relative z-10">
        <motion.span
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="font-mono text-xs uppercase tracking-[0.2em] text-red-core block mb-3 text-center"
        >
          // FEEDBACK LOOP
        </motion.span>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="font-heading font-bold text-3xl md:text-5xl uppercase tracking-[0.08em] mb-4 text-center text-text-primary"
        >
          CLIENT & COMMUNITY REVIEWS
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="font-body text-xs text-text-secondary max-w-lg mx-auto mb-12 text-center"
        >
          See what engineers, partners, and community members are saying about our collaboration and hardware-software system integrations.
        </motion.p>

        {/* Global Rating & Write Review CTA */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 max-w-4xl mx-auto mb-12 p-6 glass-card rounded-lg border border-[--glass-border]">
          <div className="flex items-center gap-6">
            <div className="text-center md:text-left">
              <span className="font-heading font-black text-4xl md:text-5xl text-text-primary block leading-none">
                {averageRating}
              </span>
              <span className="font-mono text-[9px] text-text-secondary uppercase tracking-widest mt-1.5 block">
                Average Rating
              </span>
            </div>
            <div className="h-10 w-px bg-[--glass-border]" />
            <div>
              <div className="flex items-center gap-0.5 text-yellow-500 mb-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    size={16}
                    fill={i < Math.round(Number(averageRating)) ? 'currentColor' : 'none'}
                    className={i < Math.round(Number(averageRating)) ? 'text-yellow-500' : 'text-text-secondary/30'}
                  />
                ))}
              </div>
              <span className="font-mono text-[10px] text-text-secondary">
                based on {reviews.length} verified reviews
              </span>
            </div>
          </div>

          <div className="flex flex-col items-center">
            <button
              onClick={() => {
                if (!user) {
                  setAuthModalOpen(true, 'signin')
                } else {
                  setSuccessMsg(false)
                  setShowModal(true)
                }
              }}
              className="flex items-center gap-2 font-mono text-xs px-5 py-2.5 bg-red-core text-white hover:bg-red-glow rounded border border-red-core hover:border-red-glow shadow-[0_0_15px_rgba(192,25,44,0.3)] transition-all duration-300 transform active:scale-95 animate-pulse-subtle"
            >
              <Plus size={14} />
              {user ? 'WRITE A REVIEW' : 'SIGN IN TO WRITE A REVIEW'}
            </button>
            {!user && (
              <span className="font-mono text-[9px] text-text-muted mt-2 block uppercase tracking-wider">
                Only authenticated members can submit reviews
              </span>
            )}
          </div>
        </div>

        {/* Reviews List */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="w-8 h-8 rounded-full border-2 border-red-core border-t-transparent animate-spin" />
          </div>
        ) : reviews.length === 0 ? (
          <div className="glass-card p-12 rounded-lg text-center border border-[--glass-border] max-w-xl mx-auto">
            <MessageSquare className="mx-auto text-text-muted mb-4 opacity-40 animate-pulse" size={32} />
            <h3 className="font-heading font-bold text-lg uppercase tracking-wider mb-2 text-text-primary">
              No Reviews Yet
            </h3>
            <p className="font-body text-xs text-text-secondary">
              Be the first to share your experience with Harit Mandaliya. Write an active star review now!
            </p>
          </div>
        ) : (
          <div className="space-y-12 max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
              {(showAllReviews ? reviews : reviews.slice(0, 3)).map((rev, idx) => (
                <motion.div
                  key={rev.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.05 }}
                  className="glass-card p-6 rounded-lg border border-[--glass-border] hover:border-red-core/30 transition-all duration-300 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      {rev.user ? (
                        <Link to={`/community/u/${rev.user.username}`} className="flex items-center gap-2 group/author">
                          <Avatar user={rev.user} size={32} />
                          <div>
                            <h4 className="font-heading font-bold text-xs text-text-primary group-hover/author:text-red-glow transition-colors">
                              {rev.user.display_name || rev.user.username}
                            </h4>
                            <p className="font-mono text-[9px] text-text-secondary uppercase tracking-wider">
                              @{rev.user.username} • {rev.role_or_title}
                            </p>
                          </div>
                        </Link>
                      ) : (
                        <div>
                          <h4 className="font-heading font-bold text-sm text-text-primary">
                            {rev.author_name}
                          </h4>
                          <p className="font-mono text-[9px] text-text-secondary uppercase tracking-wider mt-0.5">
                            {rev.role_or_title}
                          </p>
                        </div>
                      )}
                      <span className="flex items-center gap-0.5 text-yellow-500">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            size={10}
                            fill={i < rev.rating ? 'currentColor' : 'none'}
                            className={i < rev.rating ? 'text-yellow-500' : 'text-text-secondary/20'}
                          />
                        ))}
                      </span>
                    </div>

                    <p className="font-body text-xs text-text-secondary leading-relaxed italic">
                      "{rev.review_text}"
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-[--glass-border] flex items-center justify-between font-mono text-[9px] text-text-muted">
                    <span className="flex items-center gap-1">
                      <Award size={10} className="text-red-core" /> Verified Review
                    </span>
                    <span>{new Date(rev.created_at).toLocaleDateString()}</span>
                  </div>
                </motion.div>
              ))}
            </div>

            {reviews.length > 3 && (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => setShowAllReviews(!showAllReviews)}
                  className="font-heading font-bold text-xs uppercase tracking-wider border border-red-core/20 text-red-core hover:text-red-glow hover:border-red-core/40 px-8 py-3.5 rounded-lg transition-all duration-300 bg-red-core/5 hover:bg-red-core/10"
                >
                  {showAllReviews ? 'Show Less Reviews' : 'Show More Reviews'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Review Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Scrim */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />

            {/* Modal Content */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg glass-card border border-[--glass-border] rounded-lg p-8 z-10"
            >
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-4 right-4 p-1.5 rounded-full border border-[--glass-border] text-text-secondary hover:text-text-primary transition-colors"
              >
                <X size={14} />
              </button>

              <span className="font-mono text-[9px] text-red-core uppercase tracking-widest block mb-1">
                // WRITE REVIEWS
              </span>
              <h3 className="font-heading font-black text-2xl uppercase tracking-wider text-text-primary mb-6">
                Submit Star Review
              </h3>

              {successMsg ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mx-auto mb-4 text-green-500">
                    <Check size={20} />
                  </div>
                  <h4 className="font-heading font-bold text-lg uppercase tracking-wider text-text-primary mb-2">
                    Review Submitted!
                  </h4>
                  <p className="font-body text-xs text-text-secondary max-w-xs mx-auto">
                    Thank you! Your feedback has been recorded and the ratings are recalculated in real time.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block font-mono text-[10px] text-text-secondary uppercase tracking-wider mb-1.5">
                      Your Name
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Jane Doe"
                      className="w-full bg-[--bg-deep] border border-[--glass-border] focus:border-red-core/55 rounded px-3 py-2 text-xs text-text-primary outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-mono text-[10px] text-text-secondary uppercase tracking-wider mb-1.5">
                      Role / Title
                    </label>
                    <input
                      type="text"
                      required
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      placeholder="e.g. Embedded Developer, Collaborator"
                      className="w-full bg-[--bg-deep] border border-[--glass-border] focus:border-red-core/55 rounded px-3 py-2 text-xs text-text-primary outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-mono text-[10px] text-text-secondary uppercase tracking-wider mb-2">
                      Star Rating
                    </label>
                    <div className="flex items-center gap-1.5 text-2xl">
                      {Array.from({ length: 5 }).map((_, i) => {
                        const starValue = i + 1
                        const isGold = hoveredRating !== null
                          ? starValue <= hoveredRating
                          : starValue <= rating

                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setRating(starValue)}
                            onMouseEnter={() => setHoveredRating(starValue)}
                            onMouseLeave={() => setHoveredRating(null)}
                            className="p-1 transition-transform active:scale-90"
                          >
                            <Star
                              size={24}
                              fill={isGold ? '#eab308' : 'none'}
                              className={isGold ? 'text-yellow-500' : 'text-text-secondary/20'}
                            />
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block font-mono text-[10px] text-text-secondary uppercase tracking-wider mb-1.5">
                      Review Text
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder="Write your detailed review details here..."
                      className="w-full bg-[--bg-deep] border border-[--glass-border] focus:border-red-core/55 rounded px-3 py-2 text-xs text-text-primary outline-none resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 bg-red-core hover:bg-red-glow text-white font-mono text-xs uppercase tracking-widest rounded border border-red-core hover:border-red-glow shadow-[0_0_15px_rgba(192,25,44,0.3)] transition-all duration-300 disabled:opacity-50"
                  >
                    {submitting ? 'SUBMITTING...' : 'SUBMIT REVIEW'}
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  )
}
