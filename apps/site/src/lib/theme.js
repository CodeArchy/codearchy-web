import { useCallback, useEffect, useState } from 'react'

/** The site's theme: the visitor's choice (kept), else the system's preference. index.html applies it before first paint. */
const KEY = 'codearchy.site.theme'
const media = () => window.matchMedia('(prefers-color-scheme: dark)')

function stored() {
  try {
    const t = localStorage.getItem(KEY)
    return t === 'light' || t === 'dark' ? t : undefined
  } catch {
    return undefined
  }
}

export function useTheme() {
  const [theme, setTheme] = useState(() => stored() ?? (media().matches ? 'dark' : 'light'))

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  // No choice made yet: follow the system as it changes.
  useEffect(() => {
    const m = media()
    const follow = (e) => !stored() && setTheme(e.matches ? 'dark' : 'light')
    m.addEventListener('change', follow)
    return () => m.removeEventListener('change', follow)
  }, [])

  const toggle = useCallback(() => {
    setTheme((t) => {
      const next = t === 'dark' ? 'light' : 'dark'
      try {
        localStorage.setItem(KEY, next)
      } catch {
        // storage blocked: the choice lasts for this visit
      }
      return next
    })
  }, [])

  return { theme, toggle }
}
