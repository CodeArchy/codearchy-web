import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faLock, faGift, faBolt } from '@fortawesome/free-solid-svg-icons'
import { faGithub } from '@fortawesome/free-brands-svg-icons'
import './Hero.css'

export default function Hero() {
  return (
    <section className="hero" id="home">
      {/* Ambient glow orbs */}
      <div className="hero__orb hero__orb--purple" aria-hidden="true" />
      <div className="hero__orb hero__orb--blue" aria-hidden="true" />

      <div className="container hero__container">
        {/* Badge row */}
        <div className="hero__badges reveal">
          <span className="badge badge--green">
            <span className="badge__dot" />
            Open Source · MIT
          </span>
          <span className="badge badge--purple">VS Code Extension</span>
          <span className="badge badge--blue">v1.0.4</span>
        </div>

        {/* Headline */}
        <h1 className="hero__title reveal reveal-delay-1">
          The Offline AI Architect<br />
          <span className="gradient-text">Living Inside Your Editor</span>
        </h1>

        <p className="hero__tagline reveal reveal-delay-2">
          Parse any codebase. Generate a senior engineer's whiteboard diagram.<br className="desktop-only" />
          Ask questions. Learn. — <strong>All locally. All privately.</strong>
        </p>

        {/* CTAs */}
        <div className="hero__cta reveal reveal-delay-3">
          <a
            href="https://marketplace.visualstudio.com/items?itemName=iyinusa.codearchy"
            className="btn btn--primary btn--lg"
            target="_blank"
            rel="noopener noreferrer"
          >
            <VSCodeIcon />
            Install Free on VS Code
          </a>
          <a
            href="https://github.com/iyinusa/codearchy"
            className="btn btn--outline btn--lg"
            target="_blank"
            rel="noopener noreferrer"
          >
            <FontAwesomeIcon icon={faGithub} />
            View on GitHub
          </a>
        </div>

        {/* Pill stats */}
        <div className="hero__stats reveal reveal-delay-4">
          <span className="hero__stat">
            <span className="hero__stat-icon"><FontAwesomeIcon icon={faLock} /></span> 100% Offline
          </span>
          <span className="hero__stat-sep" aria-hidden="true" />
          <span className="hero__stat">
            <span className="hero__stat-icon"><FontAwesomeIcon icon={faGift} /></span> Free &amp; Open Source
          </span>
          <span className="hero__stat-sep" aria-hidden="true" />
          <span className="hero__stat">
            <span className="hero__stat-icon"><FontAwesomeIcon icon={faBolt} /></span> 6 Languages Supported
          </span>
        </div>

        {/* Video demo */}
        <div className="hero__media reveal">
          <div className="hero__video-frame">
            <div className="hero__video-glow" aria-hidden="true" />
            <div className="hero__youtube-wrap">
              <iframe
                className="hero__youtube"
                src="https://www.youtube.com/embed/Z3AP8o8IwI4?rel=0&modestbranding=1"
                title="CodeArchy — Offline AI Architecture Visualizer for VS Code"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function VSCodeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 100 100" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M74.9 12.5L38.7 45.3 18.3 28.9 6.3 35.4v29.2l12 6.5 20.4-16.4 36.2 32.8 13.1-6.5V19l-13.1-6.5zM74.9 27.5L49.1 50 74.9 72.5V27.5z"
      />
    </svg>
  )
}
