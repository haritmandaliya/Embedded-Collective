import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Bell, Sun, Moon, ChevronDown, LogOut, User, Settings, Home, Shield } from 'lucide-react'
import { ChipIcon } from '../shared/ChipIcon'
import { useCommunity, isContributorRole } from '../../context/CommunityContext'
import { useTheme } from '../../context/ThemeContext'
import { Avatar } from './Avatar'
import { ContributorTag } from './ContributorTag'
import { PROBLEM_CATEGORIES } from './constants'
const NAV_LINKS = [
  { label: 'Feed', to: '/community', match: (p: string) => p === '/community' || p === '/community/' },
  { label: 'Leaderboard', to: '/community/leaderboard', match: (p: string) => p.startsWith('/community/leaderboard') },
  { label: 'Ask', to: '/community/ask', match: (p: string) => p.startsWith('/community/ask') },
  { label: 'Portfolio', to: '/', match: () => false, external: true },
]
export function CommunityNav() {
  const { user, logout, setAuthModalOpen, notifications } = useCommunity()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('q') || '')
  const [searchFocused, setSearchFocused] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({})
  const menuRef = useRef<HTMLDivElement>(null)
  const isHome = location.pathname === '/community' || location.pathname === '/community/'

  useEffect(() => {
    const t = setTimeout(() => {
      setSearchParams((p) => {
        if (search.trim()) p.set('q', search.trim())
        else p.delete('q')
        p.set('page', '1')
        return p
      })
    }, 300)
    return () => clearTimeout(t)
  }, [search, setSearchParams])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    const loadCounts = () => {
      fetch('/api/v1/stats/categories')
        .then((r) => (r.ok ? r.json() : []))
        .then((data: Array<{ category: string; count: number }>) => {
          const map: Record<string, number> = {}
          data.forEach((c) => {
            map[c.category] = c.count
          })
          setCategoryCounts(map)
        })
        .catch(() => {})
    }

    loadCounts()
    const onRefresh = () => loadCounts()
    window.addEventListener('community:stats-refresh', onRefresh)
    return () => window.removeEventListener('community:stats-refresh', onRefresh)
  }, [location.pathname, searchParams.toString()])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        document.getElementById('community-search')?.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const handleCategory = (value: string) => {
    setSearchParams((p) => {
      if (value) p.set('category', value)
      else p.delete('category')
      p.set('page', '1')
      return p
    })
  }

  const unread = notifications.filter((n) => !n.is_read).length
  const activeCategory = searchParams.get('category') || ''

  return (
    <header className="community-navbar">
      <div className="max-w-[1200px] mx-auto px-6 h-14 flex items-center gap-4">
        <Link to="/community" className="flex items-center gap-2 shrink-0 group">
          <ChipIcon size={22} />
          <span
            className="font-[family-name:var(--font-display)] font-medium text-sm text-text-primary tracking-wider hidden sm:block"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            EMBEDDED COLLECTIVE
          </span>
          {(user?.role === 'admin' || user?.role === 'super_admin' || user?.email === 'haritmandaliya@gmail.com' || user?.email === 'haritman6@gmail.com') && location.pathname.startsWith('/community/admin') && (
            <span className="admin-badge hidden sm:inline">ADMIN</span>
          )}
        </Link>

        <nav className="hidden md:flex items-center gap-5 shrink-0">
          {NAV_LINKS.map((link) => {
            const isAdminEmail = user?.email === 'haritmandaliya@gmail.com' || user?.email === 'haritman6@gmail.com'
            if ('adminOnly' in link && (link as any).adminOnly && user?.role !== 'admin' && user?.role !== 'super_admin' && !isAdminEmail) return null
            const active = link.match(location.pathname)
            if (link.external) {
              return (
                <Link key={link.label} to={link.to} className="community-nav-link">
                  {link.label}
                </Link>
              )
            }
            return (
              <Link
                key={link.label}
                to={link.to}
                className={`community-nav-link ${active ? 'active' : ''}`}
              >
                {link.label}
              </Link>
            )
          })}
          {(user?.role === 'admin' || user?.role === 'super_admin' || user?.email === 'haritmandaliya@gmail.com' || user?.email === 'haritman6@gmail.com') && (
            <Link
              to="/community/admin"
              className={`community-nav-link ${location.pathname.startsWith('/community/admin') ? 'active' : ''}`}
            >
              Admin
            </Link>
          )}
        </nav>

        <div
          className={`community-search flex-1 max-w-md relative rounded-full transition-all ${
            searchFocused ? 'max-w-lg' : 'max-w-xs md:max-w-sm'
          }`}
        >
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            id="community-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="Search problems… (⌘K)"
            className="w-full bg-transparent rounded-full py-2 pl-9 pr-4 text-xs outline-none text-text-primary placeholder:text-text-muted"
            style={{ fontFamily: 'var(--font-mono)' }}
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            to="/community/notifications"
            className="relative p-2 rounded-full border border-[var(--border-normal)] text-text-secondary hover:border-[var(--border-accent)] transition-colors"
            aria-label="Notifications"
          >
            <Bell size={16} />
            {unread > 0 && <span className="notification-dot">{unread}</span>}
          </Link>

          <button
            type="button"
            onClick={toggleTheme}
            className="theme-toggle-btn p-2 rounded-full border border-[var(--border-normal)] text-text-secondary hover:border-[var(--border-accent)] transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {user ? (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full border border-[var(--border-normal)] hover:border-[var(--border-accent)] transition-colors"
              >
                <Avatar user={user} size={28} />
                <ChevronDown size={12} className="text-text-secondary" />
              </button>
              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    className="absolute right-0 top-full mt-2 w-52 community-dropdown-menu rounded-lg py-2 shadow-xl"
                  >
                    <div className="px-3 py-2 border-b border-[var(--border-subtle)] mb-1">
                      <p className="font-mono text-xs text-text-primary truncate">{user.display_name || user.username}</p>
                      {isContributorRole(user.role) && (
                        <div className="mt-1">
                          <ContributorTag />
                        </div>
                      )}
                    </div>
                    <Link
                      to={`/community/u/${user.username}`}
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-xs font-mono text-text-secondary hover:text-text-primary hover:bg-[var(--bg-glass-hover)]"
                    >
                      <User size={14} /> My Profile
                    </Link>
                    <Link
                      to="/community/settings"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-xs font-mono text-text-secondary hover:text-text-primary hover:bg-[var(--bg-glass-hover)]"
                    >
                      <Settings size={14} /> Settings
                    </Link>
                    {(user?.role === 'admin' || user?.role === 'super_admin' || user?.email === 'haritmandaliya@gmail.com' || user?.email === 'haritman6@gmail.com') && (
                      <Link
                        to="/community/admin"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-xs font-mono text-[var(--accent-red)] hover:bg-[var(--bg-glass-hover)]"
                      >
                        <Shield size={14} /> Admin Panel
                      </Link>
                    )}
                    <div className="border-t border-[var(--border-subtle)] my-1" />
                    <Link
                      to="/"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-xs font-mono text-[var(--accent-cyan)] hover:bg-[var(--bg-glass-hover)]"
                    >
                      <Home size={14} /> Back to Portfolio
                    </Link>
                    <div className="border-t border-[var(--border-subtle)] my-1" />
                    <button
                      type="button"
                      onClick={() => {
                        logout()
                        setMenuOpen(false)
                        navigate('/community')
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-mono text-[var(--accent-red)] hover:bg-[var(--accent-red-dim)]"
                    >
                      <LogOut size={14} /> Sign Out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAuthModalOpen(true, 'signup')}
              className="font-mono text-[10px] uppercase tracking-wider px-4 py-2 rounded-full bg-[var(--accent-red)] text-white hover:shadow-[var(--shadow-glow-r)] transition-all"
            >
              Join Free
            </button>
          )}
        </div>
      </div>

      {isHome && (
        <div className="border-t border-[var(--border-subtle)] overflow-x-auto scrollbar-hide">
          <div className="max-w-[1200px] mx-auto px-6 flex gap-2 py-3">
            {PROBLEM_CATEGORIES.map((cat) => {
              const count = categoryCounts[cat.value] ?? 0
              const label = cat.value ? `${cat.short} (${count})` : `#${cat.short.toUpperCase()}`
              return (
                <button
                  key={cat.label}
                  type="button"
                  onClick={() => handleCategory(cat.value)}
                  className={`category-pill shrink-0 ${activeCategory === cat.value ? 'active' : ''}`}
                >
                  {cat.value ? label : `#${cat.short.toUpperCase()}`}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </header>
  )
}
