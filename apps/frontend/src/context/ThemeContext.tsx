import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'dark' | 'light'

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
  setThemeMode: (mode: Theme | 'system') => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeMode, setThemeModeState] = useState<'dark' | 'light' | 'system'>(() => {
    const ecTheme = localStorage.getItem('ec-theme') as Theme | null
    if (ecTheme === 'dark' || ecTheme === 'light') return ecTheme
    const saved = localStorage.getItem('theme-mode')
    return (saved as 'dark' | 'light' | 'system') || 'system'
  })

  const [activeTheme, setActiveTheme] = useState<Theme>('dark')

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const updateTheme = () => {
      let nextTheme: Theme = 'dark'
      if (themeMode === 'system') {
        nextTheme = mediaQuery.matches ? 'dark' : 'light'
      } else {
        nextTheme = themeMode
      }
      setActiveTheme(nextTheme)
      document.documentElement.setAttribute('data-theme', nextTheme)
    }

    updateTheme()

    if (themeMode === 'system') {
      mediaQuery.addEventListener('change', updateTheme)
      return () => mediaQuery.removeEventListener('change', updateTheme)
    }
  }, [themeMode])

  const toggleTheme = () => {
    const next: Theme = activeTheme === 'dark' ? 'light' : 'dark'
    setThemeModeState(next)
    localStorage.setItem('theme-mode', next)
    localStorage.setItem('ec-theme', next)
  }

  const setThemeMode = (mode: Theme | 'system') => {
    setThemeModeState(mode)
    if (mode === 'system') {
      localStorage.removeItem('theme-mode')
      localStorage.removeItem('ec-theme')
    } else {
      localStorage.setItem('theme-mode', mode)
      localStorage.setItem('ec-theme', mode)
    }
  }

  return (
    <ThemeContext.Provider value={{ theme: activeTheme, toggleTheme, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
