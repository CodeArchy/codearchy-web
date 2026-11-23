import { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGithub } from '@fortawesome/free-brands-svg-icons'
import './Header.css'

function VSCodeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 100 100" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M74.9 12.5L38.7 45.3 18.3 28.9 6.3 35.4v29.2l12 6.5 20.4-16.4 36.2 32.8 13.1-6.5V19l-13.1-6.5zM74.9 27.5L49.1 50 74.9 72.5V27.5z"
      />
    </svg>
  )
}

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
          <img src="/assets/images/logo-white.png" alt="CodeArchy logo" width="32" height="32" />
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
            href="https://github.com/CodeArchy/codearchy"
            className="btn btn--ghost btn--sm header__github"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View on GitHub"
          >
            <FontAwesomeIcon icon={faGithub} />
            GitHub
          </a>
          <a
            href="https://marketplace.visualstudio.com/items?itemName=iyinusa.codearchy"
            className="btn btn--primary btn--sm"
            target="_blank"
            rel="noopener noreferrer"
          >
            <VSCodeIcon /> Install Free
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
              href="https://github.com/CodeArchy/codearchy"
              className="btn btn--ghost"
              target="_blank"
              rel="noopener noreferrer"
              onClick={closeMenu}
            >
              <FontAwesomeIcon icon={faGithub} /> GitHub
            </a>
            <a
              href="https://marketplace.visualstudio.com/items?itemName=iyinusa.codearchy"
              className="btn btn--primary"
              target="_blank"
              rel="noopener noreferrer"
              onClick={closeMenu}
            >
              <VSCodeIcon /> Install Free
            </a>
          </div>
        </div>
      )}
    </header>
  )
}
