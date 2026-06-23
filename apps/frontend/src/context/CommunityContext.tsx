import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

export interface CommunityUser {
  id: number
  username: string
  display_name?: string
  email: string
  phone?: string
  role: 'solution_seeker' | 'contributor' | 'admin' | 'user' | 'super_admin'
  profile_pic_url?: string
  avatar_url?: string
  bio?: string
  education?: string
  higher_edu?: string
  resume_url?: string
  github_url?: string
  linkedin_url?: string
  reputation: number
  onboarding_done?: boolean
  email_answer?: boolean
  email_accepted?: boolean
  email_digest?: boolean
  push_enabled?: boolean
  created_at: string
}

interface Notification {
  id: number
  type: string
  message: string
  is_read: boolean
  link?: string
  created_at: string
}

interface CommunityContextType {
  user: CommunityUser | null
  token: string | null
  notifications: Notification[]
  authModalOpen: boolean
  authModalTab: 'signin' | 'signup'
  setAuthModalOpen: (open: boolean, tab?: 'signin' | 'signup') => void
  login: (token: string) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
  markNotificationRead: (id: number) => Promise<void>
  markAllNotificationsRead: () => Promise<void>
}

const CommunityContext = createContext<CommunityContextType | undefined>(undefined)

const TOKEN_KEY = 'ec_access_token'

export const CommunityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<CommunityUser | null>(null)
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY))
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [authModalOpen, setAuthModalOpenState] = useState(false)
  const [authModalTab, setAuthModalTab] = useState<'signin' | 'signup'>('signin')

  const setAuthModalOpen = useCallback((open: boolean, tab: 'signin' | 'signup' = 'signin') => {
    setAuthModalTab(tab)
    setAuthModalOpenState(open)
  }, [])

  const fetchProfile = async (currentToken: string) => {
    try {
      const resp = await fetch('/api/v1/auth/me', {
        headers: { Authorization: `Bearer ${currentToken}` },
      })
      if (resp.ok) {
        const data = await resp.json()
        setUser(data)
      } else if (resp.status === 401) {
        logout()
      }
    } catch {
      setUser(null)
    }
  }

  const refreshUser = async () => {
    if (token) await fetchProfile(token)
  }

  const login = async (newToken: string) => {
    localStorage.setItem(TOKEN_KEY, newToken)
    localStorage.setItem('ec_token', newToken)
    setToken(newToken)
    await fetchProfile(newToken)
  }

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem('ec_token')
    setToken(null)
    setUser(null)
  }

  const markNotificationRead = async (id: number) => {
    if (token) {
      await fetch(`/api/v1/users/me/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      })
    }
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)))
  }

  const markAllNotificationsRead = async () => {
    if (token) {
      await fetch('/api/v1/users/me/notifications/read-all', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      })
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
  }

  const fetchNotifications = async (currentToken: string) => {
    try {
      const resp = await fetch('/api/v1/users/me/notifications', {
        headers: { Authorization: `Bearer ${currentToken}` },
      })
      if (resp.ok) {
        setNotifications(await resp.json())
      }
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    if (token) {
      fetchProfile(token)
      fetchNotifications(token)
      const interval = setInterval(() => {
        fetchNotifications(token)
      }, 8000)
      return () => clearInterval(interval)
    } else {
      setNotifications([])
    }
  }, [token])

  return (
    <CommunityContext.Provider
      value={{
        user,
        token,
        notifications,
        authModalOpen,
        authModalTab,
        setAuthModalOpen,
        login,
        logout,
        refreshUser,
        markNotificationRead,
        markAllNotificationsRead,
      }}
    >
      {children}
    </CommunityContext.Provider>
  )
}

export const useCommunity = () => {
  const context = useContext(CommunityContext)
  if (context === undefined) {
    throw new Error('useCommunity must be used within a CommunityProvider')
  }
  return context
}

export const useRequireAuth = () => {
  const { user, setAuthModalOpen } = useCommunity()
  return (action: () => void) => {
    if (!user) {
      setAuthModalOpen(true, 'signin')
      return
    }
    action()
  }
}

export const useRequireContributor = () => {
  const { user } = useCommunity()
  return user?.role === 'contributor' || user?.role === 'admin' || user?.role === 'super_admin'
}

export const isContributorRole = (role?: string) =>
  role === 'contributor' || role === 'admin' || role === 'super_admin'
