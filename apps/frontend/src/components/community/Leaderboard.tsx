import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Trophy, Award, ArrowRight } from 'lucide-react'
import { useCommunity } from '../../context/CommunityContext'

interface LeaderboardItem {
  id: number
  username: string
  display_name: string
  avatar_url: string | null
  reputation: number
  level: string
  answers_count: number
  accept_rate: number
  top_category: string
}

export function Leaderboard() {
  const { user, token, setAuthModalOpen } = useCommunity()
  const [period, setPeriod] = useState<'week' | 'month' | 'all'>('all')
  const [leaders, setLeaders] = useState<LeaderboardItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    const headers: Record<string, string> = {}
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    fetch(`/api/v1/users/leaderboard?limit=20&period=${period}`, { headers })
      .then(async (res) => {
        if (res.status === 403) {
          throw new Error('Leaderboard is restricted to authenticated members.')
        }
        if (!res.ok) return []
        return res.json()
      })
      .then((data) => {
        if (Array.isArray(data)) {
          setLeaders(data)
          setError(null)
        }
      })
      .catch((err) => {
        console.error(err)
        setError(err.message || 'Failed to load leaderboard.')
      })
      .finally(() => setLoading(false))
  }, [period, token])

  // Fallback Initials Avatar
  const renderAvatar = (lead: LeaderboardItem, size = 48, ringColor = '') => {
    const initials = (lead.display_name || lead.username || '?')
      .split(' ')
      .map((w: string) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)

    return lead.avatar_url ? (
      <img
        src={lead.avatar_url}
        className={`rounded-full object-cover border-2 ${ringColor || 'border-transparent'}`}
        style={{ width: size, height: size }}
        alt={lead.username}
      />
    ) : (
      <div
        className={`rounded-full bg-[--red-core]/20 border-2 flex items-center justify-center font-mono font-bold text-[--red-core] ${
          ringColor || 'border-[--red-core]/40'
        }`}
        style={{ width: size, height: size, fontSize: size * 0.35 }}
      >
        {initials}
      </div>
    )
  }

  // Podium Positions (1st, 2nd, 3rd)
  const first = leaders[0]
  const second = leaders[1]
  const third = leaders[2]
  const rest = leaders.slice(3)

  if (error) {
    return (
      <div className="min-h-screen bg-[--bg-void] text-text-primary pt-24 pb-20 px-6 flex items-center justify-center">
        <div className="max-w-md w-full glass-card p-8 rounded-lg border border-red-core/30 text-center">
          <Trophy size={48} className="mx-auto text-red-core mb-4 opacity-50" />
          <h2 className="font-heading font-bold text-xl uppercase tracking-wider mb-2">ACCESS RESTRICTED</h2>
          <p className="font-mono text-xs text-text-secondary mb-6">{error}</p>
          {!user && (
            <button
              onClick={() => setAuthModalOpen(true, 'signin')}
              className="w-full font-mono text-xs py-2.5 bg-red-core text-white hover:shadow-[0_0_15px_rgba(192,25,44,0.3)] transition-all duration-300 rounded"
            >
              SIGN IN TO UNLOCK
            </button>
          )}
        </div>
      </div>
    )
  }
  const myRank = leaders.findIndex((l) => l.username === user?.username) + 1
  const myEntry = leaders.find((l) => l.username === user?.username)

  return (
    <div className="min-h-screen bg-[--bg-void] text-text-primary pt-24 pb-20 px-6 relative">
      <div className="max-w-4xl mx-auto z-10 relative">
        {/* Eyebrow / Title */}
        <div className="text-center mb-10">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-red-core block mb-3">
            // HALL OF EXCELLENCE
          </span>
          <h1 className="font-heading font-bold text-3xl md:text-5xl uppercase tracking-[0.08em] mb-4 text-text-primary">
            TOP CONTRIBUTORS
          </h1>
          <p className="font-body text-sm text-[--text-secondary] max-w-xl mx-auto">
            Recognizing engineers driving firmware optimizations, solving hardware race-conditions, and seeding verified design schemas.
          </p>
        </div>

        {/* Time filters */}
        <div className="flex justify-center gap-1.5 mb-12">
          {[
            { id: 'week', label: 'THIS WEEK' },
            { id: 'month', label: 'THIS MONTH' },
            { id: 'all', label: 'ALL TIME' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setPeriod(t.id as any)}
              className={`font-mono text-xs px-5 py-2.5 rounded border transition-all duration-300 ${
                period === t.id
                  ? 'bg-red-core/10 border-red-core text-white shadow-[0_0_12px_rgba(192,25,44,0.25)]'
                  : 'bg-[--bg-deep] border-[--glass-border] text-text-secondary hover:text-text-primary'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-8 h-8 rounded-full border-2 border-red-core border-t-transparent animate-spin" />
          </div>
        ) : (
          <>
            {/* Podium */}
            {leaders.length > 0 && (
              <div className="grid grid-cols-3 gap-4 items-end max-w-2xl mx-auto mb-16 pt-8">
                {/* 2nd Place */}
                {second && (
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, duration: 0.5 }}
                    className="flex flex-col items-center"
                  >
                    <div className="relative mb-3">
                      {renderAvatar(second, 64, 'border-slate-400')}
                      <span className="absolute -top-2 -right-2 bg-slate-400 text-black font-mono font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center border border-black shadow">
                        2
                      </span>
                    </div>
                    <div className="glass-card w-full py-4 px-2 rounded-t-lg border-b-0 border-[--glass-border] text-center h-28 flex flex-col justify-between">
                      <div>
                        <span className="font-heading font-bold text-xs text-text-primary block truncate max-w-full">
                          {second.display_name}
                        </span>
                        <span className="font-mono text-[9px] text-text-secondary block">
                          @{second.username}
                        </span>
                      </div>
                      <span className="font-mono text-xs text-slate-400 font-bold block mt-2">
                        {second.reputation} XP
                      </span>
                    </div>
                  </motion.div>
                )}

                {/* 1st Place */}
                {first && (
                  <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="flex flex-col items-center"
                  >
                    <div className="relative mb-3">
                      {renderAvatar(first, 80, 'border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.3)]')}
                      <Trophy size={20} className="absolute -top-4 left-1/2 -translate-x-1/2 text-yellow-500 animate-bounce" />
                      <span className="absolute -top-2 -right-2 bg-yellow-500 text-black font-mono font-bold text-[10px] w-6 h-6 rounded-full flex items-center justify-center border border-black shadow">
                        1
                      </span>
                    </div>
                    <div className="glass-card w-full py-6 px-2 rounded-t-xl border-b-0 border-red-core/30 shadow-[0_0_20px_rgba(192,25,44,0.15)] text-center h-36 flex flex-col justify-between">
                      <div>
                        <span className="font-heading font-bold text-sm text-text-primary block truncate max-w-full">
                          {first.display_name}
                        </span>
                        <span className="font-mono text-[9px] text-red-glow block">
                          {first.level}
                        </span>
                      </div>
                      <span className="font-mono text-sm text-yellow-500 font-bold block mt-2">
                        {first.reputation} XP
                      </span>
                    </div>
                  </motion.div>
                )}

                {/* 3rd Place */}
                {third && (
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                    className="flex flex-col items-center"
                  >
                    <div className="relative mb-3">
                      {renderAvatar(third, 56, 'border-amber-700')}
                      <span className="absolute -top-2 -right-2 bg-amber-700 text-black font-mono font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center border border-black shadow">
                        3
                      </span>
                    </div>
                    <div className="glass-card w-full py-3 px-2 rounded-t-lg border-b-0 border-[--glass-border] text-center h-24 flex flex-col justify-between">
                      <div>
                        <span className="font-heading font-bold text-xs text-text-primary block truncate max-w-full">
                          {third.display_name}
                        </span>
                        <span className="font-mono text-[9px] text-text-secondary block">
                          @{third.username}
                        </span>
                      </div>
                      <span className="font-mono text-xs text-amber-600 font-bold block mt-2">
                        {third.reputation} XP
                      </span>
                    </div>
                  </motion.div>
                )}
              </div>
            )}

            {/* Ranks Table (Ranks 4-20) */}
            <div className="glass-card rounded-lg border border-[--glass-border] overflow-hidden">
              <table className="w-full border-collapse text-left text-xs font-mono">
                <thead>
                  <tr className="bg-[--bg-deep] border-b border-[--glass-border] text-text-secondary uppercase text-[10px]">
                    <th className="py-4 px-6 w-16">Rank</th>
                    <th className="py-4 px-6">Contributor</th>
                    <th className="py-4 px-6">Focus Badge</th>
                    <th className="py-4 px-6 text-right">Reputation</th>
                    <th className="py-4 px-6 text-right">Answers</th>
                    <th className="py-4 px-6 text-right">Accept Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {rest.map((lead, idx) => {
                    const rank = idx + 4
                    return (
                      <tr
                        key={lead.id}
                        className="border-b border-[--glass-border]/50 hover:bg-[--bg-deep]/40 hover:border-l-2 hover:border-l-red-core transition-all duration-200"
                      >
                        <td className="py-3.5 px-6 font-bold text-text-secondary">#{rank}</td>
                        <td className="py-3.5 px-6">
                          <div className="flex items-center gap-2">
                            {renderAvatar(lead, 28)}
                            <div className="flex flex-col">
                              <span className="font-heading font-bold text-text-primary">
                                {lead.display_name}
                              </span>
                              <span className="text-[9px] text-text-secondary">@{lead.username}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-6">
                          <span className="text-[9px] text-cyan-spark bg-cyan-dim/10 px-2 py-0.5 rounded border border-cyan-spark/20 uppercase font-bold">
                            {lead.level}
                          </span>
                        </td>
                        <td className="py-3.5 px-6 text-right font-bold text-text-primary">
                          {lead.reputation} XP
                        </td>
                        <td className="py-3.5 px-6 text-right text-text-secondary">
                          {lead.answers_count}
                        </td>
                        <td className="py-3.5 px-6 text-right text-green-500 font-bold">
                          {lead.accept_rate}%
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Sticky Bottom user rank strip */}
      {user && myRank > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-md border-t border-red-core/30 py-3.5 px-6 z-40">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Award size={18} className="text-yellow-500" />
              <span className="font-mono text-xs text-text-primary">
                Your Rank: <strong className="text-red-glow">#{myRank}</strong> ·{' '}
                <strong className="text-cyan-spark">{user.reputation || 0} XP</strong> ·{' '}
                <span className="text-text-secondary uppercase">{myEntry?.level || 'MEMBER'}</span>
              </span>
            </div>
            <Link
              to={`/community/u/${user.username}`}
              className="font-mono text-[10px] text-red-core hover:text-red-glow flex items-center gap-1 transition-colors"
            >
              VIEW PROFILE <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
