import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShieldAlert,
  Trash2,
  UserX,
  UserCheck,
  AlertOctagon,
  ArrowLeft,
} from 'lucide-react'
import { useCommunity } from '../../context/CommunityContext'
import * as api from '../../services/communityApi'

interface Member {
  id: number
  username: string
  email: string
  role: string
  is_active: boolean
}

interface Report {
  id: number
  content_type: string
  content_id: number
  reporter: { username: string } | null
  reason: string
  status: string
  created_at: string | null
  item_title: string
  item_content: string
}

interface AdminProblem {
  id: number
  title: string
  category: string
  status: string
  is_pinned?: boolean
  is_featured?: boolean
}

interface AdminTag {
  id: number
  name: string
  uses: number
}

interface ActivityItem {
  type: string
  text: string
  created_at: string | null
}

type AdminTab = 'dashboard' | 'problems' | 'members' | 'tags' | 'settings' | 'reviews'

function timeAgoShort(iso: string | null) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const hrs = Math.floor(diff / 3600000)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export function AdminDashboard() {
  const { user, token } = useCommunity()
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard')
  const [users, setUsers] = useState<Member[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [stats, setStats] = useState<{ users?: number; questions?: number; solved?: number; avg_rating?: number; answers?: number } | null>(null)
  const [problems, setProblems] = useState<AdminProblem[]>([])
  const [tags, setTags] = useState<AdminTag[]>([])
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [selectedProblems, setSelectedProblems] = useState<number[]>([])
  const [problemFilter, setProblemFilter] = useState({ search: '', category: 'ALL', status: 'ALL' })
  const [settings, setSettings] = useState({
    community_name: 'Embedded Collective',
    community_tagline: 'Connect. Debug. Collaborate.',
    join_mode: 'open',
    allow_google_oauth: true,
    allow_otp_login: true,
    allow_anonymous_browse: false,
    email_notifications: true,
    public_leaderboard: true,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [banUserId, setBanUserId] = useState<number | null>(null)
  const [banReason, setBanReason] = useState('')
  const [showBanModal, setShowBanModal] = useState(false)
  const [editUserId, setEditUserId] = useState<number | null>(null)
  const [editRole, setEditRole] = useState('contributor')
  const [adminReviews, setAdminReviews] = useState<any[]>([])

  const fetchAdminReviews = async () => {
    if (!token) return
    try {
      setLoading(true)
      const data = await api.adminFetchReviews(token)
      setAdminReviews(data)
    } catch (err) {
      console.error(err)
      setError('Failed to fetch reviews')
    } finally {
      setLoading(false)
    }
  }

  const toggleReviewVisibility = async (id: number) => {
    if (!token) return
    try {
      const updated = await api.adminToggleReview(token, id)
      setAdminReviews((prev) => prev.map((r) => (r.id === id ? { ...r, is_visible: updated.is_visible } : r)))
    } catch {
      alert('Failed to toggle review visibility')
    }
  }

  const deleteReview = async (id: number) => {
    if (!token || !window.confirm('Delete this review permanently?')) return
    try {
      await api.adminDeleteReview(token, id)
      setAdminReviews((prev) => prev.filter((r) => r.id !== id))
    } catch {
      alert('Failed to delete review')
    }
  }

  const fetchProblems = async () => {
    if (!token) return
    const params = new URLSearchParams()
    if (problemFilter.search) params.set('search', problemFilter.search)
    if (problemFilter.status !== 'ALL') params.set('status', problemFilter.status)
    try {
      const data = await api.adminFetchProblems(token, params)
      setProblems(data)
    } catch (e) {
      console.error(e)
    }
  }

  const fetchTags = async () => {
    if (!token) return
    try {
      setTags(await api.adminFetchTags(token))
    } catch (e) {
      console.error(e)
    }
  }

  const fetchSettings = async () => {
    if (!token) return
    try {
      const data = await api.adminFetchSettings(token)
      setSettings(data)
    } catch (e) {
      console.error(e)
    }
  }

  const fetchActivity = async () => {
    if (!token) return
    try {
      setActivity(await api.adminFetchActivity(token))
    } catch (e) {
      console.error(e)
    }
  }

  const fetchAdminData = async () => {
    try {
      setLoading(true)
      setError(null)
      const headers = { Authorization: `Bearer ${token}` }

      const statsRes = await fetch('/api/v1/admin/stats', { headers })
      if (statsRes.ok) setStats(await statsRes.json())

      const usersRes = await fetch('/api/v1/admin/users', { headers })
      if (usersRes.ok) setUsers(await usersRes.json())

      const reportsRes = await fetch('/api/v1/admin/reports', { headers })
      if (reportsRes.ok) {
        const data = await reportsRes.json()
        setReports(data.filter((r: Report) => r.status === 'pending'))
      }

      await Promise.all([fetchProblems(), fetchTags(), fetchSettings(), fetchActivity()])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Access Denied')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token) fetchAdminData()
  }, [token])

  const handleToggleStatus = async (userId: number, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/v1/admin/users/${userId}/status?is_active=${!currentStatus}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, is_active: !currentStatus } : u)))
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleToggleRole = async (userId: number, role: string) => {
    try {
      const res = await fetch(`/api/v1/admin/users/${userId}/role?role=${role}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)))
        setEditUserId(null)
      } else {
        const errData = await res.json().catch(() => ({}))
        alert(errData.detail || 'Failed to update role')
      }
    } catch (err) {
      console.error(err)
      alert('An error occurred while updating role')
    }
  }

  const handleResolveReport = async (reportId: number, action: 'dismiss' | 'delete_content') => {
    try {
      const res = await fetch(`/api/v1/admin/reports/${reportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action }),
      })
      if (res.ok) {
        setReports((prev) => prev.filter((r) => r.id !== reportId))
        fetchAdminData()
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleBanUser = async () => {
    if (!banUserId || !banReason.trim()) return
    try {
      const res = await fetch(`/api/v1/admin/users/${banUserId}/ban`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason: banReason }),
      })
      if (res.ok) {
        setUsers((prev) => prev.map((u) => (u.id === banUserId ? { ...u, is_active: false } : u)))
        setShowBanModal(false)
      }
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    if (token) fetchAdminData()
  }, [token])

  useEffect(() => {
    if (token && activeTab === 'problems') fetchProblems()
  }, [token, activeTab, problemFilter.search, problemFilter.status])

  useEffect(() => {
    if (token && activeTab === 'reviews') fetchAdminReviews()
  }, [token, activeTab])

  const toggleProblemStatus = async (id: number, current: string) => {
    if (!token) return
    const next = current === 'SOLVED' ? 'OPEN' : 'SOLVED'
    try {
      await api.adminUpdateProblem(token, id, { status: next })
      setProblems((prev) => prev.map((p) => (p.id === id ? { ...p, status: next } : p)))
    } catch {
      alert('Failed to update status')
    }
  }

  const deleteProblem = async (id: number) => {
    if (!token || !window.confirm('Soft-delete this problem?')) return
    try {
      await api.adminDeleteProblem(token, id)
      setProblems((prev) => prev.filter((p) => p.id !== id))
    } catch {
      alert('Failed to delete')
    }
  }

  const toggleFeatured = async (id: number, current?: boolean) => {
    if (!token) return
    try {
      await api.adminUpdateProblem(token, id, { is_featured: !current })
      setProblems((prev) => prev.map((p) => (p.id === id ? { ...p, is_featured: !current } : p)))
    } catch {
      alert('Failed to feature')
    }
  }

  const filteredProblems = problems

  const isAdminEmail = user?.email === 'haritmandaliya@gmail.com' || user?.email === 'haritman6@gmail.com'
  if (!user || (user.role !== 'admin' && user.role !== 'super_admin' && !isAdminEmail)) {
    return (
      <div className="min-h-screen bg-[var(--bg-base)] text-text-primary pt-24 pb-16 px-6 text-center">
        <div className="max-w-md mx-auto glass-card p-8 border border-[var(--border-accent)] font-mono text-xs text-[var(--accent-red)]">
          Access denied — administrator role required.
        </div>
      </div>
    )
  }

  const tabs: { id: AdminTab; label: string }[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'problems', label: 'Problems' },
    { id: 'reviews', label: 'Reviews' },
    { id: 'members', label: 'Members' },
    { id: 'tags', label: 'Tags' },
    { id: 'settings', label: 'Settings' },
  ]

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-text-primary pb-16">
      <div className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] sticky top-[7.5rem] z-30">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[var(--accent-red)]">⬡</span>
            <span className="font-[family-name:var(--font-display)] font-medium text-sm tracking-wider">
              EMBEDDED COLLECTIVE
            </span>
            <span className="admin-badge">ADMIN</span>
          </div>
          <Link
            to="/community"
            className="font-mono text-xs text-text-secondary hover:text-[var(--accent-red)] flex items-center gap-1"
          >
            <ArrowLeft size={14} /> Exit
          </Link>
        </div>
        <div className="max-w-6xl mx-auto px-6 flex gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`admin-tab shrink-0 ${activeTab === tab.id ? 'active' : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 pt-8 relative z-10">
        {loading && activeTab === 'dashboard' ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 rounded-full border-2 border-[var(--accent-red)] border-t-transparent animate-spin" />
          </div>
        ) : error ? (
          <div className="glass-card p-8 text-center border border-[var(--border-accent)] text-[var(--accent-red)] font-mono text-xs mb-8">
            {error}
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <div className="space-y-8">
                <div>
                  <h2 className="font-mono text-xs uppercase tracking-wider text-text-muted mb-4">Overview</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: 'PROBLEMS', value: stats?.questions ?? 0 },
                      { label: 'SOLVED', value: stats?.solved ?? 0 },
                      { label: 'MEMBERS', value: stats?.users ?? 0 },
                      { label: 'RATING', value: stats?.avg_rating ?? 4.9 },
                    ].map((s) => (
                      <div key={s.label} className="stat-card p-4 text-center">
                        <span className="font-bold text-2xl text-text-primary block">{s.value}</span>
                        <span className="font-mono text-[10px] text-text-muted uppercase">{s.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="glass-card p-6 rounded-[var(--radius-lg)] border border-[var(--border-subtle)]">
                  <h3 className="font-mono text-xs uppercase tracking-wider text-text-primary mb-4">Recent Activity</h3>
                  <ul className="space-y-3">
                    {activity.map((a) => (
                      <li key={a.text} className="flex justify-between font-mono text-xs border-b border-[var(--border-subtle)] pb-2">
                        <span className="text-text-secondary">• {a.text}</span>
                        <span className="text-text-muted">{timeAgoShort(a.created_at)}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {reports.length > 0 && (
                  <div className="glass-card p-6 rounded-[var(--radius-lg)] border border-[var(--border-accent)]">
                    <h3 className="font-mono text-xs uppercase text-[var(--accent-red)] mb-4 flex items-center gap-2">
                      <AlertOctagon size={14} /> Flagged Content ({reports.length})
                    </h3>
                    {reports.map((r) => (
                      <div key={r.id} className="border-b border-[var(--border-subtle)] py-3 space-y-2">
                        <p className="font-mono text-xs text-text-primary">{r.item_title}</p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleResolveReport(r.id, 'dismiss')}
                            className="font-mono text-[10px] px-2 py-1 border border-[var(--border-cyan)] text-[var(--text-code)] rounded"
                          >
                            Dismiss
                          </button>
                          <button
                            type="button"
                            onClick={() => handleResolveReport(r.id, 'delete_content')}
                            className="font-mono text-[10px] px-2 py-1 border border-[var(--border-accent)] text-[var(--accent-red)] rounded"
                          >
                            Delete Content
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'problems' && (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-3">
                  <input
                    type="search"
                    placeholder="Search problems…"
                    value={problemFilter.search}
                    onChange={(e) => setProblemFilter((f) => ({ ...f, search: e.target.value }))}
                    className="flex-1 min-w-[200px] bg-[var(--bg-glass)] border border-[var(--border-normal)] rounded px-3 py-2 text-xs font-mono outline-none"
                  />
                  <select
                    value={problemFilter.status}
                    onChange={(e) => setProblemFilter((f) => ({ ...f, status: e.target.value }))}
                    className="bg-[var(--bg-glass)] border border-[var(--border-normal)] rounded px-3 py-2 text-xs font-mono"
                  >
                    <option value="ALL">ALL</option>
                    <option value="OPEN">OPEN</option>
                    <option value="SOLVED">SOLVED</option>
                  </select>
                </div>

                {selectedProblems.length > 0 && (
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="glass-card p-3 flex gap-2 border border-[var(--border-accent)]"
                  >
                    <button
                      type="button"
                      onClick={async () => {
                        if (!token) return
                        try {
                          await api.adminBulkProblems(token, selectedProblems, 'mark_solved')
                          setSelectedProblems([])
                          fetchProblems()
                        } catch {
                          alert('Bulk action failed')
                        }
                      }}
                      className="font-mono text-[10px] px-3 py-1 bg-[var(--accent-green)]/20 text-[var(--accent-green)] rounded"
                    >
                      Mark solved
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!token) return
                        try {
                          await api.adminBulkProblems(token, selectedProblems, 'delete')
                          setSelectedProblems([])
                          fetchProblems()
                        } catch {
                          alert('Bulk delete failed')
                        }
                      }}
                      className="font-mono text-[10px] px-3 py-1 bg-[var(--accent-red-dim)] text-[var(--accent-red)] rounded"
                    >
                      Delete selected
                    </button>
                  </motion.div>
                )}

                <div className="glass-card rounded-[var(--radius-lg)] border border-[var(--border-subtle)] overflow-x-auto">
                  <table className="w-full text-left font-mono text-xs">
                    <thead>
                      <tr className="border-b border-[var(--border-subtle)] text-text-muted">
                        <th className="p-3 w-8" />
                        <th className="p-3">ID</th>
                        <th className="p-3">Title</th>
                        <th className="p-3">Category</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProblems.map((p) => (
                        <tr key={p.id} className="admin-table-row">
                          <td className="p-3">
                            <input
                              type="checkbox"
                              checked={selectedProblems.includes(p.id)}
                              onChange={(e) =>
                                setSelectedProblems((prev) =>
                                  e.target.checked ? [...prev, p.id] : prev.filter((id) => id !== p.id)
                                )
                              }
                            />
                          </td>
                          <td className="p-3 text-text-muted">#{p.id}</td>
                          <td className="p-3 text-text-primary max-w-[240px] truncate">
                            {p.is_featured && '⭐ '}
                            {p.title}
                          </td>
                          <td className="p-3 text-text-secondary">{p.category}</td>
                          <td className="p-3">
                            <span
                              className={
                                p.status === 'SOLVED'
                                  ? 'text-[var(--accent-green)]'
                                  : 'text-amber-500'
                              }
                            >
                              {p.status}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => toggleProblemStatus(p.id, p.status)}
                                className="px-2 py-0.5 border border-[var(--border-normal)] rounded hover:border-[var(--accent-green)]"
                              >
                                {p.status === 'SOLVED' ? 'Reopen' : 'Solve'}
                              </button>
                              {p.is_featured ? (
                                <button
                                  type="button"
                                  onClick={() => toggleFeatured(p.id, p.is_featured)}
                                  className="px-2 py-0.5 border border-yellow-500/40 bg-yellow-500/10 text-yellow-500 rounded flex items-center gap-1 font-mono text-[10px] uppercase font-bold hover:bg-yellow-500/20"
                                  title="Remove from Portfolio Showcase"
                                >
                                  ★ Showcase
                                </button>
                              ) : (
                                problems.filter(prob => prob.is_featured).length < 3 && (
                                  <button
                                    type="button"
                                    onClick={() => toggleFeatured(p.id, p.is_featured)}
                                    className="px-2 py-0.5 border border-[var(--border-normal)] text-text-secondary hover:border-yellow-500/40 hover:text-yellow-500 rounded flex items-center gap-1 font-mono text-[10px] uppercase font-bold"
                                    title="Add to Portfolio Showcase"
                                  >
                                    ☆ Showcase
                                  </button>
                                )
                              )}
                              <button
                                type="button"
                                onClick={() => deleteProblem(p.id)}
                                className="p-1 border border-[var(--border-accent)] text-[var(--accent-red)] rounded hover:bg-[var(--accent-red)]/10"
                                title="Delete"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'members' && (
              <div className="glass-card rounded-[var(--radius-lg)] border border-[var(--border-subtle)] overflow-x-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead>
                    <tr className="border-b border-[var(--border-subtle)] text-text-muted">
                      <th className="p-3">Name</th>
                      <th className="p-3">Role</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="admin-table-row">
                        <td className="p-3">
                          <span className="text-text-primary font-bold">@{u.username}</span>
                          <p className="text-text-muted text-[10px]">{u.email}</p>
                        </td>
                        <td className="p-3 text-text-secondary uppercase">{u.role}</td>
                        <td className="p-3">
                          {u.is_active ? (
                            <span className="text-[var(--accent-green)]">Active</span>
                          ) : (
                            <span className="text-[var(--accent-red)]">Banned</span>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex gap-1">
                            {u.email !== 'haritmandaliya@gmail.com' && ((u.role !== 'admin' && u.role !== 'super_admin') || user?.role === 'super_admin') && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditUserId(u.id)
                                  setEditRole(u.role)
                                }}
                                className="px-2 py-0.5 border border-[var(--border-normal)] rounded hover:bg-[var(--bg-glass-hover)] transition-all"
                              >
                                Edit
                              </button>
                            )}
                            {u.email !== 'haritmandaliya@gmail.com' && u.role !== 'admin' && u.role !== 'super_admin' && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (u.is_active) {
                                    setBanUserId(u.id)
                                    setShowBanModal(true)
                                  } else {
                                    handleToggleStatus(u.id, u.is_active)
                                  }
                                }}
                                className="p-1 border border-[var(--border-accent)] text-[var(--accent-red)] rounded hover:bg-[var(--accent-red-dim)] transition-all"
                              >
                                {u.is_active ? <UserX size={12} /> : <UserCheck size={12} />}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'tags' && (
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={async () => {
                    const name = window.prompt('New tag name (without #):')
                    if (!name?.trim() || !token) return
                    try {
                      await api.adminCreateTag(token, name.trim())
                      fetchTags()
                    } catch {
                      alert('Failed to create tag')
                    }
                  }}
                  className="font-mono text-xs px-4 py-2 border border-[var(--border-accent)] text-[var(--accent-red)] rounded"
                >
                  + Create new tag
                </button>
                <div className="glass-card rounded-[var(--radius-lg)] border border-[var(--border-subtle)] overflow-x-auto">
                  <table className="w-full text-left font-mono text-xs">
                    <thead>
                      <tr className="border-b border-[var(--border-subtle)] text-text-muted">
                        <th className="p-3">Tag</th>
                        <th className="p-3">Uses</th>
                        <th className="p-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tags.map((t) => (
                        <tr key={t.id} className="admin-table-row">
                          <td className="p-3 text-[var(--text-code)]">#{t.name}</td>
                          <td className="p-3 text-text-secondary">{t.uses}</td>
                          <td className="p-3 flex gap-1">
                            <button
                              type="button"
                              onClick={async () => {
                                const next = window.prompt('Rename tag:', t.name)
                                if (!next?.trim() || !token) return
                                try {
                                  await api.adminRenameTag(token, t.id, next.trim())
                                  fetchTags()
                                } catch {
                                  alert('Rename failed')
                                }
                              }}
                              className="px-2 py-0.5 border border-[var(--border-normal)] rounded"
                            >
                              Rename
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                const target = window.prompt(`Merge #${t.name} into tag:`)
                                if (!target?.trim() || !token) return
                                try {
                                  await api.adminMergeTag(token, t.id, target.trim())
                                  fetchTags()
                                } catch {
                                  alert('Merge failed')
                                }
                              }}
                              className="px-2 py-0.5 border border-[var(--border-normal)] rounded"
                            >
                              Merge
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                if (!token || !window.confirm(`Delete #${t.name}?`)) return
                                try {
                                  await api.adminDeleteTag(token, t.id)
                                  fetchTags()
                                } catch {
                                  alert('Delete failed')
                                }
                              }}
                              className="px-2 py-0.5 border border-[var(--border-accent)] text-[var(--accent-red)] rounded"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="font-mono text-xs uppercase tracking-wider text-text-muted">Manage Community Reviews</h2>
                </div>

                <div className="glass-card rounded-[var(--radius-lg)] border border-[var(--border-subtle)] overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[var(--border-subtle)] font-mono text-[10px] text-text-muted uppercase bg-[var(--bg-glass)]">
                        <th className="p-4">Author</th>
                        <th className="p-4">Role/Title</th>
                        <th className="p-4">Rating</th>
                        <th className="p-4">Review Content</th>
                        <th className="p-4">Date</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-subtle)] font-mono text-xs">
                      {adminReviews.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-text-muted">
                            No reviews found.
                          </td>
                        </tr>
                      ) : (
                        adminReviews.map((rev) => (
                          <tr key={rev.id} className="hover:bg-[var(--bg-glass)] transition-colors">
                            <td className="p-4 font-bold text-text-primary">
                              {rev.user ? (
                                <Link to={`/community/u/${rev.user.username}`} className="text-cyan-spark hover:underline">
                                  @{rev.user.username}
                                </Link>
                              ) : (
                                rev.author_name
                              )}
                            </td>
                            <td className="p-4 text-text-secondary">{rev.role_or_title}</td>
                            <td className="p-4 text-yellow-500 font-bold">★ {rev.rating}/5</td>
                            <td className="p-4 text-text-secondary/80 max-w-xs truncate" title={rev.review_text}>
                              {rev.review_text}
                            </td>
                            <td className="p-4 text-text-muted">
                              {new Date(rev.created_at).toLocaleDateString()}
                            </td>
                            <td className="p-4">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${
                                  rev.is_visible
                                    ? 'bg-[var(--accent-green)]/10 text-[var(--accent-green)] border border-[var(--accent-green)]/20'
                                    : 'bg-[var(--accent-red)]/10 text-[var(--accent-red)] border border-[var(--accent-red)]/20'
                                }`}
                              >
                                {rev.is_visible ? 'Visible' : 'Hidden'}
                              </span>
                            </td>
                            <td className="p-4 text-right space-x-2">
                              <button
                                type="button"
                                onClick={() => toggleReviewVisibility(rev.id)}
                                className={`px-2 py-1 rounded border text-[10px] font-bold uppercase transition-colors ${
                                  rev.is_visible
                                    ? 'border-[var(--border-accent)] text-[var(--accent-red)] hover:bg-[var(--accent-red)]/10'
                                    : 'border-[var(--accent-green)]/35 text-[var(--accent-green)] hover:bg-[var(--accent-green)]/10'
                                }`}
                              >
                                {rev.is_visible ? 'Hide' : 'Approve'}
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteReview(rev.id)}
                                className="p-1 border border-[var(--border-accent)] text-[var(--accent-red)] hover:bg-[var(--accent-red)]/10 rounded inline-flex items-center align-middle"
                                title="Delete"
                              >
                                <Trash2 size={12} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="glass-card p-6 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] max-w-xl space-y-6">
                <h2 className="font-mono text-xs uppercase tracking-wider text-text-muted">Platform Settings</h2>
                <label className="block space-y-1">
                  <span className="font-mono text-[10px] text-text-muted uppercase">Community Name</span>
                  <input
                    value={settings.community_name}
                    onChange={(e) => setSettings((s) => ({ ...s, community_name: e.target.value }))}
                    className="w-full bg-[var(--bg-glass)] border border-[var(--border-normal)] rounded px-3 py-2 text-sm outline-none"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="font-mono text-[10px] text-text-muted uppercase">Community Tagline</span>
                  <input
                    value={settings.community_tagline}
                    onChange={(e) => setSettings((s) => ({ ...s, community_tagline: e.target.value }))}
                    className="w-full bg-[var(--bg-glass)] border border-[var(--border-normal)] rounded px-3 py-2 text-sm outline-none"
                  />
                </label>

                <div>
                  <p className="font-mono text-[10px] text-text-muted uppercase mb-2">Join Control</p>
                  {(['open', 'invite', 'approval'] as const).map((mode) => (
                    <label key={mode} className="flex items-center gap-2 font-mono text-xs mb-1 cursor-pointer">
                      <input
                        type="radio"
                        checked={settings.join_mode === mode}
                        onChange={() => setSettings((s) => ({ ...s, join_mode: mode }))}
                      />
                      {mode === 'open' && 'Open (anyone can join)'}
                      {mode === 'invite' && 'Invite only'}
                      {mode === 'approval' && 'Approval required'}
                    </label>
                  ))}
                </div>

                <div>
                  <p className="font-mono text-[10px] text-text-muted uppercase mb-2">Features</p>
                  {(
                    [
                      ['allow_google_oauth', 'Allow Google OAuth'],
                      ['allow_otp_login', 'Allow OTP login'],
                      ['allow_anonymous_browse', 'Allow anonymous browsing'],
                      ['email_notifications', 'Email notifications for new problems'],
                      ['public_leaderboard', 'Show leaderboard publicly'],
                    ] as const
                  ).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 font-mono text-xs mb-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(settings[key as keyof typeof settings])}
                        onChange={(e) => setSettings((s) => ({ ...s, [key]: e.target.checked }))}
                      />
                      {label}
                    </label>
                  ))}
                </div>

                {import.meta.env.DEV && (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 font-mono text-[10px] text-amber-400 space-y-1">
                    <p className="uppercase tracking-wider">Seeded Accounts (dev only)</p>
                    <p>Admin email: admin@example.com</p>
                    <p>Admin OTP: Prints in terminal (yellow highlight via ./run.sh logs)</p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={async () => {
                    if (!token) return
                    try {
                      await api.adminSaveSettings(token, settings)
                      alert('Settings saved successfully.')
                    } catch {
                      alert('Failed to save settings')
                    }
                  }}
                  className="font-mono text-xs px-6 py-2.5 bg-[var(--accent-red)] text-white rounded hover:shadow-[var(--shadow-glow-r)]"
                >
                  Save Settings
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <AnimatePresence>
        {showBanModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="auth-modal-overlay"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="auth-modal p-6 max-w-sm w-full mx-4"
            >
              <h3 className="font-mono text-sm text-[var(--accent-red)] uppercase mb-2 flex items-center gap-2">
                <ShieldAlert size={16} /> Ban User
              </h3>
              <textarea
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Reason for ban…"
                rows={3}
                className="w-full bg-[var(--bg-glass)] border border-[var(--border-normal)] rounded p-2 font-mono text-xs outline-none mb-4 resize-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowBanModal(false)}
                  className="px-3 py-1.5 font-mono text-xs border border-[var(--border-normal)] rounded"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleBanUser}
                  disabled={!banReason.trim()}
                  className="px-4 py-1.5 font-mono text-xs bg-[var(--accent-red)] text-white rounded disabled:opacity-50"
                >
                  Confirm Ban
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {editUserId !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="auth-modal-overlay"
            onClick={() => setEditUserId(null)}
          >
            <motion.div
              className="auth-modal p-6 max-w-sm w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-mono text-sm mb-4">Change Role</h3>
              <select
                value={editRole}
                onChange={(e) => setEditRole(e.target.value)}
                className="w-full bg-[var(--bg-glass)] border border-[var(--border-normal)] rounded px-3 py-2 font-mono text-xs mb-4"
              >
                <option value="solution_seeker">Solution Seeker</option>
                <option value="contributor">Contributor</option>
                {user?.role === 'super_admin' && <option value="admin">Admin</option>}
                {user?.role === 'super_admin' && <option value="super_admin">Super Admin</option>}
              </select>
              <button
                type="button"
                onClick={() => editUserId && handleToggleRole(editUserId, editRole)}
                className="w-full py-2 bg-[var(--accent-red)] text-white font-mono text-xs rounded"
              >
                Save Role
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
