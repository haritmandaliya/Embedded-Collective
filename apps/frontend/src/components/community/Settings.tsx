import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { User as UserIcon, Shield, Bell, Eye, Upload, AlertTriangle } from 'lucide-react'
import { useCommunity } from '../../context/CommunityContext'
import { useTheme } from '../../context/ThemeContext'
import { useToast } from '../../context/ToastContext'

export function Settings() {
  const navigate = useNavigate()
  const { user, token, refreshUser } = useCommunity()
  const { setThemeMode } = useTheme()
  const { toast } = useToast()

  const [activeTab, setActiveTab] = useState<'profile' | 'account' | 'notifications' | 'appearance'>('profile')

  // PROFILE Tab State
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [githubUrl, setGithubUrl] = useState('')
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [usernameInput, setUsernameInput] = useState('')
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle')

  // NOTIFICATIONS Tab State
  const [emailAnswer, setEmailAnswer] = useState(true)
  const [emailAccepted, setEmailAccepted] = useState(true)
  const [emailDigest, setEmailDigest] = useState(false)
  const [pushEnabled, setPushEnabled] = useState(false)

  // System status
  const [saving, setSaving] = useState(false)
  const [education, setEducation] = useState('')
  const [higherEdu, setHigherEdu] = useState('')
  const [phone, setPhone] = useState('')
  const [upgrading, setUpgrading] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)

  // Redirect if not logged in
  useEffect(() => {
    if (!token) {
      toast.info('Please authenticate to view account settings.')
      navigate('/community')
    }
  }, [token, navigate, toast])

  // Populate state from user details
  useEffect(() => {
    if (user) {
      setDisplayName(user.display_name || '')
      setBio(user.bio || '')
      setGithubUrl(user.github_url || '')
      setLinkedinUrl(user.linkedin_url || '')
      setAvatarUrl(user.avatar_url || user.profile_pic_url || '')
      setUsernameInput(user.username || '')
      setEducation(user.education || '')
      setHigherEdu(user.higher_edu || '')
      setPhone(user.phone || '')
      
      // Prefs
      setEmailAnswer(user.email_answer ?? true)
      setEmailAccepted(user.email_accepted ?? true)
      setEmailDigest(user.email_digest ?? false)
      setPushEnabled(user.push_enabled ?? false)
    }
  }, [user])

  // Username availability check
  useEffect(() => {
    if (!user || usernameInput.trim() === user.username) {
      setUsernameStatus('idle')
      return
    }

    if (usernameInput.trim().length < 3) {
      setUsernameStatus('idle')
      return
    }

    setUsernameStatus('checking')
    const delayDebounce = setTimeout(() => {
      fetch(`/api/v1/users/check-username/${usernameInput}`)
        .then((res) => (res.ok ? res.json() : { available: false }))
        .then((data) => {
          setUsernameStatus(data.available ? 'available' : 'taken')
        })
        .catch(() => setUsernameStatus('idle'))
    }, 400)

    return () => clearTimeout(delayDebounce)
  }, [usernameInput, user])

  // Save PROFILE tab
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return
    setSaving(true)

    try {
      const res = await fetch('/api/v1/users/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          display_name: displayName,
          bio: bio,
          github_url: githubUrl,
          linkedin_url: linkedinUrl,
          avatar_url: avatarUrl,
          profile_pic_url: avatarUrl,
          education: education || undefined,
          higher_edu: higherEdu || undefined,
          phone: phone || undefined,
        }),
      })

      if (res.ok) {
        toast.success('Profile details updated successfully.')
        refreshUser()
      } else {
        const err = await res.json()
        toast.error(err.detail || 'Failed to update profile settings.')
      }
    } catch (err) {
      toast.error('Network error updating profile.')
    } finally {
      setSaving(false)
    }
  }

  // Save NOTIFICATIONS tab
  const handleSaveNotifications = async () => {
    if (!token) return
    setSaving(true)

    try {
      const res = await fetch('/api/v1/users/me/notification-prefs', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email_answer: emailAnswer,
          email_accepted: emailAccepted,
          email_digest: emailDigest,
          push_enabled: pushEnabled
        })
      })

      if (res.ok) {
        toast.success('Notification preferences updated.')
        refreshUser()
      } else {
        toast.error('Failed to save notification preferences.')
      }
    } catch (err) {
      toast.error('Network error updating notifications.')
    } finally {
      setSaving(false)
    }
  }

  // Handle Avatar File Upload
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !token) return

    setAvatarUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/v1/uploads/avatar', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })

      if (res.ok) {
        const data = await res.json()
        setAvatarUrl(data.url)
        toast.success('Avatar uploaded! Click Save Changes to save your profile.')
      } else {
        const err = await res.json()
        toast.error(err.detail || 'Failed to upload avatar.')
      }
    } catch (err) {
      toast.error('Error uploading file to mainframe server.')
    } finally {
      setAvatarUploading(false)
    }
  }

  // Render Toggle Switch Helper
  const renderToggle = (value: boolean, onChange: (v: boolean) => void) => {
    return (
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-300 focus:outline-none flex items-center ${
          value ? 'bg-red-core' : 'bg-[--glass-border]'
        }`}
      >
        <motion.div
          layout
          className="w-5 h-5 rounded-full bg-white shadow-md"
          animate={{ x: value ? 20 : 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </button>
    )
  }

  return (
    <div className="min-h-screen bg-[--bg-void] text-text-primary pt-24 pb-16 px-6 relative">
      <div className="max-w-4xl mx-auto z-10 relative">
        <h1 className="font-heading font-bold text-3xl uppercase tracking-wider mb-8 text-text-primary">
          SETTINGS
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Settings Navigation Sidebar */}
          <div className="flex flex-col gap-2">
            {[
              { id: 'profile', label: 'Profile', icon: UserIcon },
              { id: 'account', label: 'Account', icon: Shield },
              { id: 'notifications', label: 'Notifications', icon: Bell },
              { id: 'appearance', label: 'Appearance', icon: Eye },
            ].map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg font-mono text-xs text-left border transition-all duration-300 ${
                    activeTab === tab.id
                      ? 'bg-red-core/10 border-red-core text-white shadow-[0_0_12px_rgba(192,25,44,0.15)]'
                      : 'bg-transparent border-transparent text-text-secondary hover:text-text-primary hover:bg-[--bg-deep]/40'
                  }`}
                >
                  <Icon size={14} />
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* Settings Panel Content */}
          <div className="md:col-span-3 glass-card p-6 rounded-lg border border-[--glass-border] min-h-[400px]">
            
            {/* PROFILE TAB */}
            {activeTab === 'profile' && (
              <form onSubmit={handleSaveProfile} className="space-y-6">
                <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-[--glass-border]">
                  <div className="relative group cursor-pointer w-20 h-20">
                    <input
                      type="file"
                      id="avatar-input"
                      onChange={handleAvatarChange}
                      accept="image/*"
                      className="hidden"
                    />
                    <label htmlFor="avatar-input" className="cursor-pointer block w-full h-full">
                      {avatarUrl ? (
                        <img src={avatarUrl} className="w-20 h-20 rounded-full object-cover border border-[--glass-border]" alt="avatar" />
                      ) : (
                        <div className="w-20 h-20 rounded-full bg-[--red-core]/10 border border-[--glass-border] flex items-center justify-center text-[--red-core]">
                          <UserIcon size={32} />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <Upload size={18} className="text-white" />
                      </div>
                    </label>
                    {avatarUploading && (
                      <div className="absolute inset-0 bg-black/80 rounded-full flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-red-core border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                  <div className="text-center sm:text-left">
                    <h3 className="font-heading font-semibold text-sm text-text-primary">Avatar Image</h3>
                    <p className="font-mono text-[10px] text-text-secondary mt-1">PNG, JPG or WebP up to 10MB.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-mono text-[10px] uppercase text-text-secondary mb-2">Display Name</label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="w-full bg-[--bg-deep] border border-[--glass-border] rounded p-2 text-xs font-mono text-text-primary focus:outline-none focus:border-red-core/50"
                    />
                  </div>

                  <div>
                    <label className="block font-mono text-[10px] uppercase text-text-secondary mb-2">Username</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-mono text-xs text-text-secondary">@</span>
                      <input
                        type="text"
                        value={usernameInput}
                        onChange={(e) => setUsernameInput(e.target.value)}
                        placeholder="username"
                        className="w-full bg-[--bg-deep] border border-[--glass-border] rounded py-2 pl-6 pr-16 text-xs font-mono text-text-primary focus:outline-none focus:border-red-core/50"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[9px]">
                        {usernameStatus === 'checking' && <span className="text-text-secondary">checking...</span>}
                        {usernameStatus === 'available' && <span className="text-green-500 font-bold">✓ available</span>}
                        {usernameStatus === 'taken' && <span className="text-red-500 font-bold">✗ taken</span>}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="font-mono text-[10px] uppercase text-text-secondary">Bio</label>
                    <span className="font-mono text-[9px] text-text-secondary">{bio.length}/500</span>
                  </div>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value.slice(0, 500))}
                    placeholder="Tell the community about your engineering experience, focus areas..."
                    rows={4}
                    className="w-full bg-[--bg-deep] border border-[--glass-border] rounded p-2 text-xs font-mono text-text-primary focus:outline-none focus:border-red-core/50 resize-none"
                  />
                </div>

                {(user?.role === 'contributor' || user?.role === 'admin' || user?.role === 'super_admin') && (
                  <>
                    <div>
                      <label className="block font-mono text-[10px] uppercase text-text-secondary mb-2">Education</label>
                      <input
                        type="text"
                        value={education}
                        onChange={(e) => setEducation(e.target.value)}
                        placeholder="B.E. Computer Engineering"
                        className="w-full bg-[--bg-deep] border border-[--glass-border] rounded p-2 text-xs font-mono text-text-primary focus:outline-none focus:border-red-core/50"
                      />
                    </div>
                    <div>
                      <label className="block font-mono text-[10px] uppercase text-text-secondary mb-2">Higher Education</label>
                      <input
                        type="text"
                        value={higherEdu}
                        onChange={(e) => setHigherEdu(e.target.value)}
                        placeholder="Vector India — Embedded Systems Training"
                        className="w-full bg-[--bg-deep] border border-[--glass-border] rounded p-2 text-xs font-mono text-text-primary focus:outline-none focus:border-red-core/50"
                      />
                    </div>
                    <div>
                      <label className="block font-mono text-[10px] uppercase text-text-secondary mb-2">Mobile Number</label>
                      <div className="flex gap-2">
                        <span className="font-mono text-xs text-text-secondary px-3 py-2 border border-[--glass-border] rounded bg-[--bg-deep]">+91</span>
                        <input
                          type="tel"
                          value={phone.replace(/^\+91/, '')}
                          onChange={(e) => setPhone(`+91${e.target.value.replace(/\D/g, '')}`)}
                          className="flex-1 bg-[--bg-deep] border border-[--glass-border] rounded p-2 text-xs font-mono text-text-primary focus:outline-none focus:border-red-core/50"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-mono text-[10px] uppercase text-text-secondary mb-2">GitHub Profile URL</label>
                    <input
                      type="url"
                      value={githubUrl}
                      onChange={(e) => setGithubUrl(e.target.value)}
                      placeholder="https://github.com/username"
                      className="w-full bg-[--bg-deep] border border-[--glass-border] rounded p-2 text-xs font-mono text-text-primary focus:outline-none focus:border-red-core/50"
                    />
                  </div>

                  <div>
                    <label className="block font-mono text-[10px] uppercase text-text-secondary mb-2">LinkedIn Profile URL</label>
                    <input
                      type="url"
                      value={linkedinUrl}
                      onChange={(e) => setLinkedinUrl(e.target.value)}
                      placeholder="https://linkedin.com/in/username"
                      className="w-full bg-[--bg-deep] border border-[--glass-border] rounded p-2 text-xs font-mono text-text-primary focus:outline-none focus:border-red-core/50"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={saving || usernameStatus === 'taken'}
                    className="font-mono text-xs bg-red-core text-white px-6 py-2.5 rounded hover:bg-red-glow disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                  >
                    {saving ? 'SAVING CHANGES...' : 'SAVE CHANGES'}
                  </button>
                </div>
              </form>
            )}

            {/* ACCOUNT TAB */}
            {activeTab === 'account' && (
              <div className="space-y-8">
                <div>
                  <h3 className="font-heading font-semibold text-sm text-text-primary mb-4 pb-2 border-b border-[--glass-border]">
                    Connected Auth Methods
                  </h3>
                  <div className="space-y-3">
                    {[
                      { name: 'Google Single Sign-On', connected: true, desc: 'Used for automatic passwordless connection' },
                      { name: 'Email OTP (Verify Code)', connected: true, desc: 'Used for direct login via verification codes' },
                      { name: 'Phone SMS OTP', connected: false, desc: 'Deliver codes straight to your phone' }
                    ].map((method) => (
                      <div key={method.name} className="flex justify-between items-center bg-[--bg-deep]/40 p-4 rounded border border-[--glass-border]">
                        <div>
                          <span className="font-heading font-bold text-xs text-text-primary">{method.name}</span>
                          <p className="font-mono text-[9px] text-text-secondary mt-0.5">{method.desc}</p>
                        </div>
                        {method.connected ? (
                          <span className="font-mono text-[9px] text-green-500 font-bold bg-green-500/10 px-2 py-1 rounded border border-green-500/20">
                            ✓ Connected
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="font-mono text-[9px] text-red-core hover:text-red-glow border border-red-core/30 hover:border-red-core px-3 py-1 rounded transition-colors"
                          >
                            + Add Method
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {user?.role === 'solution_seeker' && (
                  <div className="p-4 rounded border border-[--cyan-spark]/20 bg-[--cyan-spark]/5">
                    <h4 className="font-heading font-bold text-xs text-[--cyan-spark] mb-2">Upgrade to Contributor</h4>
                    <p className="font-mono text-[10px] text-text-secondary mb-4">
                      Upgrading lets you post solutions and access full profile fields including education and resume.
                    </p>
                    <button
                      type="button"
                      disabled={upgrading}
                      onClick={async () => {
                        setUpgrading(true)
                        try {
                          const res = await fetch('/api/v1/users/me/role', {
                            method: 'PATCH',
                            headers: {
                              'Content-Type': 'application/json',
                              Authorization: `Bearer ${token}`,
                            },
                            body: JSON.stringify({ role: 'contributor' }),
                          })
                          if (res.ok) {
                            toast.success('Upgraded to Contributor!')
                            refreshUser()
                          } else {
                            toast.error('Upgrade failed.')
                          }
                        } catch {
                          toast.error('Network error.')
                        } finally {
                          setUpgrading(false)
                        }
                      }}
                      className="font-mono text-[10px] bg-[--cyan-spark]/20 text-[--cyan-spark] border border-[--cyan-spark]/40 px-4 py-2 rounded hover:bg-[--cyan-spark]/30 transition-colors"
                    >
                      {upgrading ? 'Upgrading…' : 'Confirm Upgrade'}
                    </button>
                  </div>
                )}

                <div className="p-4 rounded border border-red-500/20 bg-red-500/5">
                  <h4 className="font-heading font-bold text-xs text-red-glow mb-2 flex items-center gap-2">
                    <AlertTriangle size={14} /> DANGER ZONE
                  </h4>
                  <p className="font-body text-[11px] text-text-secondary mb-4 leading-relaxed">
                    Once you delete your account, there is no going back. All of your questions, answers, and reputation scores will be permanently purged.
                  </p>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!window.confirm('Are you absolutely sure you want to permanently delete your account? This action is irreversible.')) return
                      if (!window.confirm('FINAL WARNING: All your questions, answers, and reputation will be permanently destroyed. Proceed?')) return
                      try {
                        const res = await fetch('/api/v1/users/me', {
                          method: 'DELETE',
                          headers: { Authorization: `Bearer ${token}` },
                        })
                        if (res.ok) {
                          toast.success('Account deleted successfully. Goodbye.')
                          localStorage.removeItem('ec_token')
                          localStorage.removeItem('ec_user')
                          window.location.href = '/community'
                        } else {
                          const err = await res.json()
                          toast.error(err.detail || 'Failed to delete account.')
                        }
                      } catch {
                        toast.error('Network error. Could not delete account.')
                      }
                    }}
                    className="font-mono text-[10px] bg-transparent border border-red-core text-red-core hover:bg-red-core hover:text-white px-4 py-2 rounded transition-all duration-300"
                  >
                    DELETE ACCOUNT
                  </button>
                </div>
              </div>
            )}

            {/* NOTIFICATIONS TAB */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-heading font-semibold text-sm text-text-primary mb-4 pb-2 border-b border-[--glass-border]">
                    Email Notification Settings
                  </h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-mono text-xs text-text-primary">Someone answers my question</span>
                        <p className="font-mono text-[9px] text-text-secondary mt-0.5">Receive immediate alert when help is provided</p>
                      </div>
                      {renderToggle(emailAnswer, setEmailAnswer)}
                    </div>

                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-mono text-xs text-text-primary">My answer is accepted as solution</span>
                        <p className="font-mono text-[9px] text-text-secondary mt-0.5">Alert when your technical trace resolves the issue</p>
                      </div>
                      {renderToggle(emailAccepted, setEmailAccepted)}
                    </div>

                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-mono text-xs text-text-primary">Weekly community digest</span>
                        <p className="font-mono text-[9px] text-text-secondary mt-0.5">Get a summary of trending hardware questions</p>
                      </div>
                      {renderToggle(emailDigest, setEmailDigest)}
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-[--glass-border]">
                  <h3 className="font-heading font-semibold text-sm text-text-primary mb-4 pb-2 border-b border-[--glass-border]">
                    Browser Notifications
                  </h3>
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-mono text-xs text-text-primary">Push notifications</span>
                      <p className="font-mono text-[9px] text-text-secondary mt-0.5">Enable immediate desktop ping popups</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {!pushEnabled && (
                        <button
                          type="button"
                          onClick={() => {
                            Notification.requestPermission().then((perm) => {
                              if (perm === 'granted') {
                                setPushEnabled(true)
                                toast.success('Browser notification permission granted!')
                              } else {
                                toast.error('Permission denied by browser configuration.')
                              }
                            })
                          }}
                          className="font-mono text-[9px] text-cyan-spark border border-cyan-spark/40 hover:border-cyan-spark px-2.5 py-1 rounded transition-colors"
                        >
                          Request Permission
                        </button>
                      )}
                      {renderToggle(pushEnabled, setPushEnabled)}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    type="button"
                    onClick={handleSaveNotifications}
                    disabled={saving}
                    className="font-mono text-xs bg-red-core text-white px-6 py-2.5 rounded hover:bg-red-glow disabled:opacity-50 transition-all duration-300"
                  >
                    {saving ? 'SAVING PREFERENCES...' : 'SAVE PREFERENCES'}
                  </button>
                </div>
              </div>
            )}

            {/* APPEARANCE TAB */}
            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-heading font-semibold text-sm text-text-primary mb-4 pb-2 border-b border-[--glass-border]">
                    Select UI Theme Mode
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                      { id: 'dark', label: 'Dark Mode', desc: 'Sleek terminal dark vibes' },
                      { id: 'light', label: 'Light Mode', desc: 'Vibrant daytime readability' },
                      { id: 'system', label: 'System Theme', desc: 'Synchronize to local device settings' }
                    ].map((t) => {
                      const isSelected = localStorage.getItem('theme-mode') === t.id || (t.id === 'system' && !localStorage.getItem('theme-mode'))
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            setThemeMode(t.id as any)
                            toast.success(`Theme mode updated to ${t.label}.`)
                          }}
                          className={`glass-card p-4 rounded-lg border text-left flex flex-col justify-between h-24 hover:border-red-core/40 transition-all duration-300 ${
                            isSelected ? 'border-red-core ring-1 ring-red-core/30' : 'border-[--glass-border]'
                          }`}
                        >
                          <span className="font-heading font-bold text-xs text-text-primary">{t.label}</span>
                          <p className="font-mono text-[9px] text-text-secondary mt-1">{t.desc}</p>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
