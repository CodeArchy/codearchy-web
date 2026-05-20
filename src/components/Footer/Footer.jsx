import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faStar } from '@fortawesome/free-solid-svg-icons'
import './Footer.css'

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="footer">
      <div className="footer__glow" aria-hidden="true" />
      <div className="container footer__inner">
        {/* Brand */}
        <div className="footer__brand">
          <a href="#" className="footer__logo">
            <img src="/assets/images/logo-white.png" alt="CodeArchy logo" width="28" height="28" />
            <span>CodeArchy</span>
          </a>
          <p className="footer__tagline">
            The offline AI architect that lives inside your editor. Parse any codebase. Generate
            architecture. Ask questions. — All privately.
          </p>
          <div className="footer__badges">
            <span className="badge badge--green">
              <span style={{ width: 6, height: 6, background: 'var(--color-green)', borderRadius: '50%', display: 'inline-block' }} />
              Open Source
            </span>
            <span className="badge badge--purple">MIT License</span>
            <span className="badge badge--blue">Free Forever</span>
          </div>
        </div>

        {/* Links */}
        <div className="footer__links">
          <div className="footer__link-group">
            <h4 className="footer__link-heading">Extension</h4>
            <a href="https://marketplace.visualstudio.com/items?itemName=iyinusa.codearchy" className="footer__link" target="_blank" rel="noopener noreferrer">
              VS Code Marketplace
            </a>
            <a href="https://marketplace.visualstudio.com/items?itemName=iyinusa.codearchy#qna" className="footer__link" target="_blank" rel="noopener noreferrer">
              Q&amp;A
            </a>
            <a href="https://github.com/iyinusa/codearchy/blob/main/CHANGELOG.md" className="footer__link" target="_blank" rel="noopener noreferrer">
              Changelog
            </a>
          </div>

          <div className="footer__link-group">
            <h4 className="footer__link-heading">GitHub</h4>
            <a href="https://github.com/iyinusa/codearchy" className="footer__link" target="_blank" rel="noopener noreferrer">
              Repository
            </a>
            <a href="https://github.com/iyinusa/codearchy/issues" className="footer__link" target="_blank" rel="noopener noreferrer">
              Issues
            </a>
            <a href="https://github.com/iyinusa/codearchy/blob/main/CONTRIBUTING.md" className="footer__link" target="_blank" rel="noopener noreferrer">
              Contributing
            </a>
            <a href="https://github.com/iyinusa/codearchy/blob/main/LICENSE" className="footer__link" target="_blank" rel="noopener noreferrer">
              License
            </a>
          </div>

          <div className="footer__link-group">
            <h4 className="footer__link-heading">Page</h4>
            <a href="#features" className="footer__link">Features</a>
            <a href="#how-it-works" className="footer__link">How It Works</a>
            <a href="#screenshots" className="footer__link">Screenshots</a>
            <a href="#install" className="footer__link">Install</a>
            <a href="#roadmap" className="footer__link">Roadmap</a>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="footer__bottom">
        <div className="container footer__bottom-inner">
          <p className="footer__copy">
            © {year} CodeArchy, created by <a href="https://github.com/iyinusa" target="_blank" rel="noopener noreferrer">I. Kennedy Yinusa</a>. Released under the{' '}
            <a href="https://github.com/iyinusa/codearchy/blob/main/LICENSE" target="_blank" rel="noopener noreferrer">MIT License</a>.
          </p>
          <a
            href="https://github.com/iyinusa/codearchy"
            className="footer__github-btn"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Star CodeArchy on GitHub"
          >
            <FontAwesomeIcon icon={faStar} />
            Star on GitHub
          </a>
        </div>
      </div>
    </footer>
  )
}
