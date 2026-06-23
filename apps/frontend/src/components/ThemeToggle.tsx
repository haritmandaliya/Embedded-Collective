import { Sun, Moon } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '../context/ThemeContext'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle dark/light mode"
      className="relative w-9 h-9 rounded-full glass-card border border-[--glass-border]
                 flex items-center justify-center hover:border-[--red-core]/50
                 transition-all duration-200"
    >
      <AnimatePresence mode="wait">
        {theme === 'dark' ? (
          <motion.span key="sun"
            initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}
            className="flex items-center justify-center"
          >
            <Sun size={16} className="text-[--text-secondary]" />
          </motion.span>
        ) : (
          <motion.span key="moon"
            initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }}
            className="flex items-center justify-center"
          >
            <Moon size={16} className="text-[--text-secondary]" />
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  )
}
