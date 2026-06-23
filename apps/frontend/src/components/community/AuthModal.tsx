import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Mail, Phone, User as UserIcon, AlertCircle, CheckCircle2, Search, Wrench } from 'lucide-react'
import { useCommunity } from '../../context/CommunityContext'
import { useToast } from '../../context/ToastContext'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  initialTab?: 'signin' | 'signup'
}

type Tab = 'signin' | 'signup'
type Role = 'solution_seeker' | 'contributor'

const OTP_LENGTH = 6
const RESEND_SECONDS = 60

interface AuthConfig {
  google_client_id: string
  google_enabled: boolean
  email_otp_enabled: boolean
  environment: string
}

const inputClass =
  'w-full bg-black/60 border border-glass-border focus:border-[--red-core] focus:ring-1 focus:ring-[--red-core]/50 rounded px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/40 outline-none transition-all'

function isEmail(value: string) {
  return value.includes('@')
}

function normalizePhone(digits: string) {
  const clean = digits.replace(/\D/g, '')
  return clean ? `+91${clean}` : ''
}

interface OtpInputProps {
  value: string[]
  onChange: (digits: string[]) => void
  disabled?: boolean
}

function OtpInput({ value, onChange, disabled }: OtpInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([])

  const setDigit = (index: number, digit: string) => {
    const next = [...value]
    next[index] = digit
    onChange(next)
  }

  const handleChange = (index: number, raw: string) => {
    const digit = raw.replace(/\D/g, '').slice(-1)
    setDigit(index, digit)
    if (digit && index < OTP_LENGTH - 1) {
      refs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !value[index] && index > 0) {
      refs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH)
    if (!pasted) return
    const next = Array.from({ length: OTP_LENGTH }, (_, i) => pasted[i] || '')
    onChange(next)
    const focusIdx = Math.min(pasted.length, OTP_LENGTH - 1)
    refs.current[focusIdx]?.focus()
  }

  return (
    <div className="flex gap-2 justify-center">
      {Array.from({ length: OTP_LENGTH }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          disabled={disabled}
          value={value[i] || ''}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          className="w-10 h-12 text-center text-lg font-mono bg-black/60 border border-glass-border focus:border-[--red-core] focus:ring-1 focus:ring-[--red-core]/50 rounded outline-none transition-all text-text-primary"
        />
      ))}
    </div>
  )
}

function OrDivider() {
  return (
    <div className="relative my-5 text-center">
      <div className="absolute inset-x-0 top-1/2 h-px bg-glass-border -translate-y-1/2" />
      <span className="relative bg-[--bg-void] px-3 font-mono text-[9px] text-text-secondary uppercase tracking-wider">
        OR
      </span>
    </div>
  )
}

