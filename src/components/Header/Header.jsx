import { useState, useEffect } from 'react'
import './Header.css'

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Screenshots', href: '#screenshots' },
  { label: 'Install', href: '#install' },
  { label: 'Roadmap', href: '#roadmap' },
]

export default function Header() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const closeMenu = () => setMenuOpen(false)

  return (
    <header className={`header${scrolled ? ' header--scrolled' : ''}`}>
      <div className="container header__inner">
        <a href="#" className="header__logo" onClick={closeMenu}>
          <img src="/assets/images/logo.png" alt="CodeArchy logo" width="32" height="32" />
          <span>CodeArchy</span>
        </a>

        <nav className={`header__nav${menuOpen ? ' header__nav--open' : ''}`} aria-label="Primary navigation">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} className="header__nav-link" onClick={closeMenu}>
              {link.label}
            </a>
          ))}
        </nav>

        <div className="header__actions">
          <a
            href="https://github.com/iyinusa/codearchy"
            className="btn btn--ghost btn--sm header__github"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View on GitHub"
          >
            <GitHubIcon />
            GitHub
          </a>
          <a
            href="https://marketplace.visualstudio.com/items?itemName=iyinusa.codearchy"
            className="btn btn--primary btn--sm"
            target="_blank"
            rel="noopener noreferrer"
          >
            Install Free
          </a>
        </div>

        <button
          className={`header__burger${menuOpen ? ' header__burger--open' : ''}`}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      {menuOpen && (
        <div className="header__mobile-nav">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} className="header__mobile-link" onClick={closeMenu}>
              {link.label}
            </a>
          ))}
          <div className="header__mobile-actions">
            <a
              href="https://github.com/iyinusa/codearchy"
              className="btn btn--ghost"
              target="_blank"
              rel="noopener noreferrer"
              onClick={closeMenu}
            >
              <GitHubIcon /> GitHub
            </a>
            <a
              href="https://marketplace.visualstudio.com/items?itemName=iyinusa.codearchy"
              className="btn btn--primary"
              target="_blank"
              rel="noopener noreferrer"
              onClick={closeMenu}
            >
              Install Free
            </a>
          </div>
        </div>
      )}
    </header>
  )
}

function GitHubIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.342-3.369-1.342-.454-1.155-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836a9.59 9.59 0 0 1 2.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
    </svg>
  )
}
