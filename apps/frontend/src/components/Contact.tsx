import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Phone, Linkedin, Github, Trophy, Code2, MapPin } from 'lucide-react'
import { SectionTitle } from './shared/SectionTitle'
import { CONTACT } from '../data/content'
import { ChipIcon } from './shared/ChipIcon'

import { useCommunity } from '../context/CommunityContext'

interface FormData {
  name: string
  email: string
  subject: string
  message: string
}

type SubmitState = 'idle' | 'loading' | 'success' | 'error'

export function Contact() {
  const { user, setAuthModalOpen } = useCommunity()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>()
  const [submitState, setSubmitState] = useState<SubmitState>('idle')
  const [copied, setCopied] = useState(false)
  const [copiedPhone, setCopiedPhone] = useState(false)

  const copyEmail = async () => {
    await navigator.clipboard.writeText(CONTACT.email)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const copyPhone = async () => {
    await navigator.clipboard.writeText(CONTACT.phone)
    setCopiedPhone(true)
    setTimeout(() => setCopiedPhone(false), 2000)
  }

  const onSubmit = async (data: FormData) => {
    if (!user) {
      setSubmitState('error')
      setAuthModalOpen(true, 'signin')
      setTimeout(() => setSubmitState('idle'), 3000)
      return
    }
    setSubmitState('loading')
    try {
      const res = await fetch('/api/v1/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          message: `[Subject: ${data.subject}]\n\n${data.message}`,
        }),
      })

      if (res.ok) {
        setSubmitState('success')
        reset()
        setTimeout(() => setSubmitState('idle'), 4000)
      } else {
        setSubmitState('error')
        setTimeout(() => setSubmitState('idle'), 3000)
      }
    } catch {
      setSubmitState('error')
      setTimeout(() => setSubmitState('idle'), 3000)
    }
  }

  return (
    <section id="contact" className="section-padding bg-deep min-h-screen">
      <div className="max-w-content mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-5">
            <SectionTitle title="CONNECT.init()" />
            <p className="font-body font-bold text-text-secondary leading-[1.95] mb-8">
              I am actively seeking opportunities in Embedded Systems, Firmware Development,
              Embedded Linux, Automotive Electronics, and IoT Engineering. If you are looking
              for a motivated engineer passionate about embedded technology, I would be glad to
              connect.
            </p>

            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-3">
                <button
                  onClick={copyEmail}
                  className="flex items-center gap-3 group text-left hover:text-red-glow transition-colors"
                >
                  <Mail size={20} className="text-red-core group-hover:scale-110 transition-transform" />
                  <span className="font-mono text-sm">{CONTACT.email}</span>
                </button>
                <AnimatePresence>
                  {copied && (
                    <motion.span
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="font-mono text-xs text-green-500"
                    >
                      COPIED!
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex items-center gap-3">
                <a
                  href={`tel:${CONTACT.phone}`}
                  className="flex items-center gap-3 group hover:text-red-glow transition-colors"
                >
                  <Phone size={20} className="text-red-core group-hover:scale-110 transition-transform" />
                  <span className="font-mono text-sm">{CONTACT.phone}</span>
                </a>
                <button
                  onClick={copyPhone}
                  className="text-[10px] font-mono border border-red-core/30 hover:border-red-core/60 px-1.5 py-0.5 rounded text-text-secondary hover:text-white transition-colors"
                >
                  COPY
                </button>
                <AnimatePresence>
                  {copiedPhone && (
                    <motion.span
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="font-mono text-xs text-green-500"
                    >
                      COPIED!
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>

              <a
                href={CONTACT.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 hover:text-red-glow transition-colors"
              >
                <Linkedin size={20} className="text-red-core" />
                <span className="font-mono text-sm">LinkedIn</span>
              </a>

              <a
                href={CONTACT.hackerrank}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 hover:text-red-glow transition-colors"
              >
                <Trophy size={20} className="text-red-core" />
                <span className="font-mono text-sm">HackerRank</span>
              </a>

              <a
                href={CONTACT.leetcode}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 hover:text-red-glow transition-colors"
              >
                <Code2 size={20} className="text-red-core" />
                <span className="font-mono text-sm">LeetCode</span>
              </a>

              {CONTACT.github ? (
                <a
                  href={CONTACT.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 hover:text-red-glow transition-colors"
                >
                  <Github size={20} className="text-red-core" />
                  <span className="font-mono text-sm">GitHub</span>
                </a>
              ) : (
                <div className="flex items-center gap-3 text-text-secondary/50 cursor-not-allowed select-none">
                  <Github size={20} className="text-red-core/30" />
                  <span className="font-mono text-sm line-through">GitHub — coming soon</span>
                </div>
              )}

              <div className="flex items-center gap-3">
                <MapPin size={20} className="text-red-core blink" />
                <span className="font-mono text-sm">{CONTACT.location}</span>
              </div>
            </div>

            <span className="inline-flex items-center gap-2 font-mono text-xs text-green-500">
              <span className="w-2 h-2 rounded-full bg-green-500 status-dot" />
              OPEN TO OPPORTUNITIES
            </span>
          </div>

          <div className="lg:col-span-7">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
              {(['name', 'email', 'subject'] as const).map((field) => (
                <div key={field} className="relative">
                  <input
                    {...register(field, {
                      required: `${field} is required`,
                      ...(field === 'email' && {
                        pattern: {
                          value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                          message: 'Invalid email address',
                        },
                      }),
                    })}
                    placeholder={`// ${field}`}
                    className="w-full font-mono text-sm bg-white/[0.03] border border-red-core/20 rounded px-4 py-3 text-white placeholder:text-red-core/40 focus:border-red-core focus:shadow-[0_0_12px_rgba(192,25,44,0.3)] focus:outline-none transition-all"
                  />
                  {errors[field] && (
                    <p className="font-mono text-xs text-red-glow mt-1">
                      {errors[field]?.message}
                    </p>
                  )}
                </div>
              ))}
              <div>
                <textarea
                  {...register('message', { required: 'message is required' })}
                  rows={4}
                  placeholder="// message"
                  className="w-full font-mono text-sm bg-white/[0.03] border border-red-core/20 rounded px-4 py-3 text-white placeholder:text-red-core/40 focus:border-red-core focus:shadow-[0_0_12px_rgba(192,25,44,0.3)] focus:outline-none transition-all resize-none"
                />
                {errors.message && (
                  <p className="font-mono text-xs text-red-glow mt-1">{errors.message.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={submitState === 'loading'}
                className={`w-full font-heading font-bold text-sm py-4 rounded transition-all ripple ${
                  submitState === 'success'
                    ? 'bg-green-600 text-white'
                    : submitState === 'error'
                      ? 'bg-red-dim text-white'
                      : 'bg-gradient-to-r from-red-core to-red-glow text-white hover:shadow-[0_0_20px_rgba(192,25,44,0.5)]'
                }`}
              >
                {submitState === 'loading' && (
                  <span className="inline-flex items-center gap-2">
                    <ChipIcon size={20} className="animate-spin" />
                    TRANSMITTING...
                  </span>
                )}
                {submitState === 'success' && 'SIGNAL RECEIVED ✓'}
                {submitState === 'error' && (!user ? 'SIGN IN REQUIRED TO TRANSMIT' : 'TRANSMISSION FAILED. RETRY.')}
                {submitState === 'idle' && 'TRANSMIT MESSAGE'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  )
}
