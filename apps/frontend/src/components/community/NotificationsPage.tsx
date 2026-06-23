import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Bell,
  MessageSquare,
  Award,
  TrendingUp,
  CheckCircle2,
  Check,
  ArrowRight,
  Circle,
  Clock
} from 'lucide-react'
import { useCommunity } from '../../context/CommunityContext'

function parseUTCDate(dateString: string): Date {
  if (!dateString) return new Date()
  let formatted = dateString
  if (!formatted.endsWith('Z') && !formatted.includes('+') && !/-\d{2}:\d{2}$/.test(formatted)) {
    formatted = formatted + 'Z'
  }
  return new Date(formatted)
}

function timeAgo(dateString: string): string {
  if (!dateString) return ''
  const now = new Date()
  const date = parseUTCDate(dateString)
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  if (seconds < 0) return 'just now'
  if (seconds < 5) return 'just now'
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'yesterday'
  return `${days}d ago`
}

function formatFullDateTime(dateString: string): string {
  if (!dateString) return ''
  const date = parseUTCDate(dateString)
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}

export function NotificationsPage() {
  const { notifications, markNotificationRead, markAllNotificationsRead } = useCommunity()
  const navigate = useNavigate()

  const handleNotificationClick = async (id: number, link?: string) => {
    await markNotificationRead(id)
    if (link) {
      navigate(link)
    }
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'comment':
        return <MessageSquare size={16} className="text-cyan-spark" />
      case 'answer':
        return <Award size={16} className="text-red-core" />
      case 'solution':
        return <CheckCircle2 size={16} className="text-green-500" />
      case 'accept':
        return <CheckCircle2 size={16} className="text-yellow-500" />
      case 'reputation':
        return <TrendingUp size={16} className="text-yellow-500" />
      default:
        return <Bell size={16} className="text-text-secondary" />
    }
  }

  const getLabel = (type: string) => {
    switch (type) {
      case 'comment':
        return 'COMMENTED'
      case 'answer':
        return 'ANSWERED'
      case 'solution':
        return 'SOLUTION'
      case 'accept':
        return 'ACCEPTED'
      case 'reputation':
        return 'UPVOTE'
      default:
        return 'ACTIVITY'
    }
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length

  return (
    <div className="min-h-screen bg-[--bg-void] text-text-primary pt-24 pb-20 px-6 relative">
      <div className="max-w-3xl mx-auto z-10 relative">
        
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10 pb-6 border-b border-[--glass-border]/50">
          <div>
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-red-core block mb-3">
              // COMMUNICATIONS HUB
            </span>
            <h1 className="font-heading font-bold text-3xl md:text-5xl uppercase tracking-[0.08em] text-text-primary">
              NOTIFICATIONS
            </h1>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {unreadCount > 0 && (
              <button
                onClick={() => markAllNotificationsRead()}
                className="flex items-center gap-1.5 font-mono text-[10px] px-4 py-2 bg-[--red-core]/10 hover:bg-[--red-core]/25 text-[--red-core] border border-[--red-core]/45 hover:border-[--red-core] rounded transition-all duration-300 shadow-[0_0_12px_rgba(192,25,44,0.08)]"
              >
                <Check size={12} />
                MARK ALL READ
              </button>
            )}
            <span className="font-mono text-[10px] uppercase tracking-wider text-text-secondary bg-[--bg-deep] border border-[--glass-border] px-3 py-2 rounded">
              Total: {notifications.length}
            </span>
          </div>
        </div>

        {/* Notifications List */}
        {notifications.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-lg border border-[--glass-border] p-12 text-center"
          >
            <div className="w-12 h-12 rounded-full bg-[--bg-deep] border border-[--glass-border] flex items-center justify-center mx-auto mb-4 text-text-muted">
              <Bell size={20} className="opacity-40 animate-pulse" />
            </div>
            <h3 className="font-heading font-bold text-lg uppercase tracking-wider mb-2 text-text-primary">
              System Clear
            </h3>
            <p className="font-body text-xs text-text-secondary max-w-sm mx-auto">
              Your message queues are empty. Any comments, answers, or solution accepts will report here in real-time.
            </p>
          </motion.div>
        ) : (
          <div className="flex flex-col gap-3">
            {notifications.map((notif, idx) => (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx * 0.05, 0.4) }}
                onClick={() => handleNotificationClick(notif.id, notif.link)}
                className={`group glass-card rounded-lg border p-4 flex items-start gap-4 transition-all duration-300 cursor-pointer ${
                  notif.is_read
                    ? 'border-[--glass-border]/40 opacity-75 hover:opacity-100 hover:border-[--glass-border]'
                    : 'border-red-core/30 bg-red-dim/5 hover:border-red-core/60 shadow-[0_0_15px_rgba(192,25,44,0.04)] border-l-4 border-l-red-core'
                }`}
              >
                {/* Left icon wrapper */}
                <div className="p-2 bg-[--bg-deep] border border-[--glass-border] rounded-md shrink-0 flex items-center justify-center transition-colors group-hover:border-red-core/30">
                  {getIcon(notif.type)}
                </div>

                {/* Main Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="font-mono text-[9px] font-bold px-2 py-0.5 rounded border border-[--glass-border] text-text-secondary bg-[--bg-deep]">
                      {getLabel(notif.type)}
                    </span>
                    {notif.is_read ? (
                      <span className="flex items-center gap-1 font-mono text-[8px] font-bold text-text-muted bg-[--bg-deep] border border-[--glass-border] px-1.5 py-0.5 rounded">
                        <Check size={8} className="text-green-500" />
                        SEEN
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 font-mono text-[8px] font-bold text-red-core bg-[--accent-red]/10 border border-red-core/30 px-1.5 py-0.5 rounded animate-pulse">
                        <Circle size={6} fill="currentColor" />
                        UNSEEN
                      </span>
                    )}
                  </div>
                  <p className="font-body text-sm font-semibold text-text-primary leading-relaxed break-words group-hover:text-red-glow transition-colors">
                    {notif.message}
                  </p>
                  <div className="flex items-center gap-1.5 font-mono text-[10px] text-text-secondary mt-2.5 flex-wrap">
                    <Clock size={11} className="text-text-muted" />
                    <span>{timeAgo(notif.created_at)}</span>
                    <span className="text-text-muted/30">•</span>
                    <span className="text-text-muted">{formatFullDateTime(notif.created_at)}</span>
                  </div>
                </div>

                {/* Right Arrow Navigation Indicator */}
                <div className="self-center p-1 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0 text-red-core">
                  <ArrowRight size={16} />
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
