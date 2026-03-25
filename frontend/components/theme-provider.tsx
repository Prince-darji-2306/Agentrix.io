'use client'

import * as React from 'react'

type Theme = 'light' | 'dark' | 'system'

type ThemeContextValue = {
  theme: Theme
  resolvedTheme: 'light' | 'dark'
  setTheme: (theme: Theme) => void
}

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  enableSystem?: boolean
}

const ThemeContext = React.createContext<ThemeContextValue | undefined>(undefined)
const STORAGE_KEY = 'theme'

function resolveTheme(theme: Theme, enableSystem: boolean): 'light' | 'dark' {
  if (theme === 'system' && enableSystem && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark'
  }
  return theme === 'dark' ? 'dark' : 'light'
}

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  enableSystem = true,
}: ThemeProviderProps) {
  const [theme, setThemeState] = React.useState<Theme>(defaultTheme)
  const [resolvedTheme, setResolvedTheme] = React.useState<'light' | 'dark'>('dark')

  React.useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Theme | null
    const nextTheme = saved ?? defaultTheme
    setThemeState(nextTheme)
    setResolvedTheme(resolveTheme(nextTheme, enableSystem))
  }, [defaultTheme, enableSystem])

  React.useEffect(() => {
    const root = document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(resolvedTheme)
  }, [resolvedTheme])

  const setTheme = React.useCallback((nextTheme: Theme) => {
    localStorage.setItem(STORAGE_KEY, nextTheme)
    setThemeState(nextTheme)
    setResolvedTheme(resolveTheme(nextTheme, enableSystem))
  }, [enableSystem])

  const value = React.useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = React.useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return ctx
}
