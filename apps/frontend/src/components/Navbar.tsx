import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, Sun, Moon } from 'lucide-react'
import { ChipIcon } from './shared/ChipIcon'
import { NAV_LINKS, type NavLinkItem } from '../data/content'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { useCommunity } from '../context/CommunityContext'

function NavLetter({ letter, delay, hoverColor = '#FF2040' }: { letter: string; delay: number; hoverColor?: string }) {
  const [hovered, setHovered] = useState(false)
  return (
    <span
      className="inline-block transition-all duration-300"
      style={{
        transitionDelay: hovered ? '0ms' : `${delay * 20}ms`,
        color: hovered ? hoverColor : 'var(--text-nav)',
        textShadow: hovered ? `0 0 8px ${hoverColor}` : 'none',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {letter === ' ' ? '\u00A0' : letter}
    </span>
  )
}

function NavLinkContent({
  label,
  accent,
}: {
  label: string
  accent?: 'cyan' | 'red'
}) {
  const isCyan = accent === 'cyan'
  return (
    <>
      {isCyan && <span className="text-cyan-spark mr-0.5">⬡</span>}
      {label.split('').map((letter, i) => (
        <NavLetter
          key={i}
          letter={letter}
          delay={i}
          hoverColor={isCyan ? '#00F5FF' : '#FF2040'}
        />
      ))}
    </>
  )
}

function PortfolioNavLink({
  link,
  active,
  onAnchorClick,
}: {
  link: NavLinkItem
  active: boolean
  onAnchorClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void
}) {
  const isCyan = link.accent === 'cyan'
  const className = `font-heading font-bold text-sm uppercase tracking-wide transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] relative group flex items-center gap-1 ${
    isCyan ? 'text-cyan-spark' : ''
  }`

  const underline = active ? (
    <svg className="absolute -bottom-1 left-0 w-full h-1" viewBox="0 0 100 4">
      <motion.line
        x1="0"
        y1="2"
        x2="100"
        y2="2"
        stroke={isCyan ? '#00F5FF' : '#C0192C'}
        strokeWidth="2"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.6 }}
      />
    </svg>
  ) : null

  if (link.external) {
    return (
      <Link to={link.href} className={className}>
        <NavLinkContent label={link.label} accent={link.accent} />
      </Link>
    )
  }

  return (
    <a href={link.href} onClick={onAnchorClick} className={className}>
      <NavLinkContent label={link.label} accent={link.accent} />
      {underline}
    </a>
  )
}

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [activeSection, setActiveSection] = useState('')
  const [scrolled, setScrolled] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const [pendingScrollAnchor, setPendingScrollAnchor] = useState<string | null>(null)
  const { theme, toggleTheme } = useTheme()
  const { user } = useCommunity()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })

    let observer: IntersectionObserver | null = null
    if (location.pathname === '/') {
      const sections = NAV_LINKS.filter((l) => !l.external).map((l) =>
        document.querySelector(l.href)
      )
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setActiveSection(`#${entry.target.id}`)
            }
          })
        },
        { threshold: 0.3 }
      )
      sections.forEach((s) => s && observer!.observe(s))
    } else {
      setActiveSection('')
    }

    return () => {
      window.removeEventListener('scroll', onScroll)
      if (observer) observer.disconnect()
    }
  }, [location.pathname])

  useEffect(() => {
    if (location.pathname === '/' && pendingScrollAnchor) {
      const anchor = pendingScrollAnchor
      setPendingScrollAnchor(null)
      setTimeout(() => {
        const el = document.querySelector(anchor)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' })
        }
      }, 150)
    }
  }, [location.pathname, pendingScrollAnchor])

  const handleNavLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (location.pathname !== '/') {
      e.preventDefault()
      setPendingScrollAnchor(href)
      navigate('/')
    }
  }

  const isCommunity = location.pathname.startsWith('/community')

  const textNavColor =
    isCommunity
      ? 'var(--text-primary)'
      : (theme === 'dark' || !scrolled ? '#f0f0ff' : 'var(--text-primary)')

  return (
    <>
      <nav
        className={`site-navbar sticky top-0 z-50 h-16 flex items-center px-6 border-b transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          scrolled
            ? (theme === 'dark'
                ? 'bg-deep/95 backdrop-blur-xl border-red-core/40 shadow-[0_4px_24px_rgba(0,0,0,0.15)]'
                : 'bg-surface/95 backdrop-blur-xl border-red-core/30 shadow-[0_4px_24px_rgba(0,0,0,0.05)]')
            : 'bg-transparent border-transparent'
        }`}
        style={{ '--text-nav': textNavColor } as React.CSSProperties}
      >
        <div className="max-w-content mx-auto w-full flex items-center justify-between">
          <Link to={isCommunity ? '/community' : '/'} className="flex items-center gap-2 group">
            <ChipIcon size={28} />
            <span className="font-heading font-bold text-lg text-red-core tracking-[0.1em] group-hover:text-red-glow transition-colors duration-300">
              {isCommunity ? 'COLLECTIVE.' : 'HARIT.'}
            </span>
          </Link>

          {isCommunity ? (
            <div className="hidden md:flex items-center gap-6">
              <Link
                to="/community"
                className="font-mono text-xs uppercase tracking-wider text-text-secondary hover:text-cyan-spark transition-colors"
              >
                Feed
              </Link>
              <Link
                to="/community/ask"
                className="font-mono text-xs uppercase tracking-wider text-text-secondary hover:text-red-glow transition-colors"
              >
                Ask
              </Link>
              {(user?.role === 'admin' || user?.role === 'super_admin' || user?.email === 'haritmandaliya@gmail.com') && (
                <Link
                  to="/community/admin"
                  className="font-mono text-xs uppercase tracking-wider text-text-secondary hover:text-red-glow transition-colors"
                >
                  Admin
                </Link>
              )}
              <Link to="/" className="font-mono text-xs uppercase tracking-wider text-red-core hover:text-red-glow transition-colors">
                Portfolio
              </Link>
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-8">
              {NAV_LINKS.map((link) => (
                <PortfolioNavLink
                  key={link.href}
                  link={link}
                  active={!link.external && activeSection === link.href}
                  onAnchorClick={(e) => handleNavLinkClick(e, link.href)}
                />
              ))}

              <button
                onClick={toggleTheme}
                className="p-2 rounded-full border border-red-core/30 bg-glass-bg hover:border-red-core hover:shadow-[0_0_8px_rgba(192,25,44,0.3)] transition-all duration-300 ml-2"
                style={{ color: 'var(--text-nav)' }}
                aria-label="Toggle theme"
              >
                <motion.div
                  key={theme}
                  initial={{ rotate: -180, scale: 0.8 }}
                  animate={{ rotate: 0, scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                </motion.div>
              </button>
            </div>
          )}

          <button
            className="md:hidden text-red-core hover:text-red-glow transition-colors duration-300"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-40 bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center gap-8 md:hidden pt-16"
          >
            {isCommunity ? (
              <div className="flex flex-col items-center gap-6">
                <Link
                  to="/community"
                  className="font-heading font-bold text-2xl uppercase tracking-wide text-text-primary hover:text-cyan-spark transition-colors"
                  onClick={() => setMobileOpen(false)}
                >
                  Feed
                </Link>
                <Link
                  to="/community/ask"
                  className="font-heading font-bold text-2xl uppercase tracking-wide text-text-primary hover:text-red-glow transition-colors"
                  onClick={() => setMobileOpen(false)}
                >
                  Ask Question
                </Link>
                {(user?.role === 'admin' || user?.role === 'super_admin' || user?.email === 'haritmandaliya@gmail.com') && (
                  <Link
                    to="/community/admin"
                    className="font-heading font-bold text-2xl uppercase tracking-wide text-text-primary hover:text-red-glow transition-colors"
                    onClick={() => setMobileOpen(false)}
                  >
                    Admin Shell
                  </Link>
                )}
                <Link
                  to="/"
                  className="font-heading font-bold text-2xl uppercase tracking-wide text-red-core hover:text-red-glow transition-colors"
                  onClick={() => setMobileOpen(false)}
                >
                  Portfolio
                </Link>
              </div>
            ) : (
              <>
                {NAV_LINKS.map((link, i) =>
                  link.external ? (
                    <motion.div
                      key={link.href}
                      initial={{ x: -40, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: i * 0.07, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <Link
                        to={link.href}
                        className="font-heading font-bold text-2xl uppercase tracking-wide text-cyan-spark hover:text-cyan-spark/80 transition-colors duration-300 flex items-center gap-2"
                        onClick={() => setMobileOpen(false)}
                      >
                        <span>⬡</span> {link.label}
                      </Link>
                    </motion.div>
                  ) : (
                    <motion.a
                      key={link.href}
                      href={link.href}
                      initial={{ x: -40, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: i * 0.07, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                      className="font-heading font-bold text-2xl uppercase tracking-wide text-text-primary hover:text-red-glow transition-colors duration-300"
                      onClick={(e) => {
                        setMobileOpen(false)
                        handleNavLinkClick(e, link.href)
                      }}
                    >
                      {link.label}
                    </motion.a>
                  )
                )}

                <motion.button
                  onClick={() => {
                    setMobileOpen(false)
                    toggleTheme()
                  }}
                  initial={{ x: -40, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: NAV_LINKS.length * 0.07, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  className="font-heading font-bold text-xl uppercase tracking-wide text-cyan-spark flex items-center gap-2 border border-red-core/30 px-6 py-2 rounded-full mt-4"
                >
                  {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                  <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                </motion.button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
