import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Github, Linkedin } from 'lucide-react'
import { useCommunity } from '../../context/CommunityContext'
import { useToast } from '../../context/ToastContext'

const SUGGESTED_TAGS = ['UART', 'SPI', 'I2C', 'CAN', 'ARM7', 'LPC2129', 'RTOS', 'DMA']

interface OnboardingWizardProps {
  isOpen: boolean
  onClose: () => void
}

export function OnboardingWizard({ isOpen, onClose }: OnboardingWizardProps) {
  const { user, token, refreshUser } = useCommunity()
  const { toast } = useToast()
  const [step, setStep] = useState(1)

  // Step 1: Bio & Focus
  const [bio, setBio] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  // Step 2: Connected Accounts
  const [githubConnected, setGithubConnected] = useState(false)
  const [linkedinConnected, setLinkedinConnected] = useState(false)

  // Step 3: Notifications
  const [emailAnswer, setEmailAnswer] = useState(true)
  const [emailDigest, setEmailDigest] = useState(false)

  const [saving, setSaving] = useState(false)

  if (!isOpen) return null

  const handleToggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  const handleNextStep = async () => {
    if (step === 1 && selectedTags.length === 0) {
      toast.info('Please select at least one area of focus to proceed.')
      return
    }

    if (step < 4) {
      setStep((s) => s + 1)
      return
    }

    // Save onboarding details to database on final step
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
          bio: bio || 'Embedded systems enthusiast.',
          github_url: githubConnected ? 'https://github.com/mock-user' : undefined,
          linkedin_url: linkedinConnected ? 'https://linkedin.com/in/mock-user' : undefined
        })
      })

      // Update notifications too
      await fetch('/api/v1/users/me/notification-prefs', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email_answer: emailAnswer,
          email_digest: emailDigest
        })
      })

      if (res.ok) {
        toast.success('Onboarding complete! Welcome to the collective.')
        refreshUser()
        onClose()
      } else {
        toast.error('Failed to update profile settings.')
      }
    } catch (err) {
      toast.error('Error establishing connection to central node.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl px-4">
      <div className="w-full max-w-lg glass-card rounded-xl border border-red-core/30 shadow-[0_0_40px_rgba(192,25,44,0.2)] p-8 relative overflow-hidden">
        
        {/* Progress Tracker */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-1.5 font-mono text-[9px] text-text-secondary uppercase">
            <span>Step {step} of 4</span>
            <span className="text-red-core">•</span>
            <span className="text-red-glow">
              {step === 1 && 'Focus Profile'}
              {step === 2 && 'Integrations'}
              {step === 3 && 'Alert Node'}
              {step === 4 && 'Transmission'}
            </span>
          </div>
          <div className="flex gap-1">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`h-1 rounded-full transition-all duration-300 ${
                  s <= step ? 'bg-red-core w-6' : 'bg-[--glass-border] w-2'
                }`}
              />
            ))}
          </div>
        </div>

        {/* STEP CONTENT */}
        <div className="min-h-[220px]">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <h3 className="font-heading font-bold text-lg text-text-primary uppercase tracking-wide">
                  Define your Focus Profile
                </h3>
                <p className="font-body text-xs text-text-secondary">
                  Specify your low-level expertise and protocols to filter relevant hardware questions.
                </p>
                <div>
                  <label className="block font-mono text-[10px] uppercase text-text-secondary mb-1.5">
                    Areas of Expertise * (Select at least one)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {SUGGESTED_TAGS.map((tag) => {
                      const isSelected = selectedTags.includes(tag)
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => handleToggleTag(tag)}
                          className={`font-mono text-xs px-3 py-1.5 rounded border transition-all duration-200 ${
                            isSelected
                              ? 'bg-red-core border-red-core text-white shadow-[0_0_8px_rgba(192,25,44,0.35)]'
                              : 'bg-[--bg-deep] border-[--glass-border] text-text-secondary hover:text-text-primary'
                          }`}
                        >
                          {tag}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div>
                  <label className="block font-mono text-[10px] uppercase text-text-secondary mb-1.5">Short Bio</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value.slice(0, 200))}
                    placeholder="e.g. Embedded systems engineer focused on firmware development for ARM Cortex MCUs..."
                    rows={3}
                    className="w-full bg-[--bg-deep] border border-[--glass-border] rounded p-2 text-xs font-mono text-text-primary focus:outline-none focus:border-red-core/50 resize-none"
                  />
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <h3 className="font-heading font-bold text-lg text-text-primary uppercase tracking-wide">
                  Integrate External Nodes
                </h3>
                <p className="font-body text-xs text-text-secondary">
                  Connect your profiles to display your public contributions and professional networks.
                </p>
                <div className="space-y-3">
                  <div className="flex justify-between items-center bg-[--bg-deep]/40 p-4 rounded border border-[--glass-border]">
                    <div className="flex items-center gap-3">
                      <Github size={20} className="text-text-primary" />
                      <div className="text-left">
                        <span className="font-heading font-bold text-xs text-text-primary block">GitHub Integration</span>
                        <span className="font-mono text-[9px] text-text-secondary">Import open source firmware repositories</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setGithubConnected(!githubConnected)
                        toast.success(githubConnected ? 'GitHub disconnected' : 'GitHub profile linked!')
                      }}
                      className={`font-mono text-[9px] px-3 py-1.5 border rounded transition-all duration-300 ${
                        githubConnected
                          ? 'border-green-500/30 text-green-500 bg-green-500/5'
                          : 'border-red-core/30 text-red-core hover:border-red-core'
                      }`}
                    >
                      {githubConnected ? '✓ Linked' : 'Connect'}
                    </button>
                  </div>

                  <div className="flex justify-between items-center bg-[--bg-deep]/40 p-4 rounded border border-[--glass-border]">
                    <div className="flex items-center gap-3">
                      <Linkedin size={20} className="text-text-primary" />
                      <div className="text-left">
                        <span className="font-heading font-bold text-xs text-text-primary block">LinkedIn Profile</span>
                        <span className="font-mono text-[9px] text-text-secondary">Connect professional industry network</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setLinkedinConnected(!linkedinConnected)
                        toast.success(linkedinConnected ? 'LinkedIn disconnected' : 'LinkedIn profile linked!')
                      }}
                      className={`font-mono text-[9px] px-3 py-1.5 border rounded transition-all duration-300 ${
                        linkedinConnected
                          ? 'border-green-500/30 text-green-500 bg-green-500/5'
                          : 'border-red-core/30 text-red-core hover:border-red-core'
                      }`}
                    >
                      {linkedinConnected ? '✓ Linked' : 'Connect'}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <h3 className="font-heading font-bold text-lg text-text-primary uppercase tracking-wide">
                  Configure Alert Nodes
                </h3>
                <p className="font-body text-xs text-text-secondary">
                  Choose how you want to be notified when replies or resolutions are posted to your threads.
                </p>
                <div className="space-y-4 pt-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-mono text-xs text-text-primary block">Thread Answers</span>
                      <span className="font-mono text-[9px] text-text-secondary">Email me immediately when someone replies</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEmailAnswer(!emailAnswer)}
                      className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-300 flex items-center ${
                        emailAnswer ? 'bg-red-core' : 'bg-[--glass-border]'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full bg-white shadow transform transition-transform duration-300 ${
                        emailAnswer ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>

                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-mono text-xs text-text-primary block">Weekly Digest</span>
                      <span className="font-mono text-[9px] text-text-secondary">Email trending MCU & protocol resolutions</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEmailDigest(!emailDigest)}
                      className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-300 flex items-center ${
                        emailDigest ? 'bg-red-core' : 'bg-[--glass-border]'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full bg-white shadow transform transition-transform duration-300 ${
                        emailDigest ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="text-center space-y-4 py-4"
              >
                <CheckCircle2 size={48} className="text-red-glow mx-auto animate-bounce" />
                <h3 className="font-heading font-bold text-xl text-text-primary uppercase tracking-wide">
                  Transmission Ready
                </h3>
                <p className="font-mono text-xs text-text-secondary max-w-sm mx-auto">
                  You are ready, Node <strong className="text-red-glow">#{user?.id || '101'}</strong>!<br />
                  Your profile and alert matrix are completely seeded into the collective network.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* BOTTOM ACTIONS */}
        <div className="flex justify-between items-center mt-8 pt-4 border-t border-[--glass-border]">
          <button
            type="button"
            disabled={step === 1}
            onClick={() => setStep((s) => s - 1)}
            className="font-mono text-xs text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:hover:text-text-secondary transition-colors"
          >
            ← Back
          </button>
          
          <button
            type="button"
            disabled={saving}
            onClick={handleNextStep}
            className="font-mono text-xs bg-red-core hover:bg-red-glow text-white px-6 py-2 rounded shadow flex items-center gap-1.5 transition-all duration-300"
          >
            {saving ? 'Transmitting...' : step === 4 ? 'Begin Tour →' : 'Continue →'}
          </button>
        </div>
      </div>
    </div>
  )
}
