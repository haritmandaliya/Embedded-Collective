import React from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { PageTransition } from '../PageTransition'
import { useCommunity } from '../../context/CommunityContext'
import { CommunityLayout } from './CommunityLayout'
import { CommunityHome } from './CommunityHome'
import { AskQuestion } from './AskQuestion'
import { QuestionDetail } from './QuestionDetail'
import { UserProfile } from './UserProfile'
import { AdminDashboard } from './AdminDashboard'
import { Settings } from './Settings'
import { Leaderboard } from './Leaderboard'
import { NotificationsPage } from './NotificationsPage'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, setAuthModalOpen } = useCommunity()
  if (!user) {
    setAuthModalOpen(true, 'signin')
    return <Navigate to="/community" replace />
  }
  return <>{children}</>
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user } = useCommunity()
  if (user?.role !== 'admin' && user?.role !== 'super_admin' && user?.email !== 'haritmandaliya@gmail.com') return <Navigate to="/community" replace />
  return <>{children}</>
}

function CommunityRoutes() {
  const location = useLocation()

  return (
    <>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route element={<CommunityLayout />}>
            <Route index element={<PageTransition><CommunityHome /></PageTransition>} />
            <Route path="ask" element={<RequireAuth><PageTransition><AskQuestion /></PageTransition></RequireAuth>} />
            <Route path="q/:slug" element={<PageTransition><QuestionDetail /></PageTransition>} />
            <Route path="u/:username" element={<PageTransition><UserProfile /></PageTransition>} />
            <Route path="users/:id" element={<PageTransition><UserProfile /></PageTransition>} />
            <Route path="settings" element={<RequireAuth><PageTransition><Settings /></PageTransition></RequireAuth>} />
            <Route path="leaderboard" element={<PageTransition><Leaderboard /></PageTransition>} />
            <Route path="notifications" element={<RequireAuth><PageTransition><NotificationsPage /></PageTransition></RequireAuth>} />
            <Route path="admin/*" element={<RequireAdmin><PageTransition><AdminDashboard /></PageTransition></RequireAdmin>} />
            <Route path="admin" element={<RequireAdmin><PageTransition><AdminDashboard /></PageTransition></RequireAdmin>} />
          </Route>
        </Routes>
      </AnimatePresence>
    </>
  )
}

export function CommunityApp() {
  return (
    <CommunityRoutes />
  )
}
