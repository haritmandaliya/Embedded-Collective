import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ZoomIn, ImageIcon } from 'lucide-react'

export interface AttachmentItem {
  id: number
  file_name: string
  file_url: string
  mime_type: string
}

function isImage(mime: string) {
  return mime.startsWith('image/')
}

function resolveUrl(url: string) {
  if (!url) return ''
  if (url.startsWith('http')) return url
  const filename = url.split('/').pop() || url
  return `/api/v1/uploads/static/${filename}`
}

export function ImageGallery({
  attachments,
  compact = false,
}: {
  attachments: AttachmentItem[]
  compact?: boolean
}) {
  const [lightbox, setLightbox] = useState<AttachmentItem | null>(null)
  const images = attachments.filter((a) => isImage(a.mime_type))

  if (images.length === 0) return null

  if (compact) {
    if (images.length === 1) {
      return (
        <div className="relative mt-3 rounded-lg overflow-hidden border border-white/10 group aspect-video max-h-[320px]">
          <img
            src={resolveUrl(images[0].file_url)}
            alt={images[0].file_name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
        </div>
      )
    }

    if (images.length === 2) {
      return (
        <div className="grid grid-cols-2 gap-1.5 mt-3 rounded-lg overflow-hidden border border-white/10 aspect-video max-h-[320px]">
          {images.map((img) => (
            <div key={img.id} className="relative group overflow-hidden h-full">
              <img
                src={resolveUrl(img.file_url)}
                alt={img.file_name}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      )
    }

    if (images.length >= 3) {
      return (
        <div className="grid grid-cols-3 gap-1.5 mt-3 rounded-lg overflow-hidden border border-white/10 aspect-video max-h-[320px]">
          <div className="col-span-2 relative group overflow-hidden h-full">
            <img
              src={resolveUrl(images[0].file_url)}
              alt={images[0].file_name}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          </div>
          <div className="grid grid-rows-2 gap-1.5 h-full">
            {images.slice(1, 3).map((img, i) => (
              <div key={img.id} className="relative group overflow-hidden h-full">
                <img
                  src={resolveUrl(img.file_url)}
                  alt={img.file_name}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
                {i === 1 && images.length > 3 && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center font-heading font-bold text-white text-sm">
                    +{images.length - 3}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )
    }
  }

  return (
    <>
      <div className="mt-6 border-t border-white/5 pt-5">
        <p className="font-mono text-[10px] uppercase tracking-wider text-[--cyan-spark] mb-3 flex items-center gap-1.5">
          <ImageIcon size={12} />
          Problem screenshots ({images.length})
        </p>
        <div
          className={`grid gap-3 ${
            images.length === 1 ? 'grid-cols-1' : images.length === 2 ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-3'
          }`}
        >
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setLightbox(img)}
              className={`group relative overflow-hidden rounded-lg border border-[--glass-border] bg-black/40 focus:outline-none focus:ring-2 focus:ring-[--cyan-spark]/50 ${
                i === 0 && images.length > 2 ? 'md:col-span-2 md:row-span-2' : ''
              }`}
            >
              <img
                src={resolveUrl(img.file_url)}
                alt={img.file_name}
                className={`w-full object-cover transition-transform duration-500 group-hover:scale-105 ${
                  i === 0 && images.length > 2 ? 'h-48 md:h-64' : 'h-32 md:h-40'
                }`}
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                <ZoomIn
                  size={24}
                  className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg"
                />
              </div>
              <span className="absolute bottom-2 left-2 font-mono text-[9px] text-white/80 bg-black/50 px-2 py-0.5 rounded truncate max-w-[90%]">
                {img.file_name}
              </span>
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-4"
            onClick={() => setLightbox(null)}
          >
            <button
              type="button"
              onClick={() => setLightbox(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
              aria-label="Close"
            >
              <X size={22} />
            </button>
            <motion.img
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              src={resolveUrl(lightbox.file_url)}
              alt={lightbox.file_name}
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <p className="absolute bottom-6 left-1/2 -translate-x-1/2 font-mono text-xs text-white/70">
              {lightbox.file_name}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
