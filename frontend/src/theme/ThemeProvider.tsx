import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type Theme = 'dark' | 'light'

type ThemeContextValue = {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const STORAGE_KEY = 'sketches101-theme'
const ThemeContext = createContext<ThemeContextValue | null>(null)

function applyDomTheme(theme: Theme) {
  const root = document.documentElement
  root.classList.remove('theme-light', 'theme-dark', 'light', 'dark')
  root.classList.add(theme === 'light' ? 'theme-light' : 'theme-dark')
  // Tailwind darkMode: 'class' looks for .dark
  if (theme === 'dark') root.classList.add('dark')
  document.cookie = `sketches101-theme=${theme};path=/;max-age=31536000;SameSite=Lax`
}

function readInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark') return stored
  } catch {
    /* ignore */
  }
  return 'dark'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => readInitialTheme())

  useEffect(() => {
    applyDomTheme(theme)
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      /* ignore */
    }
    document.dispatchEvent(
      new CustomEvent('sketches101:themechange', { detail: { theme } }),
    )
  }, [theme])

  const setTheme = useCallback((next: Theme) => setThemeState(next), [])
  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }, [])

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme }),
    [theme, setTheme, toggleTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