export function AuthModal({ isOpen, onClose, initialTab = 'signin' }: AuthModalProps) {
  const { login } = useCommunity()
  const { toast } = useToast()

  const [tab, setTab] = useState<Tab>(initialTab)
  const [signupStep, setSignupStep] = useState(1)

  const [signInContact, setSignInContact] = useState('')
  const [signInOtpSent, setSignInOtpSent] = useState(false)
  const [signInOtp, setSignInOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''))
  const [signInCountdown, setSignInCountdown] = useState(0)

  const [email, setEmail] = useState('')
  const [phoneDigits, setPhoneDigits] = useState('')
  const [role, setRole] = useState<Role>('solution_seeker')
  const [googleSignup, setGoogleSignup] = useState(false)
  const [googleId, setGoogleId] = useState<string | null>(null)
  const [googleAvatar, setGoogleAvatar] = useState<string | null>(null)

  const [emailOtp, setEmailOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''))
  const [phoneOtp, setPhoneOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''))
  const [emailVerified, setEmailVerified] = useState(false)
  const [phoneVerified, setPhoneVerified] = useState(false)

  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle')
  const [education, setEducation] = useState('')
  const [higherEdu, setHigherEdu] = useState('')
  const [bio, setBio] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [authConfig, setAuthConfig] = useState<AuthConfig | null>(null)
  const [emailValid, setEmailValid] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle')
  const [emailError, setEmailError] = useState<string | null>(null)
  const googleModeRef = useRef<'signin' | 'signup'>('signin')
  const googleSignInRef = useRef<HTMLDivElement>(null)
  const googleSignUpRef = useRef<HTMLDivElement>(null)
  const googleInitializedRef = useRef(false)
  const tabRef = useRef(tab)
  tabRef.current = tab

  const redirectToLocalhost = (e: React.MouseEvent) => {
    e.preventDefault()
    const currentPath = window.location.pathname + window.location.search + window.location.hash
    window.location.href = `http://localhost:5173${currentPath}`
  }

  const phone = normalizePhone(phoneDigits)
  const googleClientId =
    authConfig?.google_client_id ||
    (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) ||
    ''

  const resetState = useCallback(() => {
    setTab(initialTab)
    setSignupStep(1)
    setSignInContact('')
    setSignInOtpSent(false)
    setSignInOtp(Array(OTP_LENGTH).fill(''))
    setSignInCountdown(0)
    setEmail('')
    setPhoneDigits('')
    setRole('solution_seeker')
    setGoogleSignup(false)
    setGoogleId(null)
    setGoogleAvatar(null)
    setEmailOtp(Array(OTP_LENGTH).fill(''))
    setPhoneOtp(Array(OTP_LENGTH).fill(''))
    setEmailVerified(false)
    setPhoneVerified(false)
    setDisplayName('')
    setUsername('')
    setUsernameStatus('idle')
    setEducation('')
    setHigherEdu('')
    setBio('')
    setLoading(false)
    setError(null)
    setAuthConfig(null)
    setEmailValid('idle')
    setEmailError(null)
    googleInitializedRef.current = false
  }, [initialTab])

  useEffect(() => {
    if (!isOpen) return
    fetch('/api/v1/auth/config')
      .then((r) => (r.ok ? r.json() : null))
      .then((cfg) => cfg && setAuthConfig(cfg))
      .catch(() => {})
  }, [isOpen])

  useEffect(() => {
    const clean = email.trim()
    if (!clean || !clean.includes('@') || googleSignup) {
      setEmailValid('idle')
      setEmailError(null)
      return
    }
    setEmailValid('checking')
    const timer = setTimeout(() => {
      fetch('/api/v1/auth/validate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: clean, strict: false }),
      })
        .then(async (res) => {
          if (res.ok) {
            setEmailValid('valid')
            setEmailError(null)
          } else {
            const data = await res.json()
            setEmailValid('invalid')
            setEmailError(data.detail || 'Invalid email')
          }
        })
        .catch(() => setEmailValid('idle'))
    }, 500)
    return () => clearTimeout(timer)
  }, [email, googleSignup])

  useEffect(() => {
    if (isOpen) {
      setTab(initialTab)
      setError(null)
    } else {
      resetState()
    }
  }, [isOpen, initialTab, resetState])

  useEffect(() => {
    if (signInCountdown <= 0) return
    const timer = setInterval(() => setSignInCountdown((c) => c - 1), 1000)
    return () => clearInterval(timer)
  }, [signInCountdown])

  useEffect(() => {
    const clean = username.trim().replace(/^@+/, '')
    if (clean.length < 3) {
      setUsernameStatus('idle')
      return
    }
    setUsernameStatus('checking')
    const timer = setTimeout(() => {
      fetch(`/api/v1/auth/check-username/${encodeURIComponent(clean)}`)
        .then((res) => (res.ok ? res.json() : { available: false }))
        .then((data) => setUsernameStatus(data.available ? 'available' : 'taken'))
        .catch(() => setUsernameStatus('idle'))
    }, 400)
    return () => clearTimeout(timer)
  }, [username])

  const handleSuccess = async (accessToken: string) => {
    await login(accessToken)
    toast.success('Welcome to Embedded Collective! 🎉')
    onClose()
  }

  const processGoogleCredential = useCallback(
    async (credential: string, mode: 'signin' | 'signup') => {
      setError(null)
      setLoading(true)
      try {
        const resp = await fetch('/api/v1/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id_token: credential, mode }),
        })
        const data = await resp.json()

        if (mode === 'signin') {
          if (!resp.ok || !data.access_token) {
            throw new Error(
              typeof data.detail === 'string' ? data.detail : 'Google sign-in failed'
            )
          }
          await handleSuccess(data.access_token)
          return
        }

        if (!resp.ok || !data.needs_registration) {
          throw new Error(
            typeof data.detail === 'string' ? data.detail : 'Google account verification failed'
          )
        }

        const profile = data.profile
        setGoogleSignup(true)
        setGoogleId(credential)
        setGoogleAvatar(profile.picture || null)
        setEmail(profile.email || '')
        setDisplayName(profile.name || '')
        setEmailVerified(true)
        setEmailValid('valid')
        setSignupStep(1)
        setTab('signup')
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Google authentication failed')
      } finally {
        setLoading(false)
      }
    },
    [login, onClose, toast]
  )

  useEffect(() => {
    if (!isOpen || !googleClientId) return

    const initGoogle = () => {
      if (!window.google?.accounts?.id) return false
      if (!googleInitializedRef.current) {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: (response) => {
            if (response.credential) {
              const mode = tabRef.current === 'signup' ? 'signup' : 'signin'
              processGoogleCredential(response.credential, mode)
            }
          },
        })
        googleInitializedRef.current = true
      }
      return true
    }

    const renderButtons = () => {
      if (!initGoogle()) return
      googleModeRef.current = 'signin'
      if (googleSignInRef.current) {
        googleSignInRef.current.innerHTML = ''
        window.google!.accounts.id.renderButton(googleSignInRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          shape: 'rectangular',
          width: 320,
        })
      }
      googleModeRef.current = 'signup'
      if (googleSignUpRef.current) {
        googleSignUpRef.current.innerHTML = ''
        window.google!.accounts.id.renderButton(googleSignUpRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'signup_with',
          shape: 'rectangular',
          width: 320,
        })
      }
    }

    if (initGoogle()) {
      renderButtons()
    } else {
      const timer = setInterval(() => {
        if (initGoogle()) {
          renderButtons()
          clearInterval(timer)
        }
      }, 200)
      return () => clearInterval(timer)
    }
  }, [isOpen, googleClientId, tab, signupStep, processGoogleCredential])

  /*
  const handleDevLogin = async (devUsername: string, devPassword: string) => {
    setError(null)
    setLoading(true)
    try {
      const formData = new URLSearchParams()
      formData.append('username', devUsername)
      formData.append('password', devPassword)
      const resp = await fetch('/api/v1/auth/login', { method: 'POST', body: formData })
      const data = await resp.json()
      if (!resp.ok || !data.access_token) {
        throw new Error(data.detail || 'Login failed')
      }
      await handleSuccess(data.access_token)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }
  */

  const handleSendSignInOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!signInContact.trim()) {
      setError('Please enter your email or phone number.')
      return
    }
    setLoading(true)
    try {
      if (isEmail(signInContact)) {
        const v = await fetch('/api/v1/auth/validate-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: signInContact.trim(), strict: false }),
        })
        if (!v.ok) {
          const d = await v.json()
          throw new Error(d.detail || 'Invalid email address')
        }
      }
      const body = isEmail(signInContact)
        ? { email: signInContact.trim(), mode: 'signin' }
        : { phone: signInContact.trim().startsWith('+') ? signInContact.trim() : normalizePhone(signInContact), mode: 'signin' }
      const resp = await fetch('/api/v1/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.detail || 'Failed to send OTP')
      setSignInOtpSent(true)
      setSignInOtp(Array(OTP_LENGTH).fill(''))
      setSignInCountdown(RESEND_SECONDS)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send OTP')
    } finally {
      setLoading(false)
    }
  }

  const handleResendSignInOtp = async () => {
    if (signInCountdown > 0) return
    setError(null)
    setLoading(true)
    try {
      const body = isEmail(signInContact)
        ? { email: signInContact.trim(), mode: 'signin' }
        : { phone: signInContact.trim().startsWith('+') ? signInContact.trim() : normalizePhone(signInContact), mode: 'signin' }
      const resp = await fetch('/api/v1/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.detail || 'Failed to resend OTP')
      setSignInCountdown(RESEND_SECONDS)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to resend OTP')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifySignInOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const code = signInOtp.join('')
    if (code.length !== OTP_LENGTH) {
      setError('Please enter the full 6-digit code.')
      return
    }
    setLoading(true)
    try {
      const body = isEmail(signInContact)
        ? { email: signInContact.trim(), code }
        : {
            phone: signInContact.trim().startsWith('+') ? signInContact.trim() : normalizePhone(signInContact),
            code,
          }
      const resp = await fetch('/api/v1/auth/otp/verify-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await resp.json()
      if (!resp.ok || !data.access_token) {
        throw new Error(data.detail || 'Invalid or expired OTP')
      }
      await handleSuccess(data.access_token)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  const handleSignupStep1Next = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!email.trim()) {
      setError('Email is required.')
      return
    }
    if (!googleSignup && emailValid === 'invalid') {
      setError(emailError || 'Please enter a valid email address.')
      return
    }
    setLoading(true)
    try {
      if (!googleSignup) {
        await fetch('/api/v1/auth/otp/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), mode: 'signup' }),
        }).then(async (r) => {
          const d = await r.json()
          if (!r.ok) throw new Error(d.detail || 'Failed to send email OTP')
          toast.success(
            authConfig?.environment === 'development'
              ? 'OTP sent! Check email, terminal logs, or .run/email_previews/'
              : 'Verification code sent to your email'
          )
        })
      }

      const hasPhone = !!phoneDigits.trim()
      if (hasPhone) {
        await fetch('/api/v1/auth/otp/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, mode: 'signup' }),
        }).then(async (r) => {
          const d = await r.json()
          if (!r.ok) throw new Error(d.detail || 'Failed to send phone OTP')
        })
      }

      setEmailOtp(Array(OTP_LENGTH).fill(''))
      setPhoneOtp(Array(OTP_LENGTH).fill(''))
      if (!googleSignup) setEmailVerified(false)
      setPhoneVerified(hasPhone ? false : true)
      setSignupStep(2)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send verification codes')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifySignupOtps = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const emailCode = emailOtp.join('')
    const phoneCode = phoneOtp.join('')
    const hasPhone = !!phoneDigits.trim()

    if (!googleSignup && emailCode.length !== OTP_LENGTH) {
      setError('Please enter the 6-digit email verification code.')
      return
    }
    if (hasPhone && phoneCode.length !== OTP_LENGTH) {
      setError(googleSignup ? 'Please enter the 6-digit SMS code.' : 'Please enter both 6-digit codes.')
      return
    }
    setLoading(true)
    try {
      if (!googleSignup) {
        const emailResp = await fetch('/api/v1/auth/otp/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), code: emailCode }),
        })
        const emailData = await emailResp.json()
        if (!emailResp.ok || !emailData.verified) {
          throw new Error(emailData.detail || 'Invalid email OTP')
        }
        setEmailVerified(true)
      }

      if (hasPhone) {
        const phoneResp = await fetch('/api/v1/auth/otp/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, code: phoneCode }),
        })
        const phoneData = await phoneResp.json()
        if (!phoneResp.ok || !phoneData.verified) {
          throw new Error(phoneData.detail || 'Invalid phone OTP')
        }
        setPhoneVerified(true)
      } else {
        setPhoneVerified(true)
      }
      setSignupStep(3)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'OTP verification failed')
    } finally {
      setLoading(false)
    }
  }

  const handleCompleteSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const cleanUsername = username.trim().replace(/^@+/, '').toLowerCase()
    if (!displayName.trim()) {
      setError('Display name is required.')
      return
    }
    if (cleanUsername.length < 3) {
      setError('Username must be at least 3 characters.')
      return
    }
    if (usernameStatus === 'taken') {
      setError('Username is already taken.')
      return
    }
    if (role === 'contributor' && !education.trim()) {
      setError('Education is required for Contributors.')
      return
    }
      setLoading(true)
      try {
        const payload: Record<string, any> = {
          email: email.trim(),
          phone: phoneDigits.trim() ? phone : null,
          role,
          display_name: displayName.trim(),
          username: cleanUsername,
        }
      if (role === 'contributor') {
        payload.education = education.trim()
        if (higherEdu.trim()) payload.higher_edu = higherEdu.trim()
        if (bio.trim()) payload.bio = bio.trim()
      }
      if (googleSignup && googleId) {
        payload.google_id = googleId
        if (googleAvatar) payload.google_avatar = googleAvatar
      }

      const resp = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await resp.json()
      if (!resp.ok) {
        throw new Error(data.detail || 'Registration failed')
      }
      if (data.access_token) {
        await handleSuccess(data.access_token)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const switchTab = (next: Tab) => {
    setTab(next)
    setError(null)
    setSignupStep(1)
    setSignInOtpSent(false)
    setSignInOtp(Array(OTP_LENGTH).fill(''))
  }

  const formatCountdown = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="auth-modal-overlay px-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="auth-modal relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-2">
                <span className="text-[var(--accent-red)] font-mono text-sm">⬡</span>
                <h2 className="font-[family-name:var(--font-display)] font-medium text-xs text-text-primary tracking-[0.15em] uppercase">
                  Embedded Collective
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-text-secondary hover:text-[--red-core] transition-colors"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <div className="relative flex border-b border-[var(--border-subtle)]">
              <button
                type="button"
                onClick={() => switchTab('signin')}
                className={`flex-1 py-3 text-xs font-mono uppercase tracking-wider transition-colors ${
                  tab === 'signin' ? 'text-[var(--accent-red)]' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => switchTab('signup')}
                className={`flex-1 py-3 text-xs font-mono uppercase tracking-wider transition-colors ${
                  tab === 'signup' ? 'text-[var(--accent-red)]' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Sign Up
              </button>
              <span
                className="auth-tab-slider"
                style={{
                  left: tab === 'signin' ? '0%' : '50%',
                  width: '50%',
                }}
              />
            </div>

            <div className="p-6">
              {error && (
                <div className="flex items-start gap-2 p-3 rounded bg-[--red-core]/10 border border-[--red-core]/30 text-[--red-core] text-xs mb-4">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {tab === 'signin' && (
                <div className="space-y-1">
                  <p className="font-body text-sm text-text-secondary mb-4">Welcome back, engineer.</p>

                  {googleClientId ? (
                    <div className="space-y-2">
                      <div ref={googleSignInRef} className="flex justify-center min-h-[44px]" />
                      <p className="font-mono text-[9px] text-text-secondary/60 text-center leading-relaxed">
                        Got "origin_mismatch" error? Try using <a href="#" onClick={redirectToLocalhost} className="text-cyan-spark hover:underline font-bold">http://localhost:5173</a> instead of IP, or whitelist it in Google Console.
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 font-mono text-[10px] text-amber-300 leading-relaxed">
                      Google sign-in: add <code className="text-white">GOOGLE_CLIENT_ID=your-id.apps.googleusercontent.com</code> to{' '}
                      <code className="text-white">backend/.env</code> and restart <code className="text-white">./run.sh</code>
                    </div>
                  )}

                  <OrDivider />

                  {!signInOtpSent ? (
                    <form onSubmit={handleSendSignInOtp} className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-mono text-text-secondary uppercase tracking-wider mb-1">
                          Email or Phone
                        </label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-text-secondary">
                            <Mail size={14} />
                          </span>
                          <input
                            type="text"
                            value={signInContact}
                            onChange={(e) => setSignInContact(e.target.value)}
                            placeholder="e.g. engineer@example.com or +91 9876543210"
                            className={`${inputClass} pl-9`}
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2.5 bg-[--red-core] hover:opacity-90 text-white text-xs font-mono uppercase tracking-widest rounded transition-all disabled:opacity-50"
                      >
                        {loading ? 'Sending...' : 'Send OTP'}
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleVerifySignInOtp} className="space-y-4">
                      <p className="font-mono text-[10px] text-text-secondary text-center uppercase tracking-wider">
                        Enter the 6-digit code sent to {signInContact}
                      </p>
                      <OtpInput value={signInOtp} onChange={setSignInOtp} disabled={loading} />
                      <p className="text-center font-mono text-[10px] text-text-secondary">
                        {signInCountdown > 0 ? (
                          <>Resend in {formatCountdown(signInCountdown)}</>
                        ) : (
                          <button
                            type="button"
                            onClick={handleResendSignInOtp}
                            disabled={loading}
                            className="text-[--cyan-spark] hover:underline"
                          >
                            Resend OTP
                          </button>
                        )}
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSignInOtpSent(false)
                            setSignInOtp(Array(OTP_LENGTH).fill(''))
                            setSignInCountdown(0)
                          }}
                          className="flex-1 py-2 border border-glass-border text-text-secondary hover:text-text-primary text-xs font-mono uppercase rounded transition-all"
                        >
                          Back
                        </button>
                        <button
                          type="submit"
                          disabled={loading}
                          className="flex-[2] py-2 bg-[--red-core] hover:opacity-90 text-white text-xs font-mono uppercase tracking-wider rounded transition-all disabled:opacity-50"
                        >
                          {loading ? 'Verifying...' : 'Verify & Sign In'}
                        </button>
                      </div>
                    </form>
                  )}


                </div>
              )}

              {tab === 'signup' && signupStep === 1 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="font-heading font-bold text-sm text-text-primary">Create your account</p>
                    <span className="font-mono text-[9px] text-text-secondary uppercase">Step 1 of 3</span>
                  </div>

                  {googleClientId ? (
                    <div className="space-y-2">
                      <div ref={googleSignUpRef} className="flex justify-center min-h-[44px]" />
                      <p className="font-mono text-[9px] text-text-secondary/60 text-center leading-relaxed">
                        Got "origin_mismatch" error? Try using <a href="#" onClick={redirectToLocalhost} className="text-cyan-spark hover:underline font-bold">http://localhost:5173</a> instead of IP, or whitelist it in Google Console.
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 font-mono text-[10px] text-amber-300 leading-relaxed">
                      Google sign-up: add <code className="text-white">GOOGLE_CLIENT_ID</code> to <code className="text-white">backend/.env</code> and restart the server.
                    </div>
                  )}

                  <OrDivider />

                  <form onSubmit={handleSignupStep1Next} className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-mono text-text-secondary uppercase tracking-wider mb-1">
                        Email *
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-text-secondary">
                          <Mail size={14} />
                        </span>
                        <input
                          type="email"
                          required
                          readOnly={googleSignup}
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="e.g. engineer@example.com"
                          className={`${inputClass} pl-9 ${googleSignup ? 'opacity-70 cursor-not-allowed' : ''}`}
                        />
                      </div>
                      {!googleSignup && email.trim() && (
                        <p
                          className={`mt-1 font-mono text-[10px] flex items-center gap-1 ${
                            emailValid === 'valid'
                              ? 'text-green-400'
                              : emailValid === 'invalid'
                              ? 'text-[--red-core]'
                              : 'text-text-secondary'
                          }`}
                        >
                          {emailValid === 'checking' && 'Checking email…'}
                          {emailValid === 'valid' && (
                            <>
                              <CheckCircle2 size={11} /> Valid email
                            </>
                          )}
                          {emailValid === 'invalid' && (emailError || 'Invalid email')}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono text-text-secondary uppercase tracking-wider mb-1">
                        Phone (Optional)
                      </label>
                      <div className="flex gap-2">
                        <span className="flex items-center px-3 bg-black/60 border border-glass-border rounded font-mono text-xs text-text-secondary shrink-0">
                          +91
                        </span>
                        <div className="relative flex-1">
                          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-text-secondary">
                            <Phone size={14} />
                          </span>
                          <input
                            type="tel"
                            value={phoneDigits}
                            onChange={(e) => setPhoneDigits(e.target.value.replace(/\D/g, '').slice(0, 10))}
                            placeholder="e.g. 9876543210"
                            className={`${inputClass} pl-9`}
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono text-text-secondary uppercase tracking-wider mb-2">
                        I want to join as:
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setRole('solution_seeker')}
                          className={`p-3 rounded border text-left transition-all ${
                            role === 'solution_seeker'
                              ? 'border-[--red-core] bg-[--red-core]/5 shadow-[0_0_12px_rgba(192,25,44,0.15)]'
                              : 'border-glass-border hover:border-[--red-core]/40'
                          }`}
                        >
                          <Search size={16} className="text-[--red-core] mb-2" />
                          <p className="font-heading font-bold text-xs text-text-primary">Solution Seeker</p>
                          <p className="font-mono text-[9px] text-text-secondary mt-1 leading-relaxed">
                            I have embedded problems to solve
                          </p>
                        </button>
                        <button
                          type="button"
                          onClick={() => setRole('contributor')}
                          className={`p-3 rounded border text-left transition-all ${
                            role === 'contributor'
                              ? 'border-[--red-core] bg-[--red-core]/5 shadow-[0_0_12px_rgba(192,25,44,0.15)]'
                              : 'border-glass-border hover:border-[--red-core]/40'
                          }`}
                        >
                          <Wrench size={16} className="text-[--cyan-spark] mb-2" />
                          <p className="font-heading font-bold text-xs text-text-primary">Contributor</p>
                          <p className="font-mono text-[9px] text-text-secondary mt-1 leading-relaxed">
                            I can help others + share my expertise
                          </p>
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-2.5 bg-[--red-core] hover:opacity-90 text-white text-xs font-mono uppercase tracking-widest rounded transition-all mt-2 disabled:opacity-50"
                    >
                      {loading ? 'Sending codes...' : 'Next →'}
                    </button>
                  </form>
                </div>
              )}

              {tab === 'signup' && signupStep === 2 && (
                <form onSubmit={handleVerifySignupOtps} className="space-y-5">
                  <div className="flex items-center justify-between">
                    <p className="font-heading font-bold text-sm text-text-primary">Verify Identity</p>
                    <span className="font-mono text-[9px] text-text-secondary uppercase">Step 2 of 3</span>
                  </div>

                  <p className="font-mono text-[10px] text-text-secondary leading-relaxed">
                    {googleSignup ? (
                      <>
                        Google email verified. Enter the 6-digit SMS code sent to{' '}
                        <span className="text-text-primary">{phone}</span>
                      </>
                    ) : (
                      <>
                        We sent a 6-digit code to <span className="text-text-primary">{email}</span>
                        {phoneDigits.trim() && (
                          <>
                            {' '}and <span className="text-text-primary">{phone}</span>
                          </>
                        )}
                      </>
                    )}
                  </p>

                  {!googleSignup && (
                    <div>
                      <label className="block text-[10px] font-mono text-text-secondary uppercase tracking-wider mb-2">
                        Email OTP
                      </label>
                      <OtpInput value={emailOtp} onChange={setEmailOtp} disabled={loading} />
                      {emailVerified && (
                        <p className="flex items-center gap-1 mt-1 text-[10px] font-mono text-green-400">
                          <CheckCircle2 size={12} /> Verified
                        </p>
                      )}
                    </div>
                  )}

                  {phoneDigits.trim() && (
                    <div>
                      <label className="block text-[10px] font-mono text-text-secondary uppercase tracking-wider mb-2">
                        Phone OTP
                      </label>
                      <OtpInput value={phoneOtp} onChange={setPhoneOtp} disabled={loading} />
                      {phoneVerified && (
                        <p className="flex items-center gap-1 mt-1 text-[10px] font-mono text-green-400">
                          <CheckCircle2 size={12} /> Verified
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSignupStep(1)}
                      className="flex-1 py-2 border border-glass-border text-text-secondary hover:text-text-primary text-xs font-mono uppercase rounded transition-all"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-[2] py-2 bg-[--red-core] hover:opacity-90 text-white text-xs font-mono uppercase tracking-wider rounded transition-all disabled:opacity-50"
                    >
                      {loading ? 'Verifying...' : 'Verify & Continue →'}
                    </button>
                  </div>
                </form>
              )}

              {tab === 'signup' && signupStep === 3 && (
                <form onSubmit={handleCompleteSignup} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="font-heading font-bold text-sm text-text-primary">
                      {role === 'contributor' ? 'Set up your contributor profile' : 'Almost there!'}
                    </p>
                    <span className="font-mono text-[9px] text-text-secondary uppercase">Step 3 of 3</span>
                  </div>

                  {googleSignup && (
                    <div>
                      <label className="block text-[10px] font-mono text-text-secondary uppercase tracking-wider mb-1">
                        Phone (Optional)
                      </label>
                      <div className="flex gap-2">
                        <span className="flex items-center px-3 bg-black/60 border border-glass-border rounded font-mono text-xs text-text-secondary shrink-0">
                          +91
                        </span>
                        <input
                          type="tel"
                          value={phoneDigits}
                          onChange={(e) => setPhoneDigits(e.target.value.replace(/\D/g, '').slice(0, 10))}
                          placeholder="e.g. 9876543210"
                          className={`${inputClass} flex-1`}
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] font-mono text-text-secondary uppercase tracking-wider mb-1">
                      Display Name *
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-text-secondary">
                        <UserIcon size={14} />
                      </span>
                      <input
                        type="text"
                        required
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="e.g. Alex Engineer"
                        className={`${inputClass} pl-9`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-text-secondary uppercase tracking-wider mb-1">
                      Username *
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-text-secondary font-mono text-sm">
                        @
                      </span>
                      <input
                        type="text"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value.replace(/^@+/, ''))}
                        placeholder="e.g. alex_embedded"
                        className={`${inputClass} pl-9 pr-24`}
                      />
                      {username.trim().length >= 3 && (
                        <span
                          className={`absolute inset-y-0 right-3 flex items-center text-[10px] font-mono ${
                            usernameStatus === 'available'
                              ? 'text-green-400'
                              : usernameStatus === 'taken'
                              ? 'text-[--red-core]'
                              : 'text-text-secondary'
                          }`}
                        >
                          {usernameStatus === 'checking' && 'checking...'}
                          {usernameStatus === 'available' && '✓ available'}
                          {usernameStatus === 'taken' && '✗ taken'}
                        </span>
                      )}
                    </div>
                  </div>

                  {role === 'contributor' && (
                    <>
                      <div>
                        <label className="block text-[10px] font-mono text-text-secondary uppercase tracking-wider mb-1">
                          Education *
                        </label>
                        <input
                          type="text"
                          required
                          value={education}
                          onChange={(e) => setEducation(e.target.value)}
                          placeholder="B.E. Computer Engineering"
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono text-text-secondary uppercase tracking-wider mb-1">
                          Higher Education
                        </label>
                        <input
                          type="text"
                          value={higherEdu}
                          onChange={(e) => setHigherEdu(e.target.value)}
                          placeholder="Vector India — Embedded Systems Training"
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono text-text-secondary uppercase tracking-wider mb-1">
                          Bio
                        </label>
                        <textarea
                          value={bio}
                          onChange={(e) => setBio(e.target.value.slice(0, 300))}
                          placeholder="Embedded systems engineer passionate about..."
                          rows={3}
                          maxLength={300}
                          className={`${inputClass} resize-none`}
                        />
                        <p className="text-right font-mono text-[9px] text-text-secondary mt-0.5">
                          {bio.length}/300
                        </p>
                      </div>
                    </>
                  )}

                  <div className="flex gap-2 pt-1">
                    {!googleSignup && (
                      <button
                        type="button"
                        onClick={() => setSignupStep(2)}
                        className="flex-1 py-2 border border-glass-border text-text-secondary hover:text-text-primary text-xs font-mono uppercase rounded transition-all"
                      >
                        Back
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={loading || usernameStatus === 'taken'}
                      className={`${googleSignup ? 'w-full' : 'flex-[2]'} py-2.5 bg-[--red-core] hover:opacity-90 text-white text-xs font-mono uppercase tracking-widest rounded transition-all disabled:opacity-50`}
                    >
                      {loading ? 'Creating account...' : 'Complete Sign Up →'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
