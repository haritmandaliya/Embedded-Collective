import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Terminal, HelpCircle, Eye, Edit2, AlertCircle, Upload, X } from 'lucide-react'
import { useCommunity } from '../../context/CommunityContext'
import { ASK_CATEGORIES } from './constants'

export function AskQuestion() {
  const navigate = useNavigate()
  const { user, token, setAuthModalOpen } = useCommunity()

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [images, setImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const dropRef = useRef<HTMLDivElement>(null)

  const MAX_IMAGES = 5
  const MAX_IMAGE_SIZE = 10 * 1024 * 1024

  useEffect(() => {
    if (!user) setAuthModalOpen(true, 'signin')
  }, [user, setAuthModalOpen])

  useEffect(() => {
    if (title.trim().length > 3) {
      const controller = new AbortController()
      fetch(`/api/v1/search/?q=${encodeURIComponent(title)}&limit=5`, { signal: controller.signal })
        .then((res) => (res.ok ? res.json() : { items: [] }))
        .then((data) => setSuggestions(data.items || []))
        .catch(() => {})
      return () => controller.abort()
    }
    setSuggestions([])
  }, [title])

  useEffect(() => {
    return () => {
      imagePreviews.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [imagePreviews])

  const handleFiles = (files: File[]) => {
    const valid = files.filter((f) => f.type.startsWith('image/') && f.size <= MAX_IMAGE_SIZE)
    if (valid.length < files.length) {
      setError('Only images under 10MB are allowed.')
    }

    const remaining = MAX_IMAGES - images.length
    const next = valid.slice(0, remaining)
    if (next.length === 0) return

    setImages((prev) => [...prev, ...next])
    setImagePreviews((prev) => [...prev, ...next.map((f) => URL.createObjectURL(f))])
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    handleFiles(files)
    e.target.value = ''
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    handleFiles(files)
  }

  const removeImage = (index: number) => {
    URL.revokeObjectURL(imagePreviews[index])
    setImages((prev) => prev.filter((_, i) => i !== index))
    setImagePreviews((prev) => prev.filter((_, i) => i !== index))
  }

  const uploadImages = async (questionId: number) => {
    for (const file of images) {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(`/api/v1/uploads/?question_id=${questionId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      if (!res.ok) {
        console.error('Failed to upload image', file.name)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) {
      setAuthModalOpen(true, 'signin')
      return
    }
    if (!title.trim() || !content.trim() || !category) {
      setError('Title, category, and description are required.')
      return
    }

    setSubmitting(true)
    setError(null)

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)

    try {
      const res = await fetch('/api/v1/questions/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          category,
          tags,
        }),
      })

      if (res.ok) {
        const created = await res.json()
        if (images.length > 0) {
          await uploadImages(created.id)
        }
        window.dispatchEvent(new Event('community:stats-refresh'))
        navigate(`/community/q/${created.slug}`)
      } else {
        const errData = await res.json()
        setError(errData.detail || 'Failed to publish problem.')
      }
    } catch {
      setError('Connection failure: Unable to reach server.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-6">
        <div className="glass-card p-10 text-center border border-[--glass-border] max-w-md">
          <HelpCircle className="mx-auto text-[--cyan-spark] mb-4" size={40} />
          <h2 className="font-heading font-bold text-xl uppercase mb-2">Sign in to post a problem</h2>
          <p className="font-mono text-xs text-text-secondary mb-6">
            Join Embedded Collective to share your embedded hardware challenges.
          </p>
          <button
            type="button"
            onClick={() => setAuthModalOpen(true, 'signin')}
            className="font-mono text-xs px-6 py-3 bg-[--red-core] text-white rounded-full hover:bg-[--red-glow] transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="pb-16 px-4 md:px-6 relative">
      <div className="max-w-3xl mx-auto relative z-10 pt-8">
        <div className="mb-8">
          <div className="font-mono text-[--cyan-spark] text-xs tracking-widest mb-2">
            // POST A PROBLEM
          </div>
          <h1 className="font-heading font-bold text-3xl uppercase tracking-wider text-text-primary flex items-center gap-2">
            <Terminal className="text-[--cyan-spark]" size={28} />
            Ask a Question
          </h1>
        </div>

        {error && (
          <div className="glass-card p-4 border border-[--red-core]/30 text-[--red-glow] font-mono text-xs mb-6 flex items-start gap-2">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="glass-card p-6 rounded-lg border border-[--red-core]/25">
            <label className="block font-heading font-bold uppercase text-xs tracking-wider text-text-primary mb-3">
              1. Problem title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. LPC2129 UART DMA buffer overflow under high baud rate"
              className="w-full bg-black border border-[--red-core]/20 focus:border-[--cyan-spark] rounded px-4 py-2.5 font-mono text-sm text-text-primary outline-none transition-colors"
              required
            />

            <AnimatePresence>
              {suggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 bg-[--red-core]/5 border border-[--red-core]/20 rounded p-4 overflow-hidden"
                >
                  <div className="flex items-center gap-2 text-xs text-[--red-core] font-mono mb-2">
                    <AlertCircle size={14} />
                    Similar problems found:
                  </div>
                  <ul className="space-y-1">
                    {suggestions.map((s) => (
                      <li
                        key={s.slug}
                        onClick={() => navigate(`/community/q/${s.slug}`)}
                        className="font-mono text-xs text-text-secondary hover:text-[--cyan-spark] cursor-pointer"
                      >
                        • {s.title}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="glass-card p-6 rounded-lg border border-[--red-core]/25">
            <label className="block font-heading font-bold uppercase text-xs tracking-wider text-text-primary mb-4">
              2. Category
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ASK_CATEGORIES.map((cat) => {
                const Icon = cat.icon
                const selected = category === cat.value
                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setCategory(cat.value)}
                    className={`text-left p-4 rounded-lg border transition-all duration-200 ${
                      selected
                        ? 'border-[--red-core] bg-[--red-core]/10 shadow-[0_0_16px_rgba(192,25,44,0.2)]'
                        : 'border-[--glass-border] hover:border-[--red-core]/40'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon size={16} className={selected ? 'text-[--red-core]' : 'text-text-secondary'} />
                      <span className="font-heading font-bold text-xs uppercase">{cat.label}</span>
                    </div>
                    <p className="font-mono text-[10px] text-text-secondary">{cat.desc}</p>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="glass-card rounded-lg border border-[--red-core]/25 overflow-hidden">
            <div className="flex items-center justify-between bg-white/5 border-b border-[--red-core]/20 px-4 py-2">
              <span className="font-heading font-bold uppercase text-xs tracking-wider text-text-primary px-2">
                3. Problem description
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('write')}
                  className={`font-mono text-xs px-3 py-1.5 rounded flex items-center gap-1 ${
                    activeTab === 'write' ? 'bg-[--red-core] text-white' : 'text-text-secondary'
                  }`}
                >
                  <Edit2 size={12} /> Write
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className={`font-mono text-xs px-3 py-1.5 rounded flex items-center gap-1 ${
                    activeTab === 'preview' ? 'bg-[--cyan-spark]/20 text-[--cyan-spark]' : 'text-text-secondary'
                  }`}
                >
                  <Eye size={12} /> Preview
                </button>
              </div>
            </div>
            <div className="p-6">
              {activeTab === 'write' ? (
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Describe your hardware setup, symptoms, register values, and what you've tried..."
                  rows={12}
                  className="w-full bg-black border border-[--red-core]/20 focus:border-[--cyan-spark] rounded p-4 font-mono text-sm text-text-primary outline-none resize-y"
                  required
                />
              ) : (
                <div className="min-h-[250px] bg-black border border-[--red-core]/20 rounded p-6 font-mono text-sm text-text-secondary whitespace-pre-wrap">
                  {content || 'Nothing to preview yet.'}
                </div>
              )}
            </div>
          </div>

          <div className="glass-card p-6 rounded-lg border border-[--red-core]/25">
            <label className="block font-heading font-bold uppercase text-xs tracking-wider text-text-primary mb-3">
              4. Screenshots &amp; photos
            </label>
            <p className="font-mono text-[10px] text-text-secondary mb-4">
              Upload oscilloscope captures, PCB photos, or error screenshots (max {MAX_IMAGES} images, 10MB each)
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              multiple
              className="hidden"
              onChange={handleImageSelect}
            />

            <div
              ref={dropRef}
              onDragOver={handleDragOver}
              onDragEnter={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200 ${
                isDragging
                  ? 'border-[--red-core] bg-[--red-core]/10 scale-[1.01]'
                  : 'border-[--red-core]/25 hover:border-[--red-core]/50 hover:bg-white/[0.02] bg-black/30'
              }`}
            >
              <Upload className={`mx-auto mb-2 transition-colors ${isDragging ? 'text-[--red-core]' : 'text-[--cyan-spark]'}`} size={28} />
              <p className="font-mono text-xs text-text-primary">
                {isDragging ? 'Release to upload' : 'Drop images here or click to browse'}
              </p>
              <p className="font-mono text-[10px] text-text-secondary mt-1">JPG, PNG, GIF, WebP · max 5 files · 10MB each</p>
            </div>

            {imagePreviews.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
                {imagePreviews.map((preview, i) => (
                  <div
                    key={preview}
                    className="relative group rounded-lg overflow-hidden border border-[--glass-border] aspect-video bg-black"
                  >
                    <img src={preview} alt={images[i]?.name || 'Upload preview'} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute top-2 right-2 p-1 rounded-full bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="Remove image"
                    >
                      <X size={14} />
                    </button>
                    <span className="absolute bottom-0 inset-x-0 font-mono text-[9px] truncate px-2 py-1 bg-black/70 text-white/80">
                      {images[i]?.name}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="glass-card p-6 rounded-lg border border-[--red-core]/25">
            <label className="block font-heading font-bold uppercase text-xs tracking-wider text-text-primary mb-2">
              5. Tags (comma separated)
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="uart, lpc2129, dma, firmware"
              className="w-full bg-black border border-[--red-core]/20 focus:border-[--cyan-spark] rounded px-4 py-2.5 font-mono text-sm text-text-primary outline-none"
            />
          </div>

          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={submitting || !category}
              className="font-mono text-sm px-6 py-3 rounded-full bg-[--red-core] text-white hover:bg-[--red-glow] disabled:opacity-50 transition-all uppercase font-bold"
            >
              {submitting ? 'Publishing…' : 'Post Problem'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/community')}
              className="font-mono text-sm px-6 py-3 rounded-full border border-[--glass-border] text-text-secondary hover:text-text-primary transition-all uppercase"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
