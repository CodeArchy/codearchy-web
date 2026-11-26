import { useEffect, useState } from 'react'
import { LINKS } from '../../data/links'
import { GitHubIcon, MoonIcon, SunIcon } from '../icons'
import { Logo } from './Logo'

const NAV = [
  { href: '/#features', label: 'Features' },
  { href: '/#get-started', label: 'Get started' },
  { href: '/#privacy', label: 'Privacy' },
]

export default function Header({ theme, onToggleTheme }) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={`site-header${scrolled ? ' is-scrolled' : ''}`}>
      <div className="container site-header__inner">
        <a href="/" className="site-brand" aria-label="CodeArchy home">
          <Logo size={28} />
          <span>CodeArchy</span>
        </a>
        <nav className="site-nav" aria-label="Sections">
          {NAV.map((n) => (
            <a key={n.href} href={n.href}>
              {n.label}
            </a>
          ))}
        </nav>
        <div className="site-header__actions">
          <a className="icon-btn site-header__github" href={LINKS.github} target="_blank" rel="noopener noreferrer" aria-label="CodeArchy on GitHub" title="GitHub">
            <GitHubIcon />
          </a>
          <button type="button" className="icon-btn" onClick={onToggleTheme} aria-label={theme === 'dark' ? 'Switch to the light theme' : 'Switch to the dark theme'} title={theme === 'dark' ? 'Light theme' : 'Dark theme'}>
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
          <a className="btn btn--primary btn--small site-header__cta" href={LINKS.app} target="_blank" rel="noopener">
            Open the app
          </a>
        </div>
      </div>
    </header>
  )
}
