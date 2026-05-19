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
            <GitHubIcon />
            View on GitHub
          </a>
        </div>

        {/* Pill stats */}
        <div className="hero__stats reveal reveal-delay-4">
          <span className="hero__stat">
            <span className="hero__stat-icon">🔒</span> 100% Offline
          </span>
          <span className="hero__stat-sep" aria-hidden="true" />
          <span className="hero__stat">
            <span className="hero__stat-icon">🆓</span> Free &amp; Open Source
          </span>
          <span className="hero__stat-sep" aria-hidden="true" />
          <span className="hero__stat">
            <span className="hero__stat-icon">⚡</span> 6 Languages Supported
          </span>
        </div>

        {/* Video demo */}
        <div className="hero__media reveal">
          <div className="hero__video-frame">
            <div className="hero__video-glow" aria-hidden="true" />
            <video
              className="hero__video"
              autoPlay
              muted
              loop
              playsInline
              poster="/assets/images/explainer.png"
              aria-label="CodeArchy demo video"
            >
              <source src="/assets/video/codearchy.mp4" type="video/mp4" />
              <img src="/assets/images/explainer.png" alt="CodeArchy architecture visualization" />
            </video>
          </div>
        </div>
      </div>
    </section>
  )
}

function VSCodeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 100 100" fill="currentColor" aria-hidden="true">
      <path d="M74.9 12.5 38.7 45.3 18.3 28.9 6.3 35.4v29.2l12 6.5 20.4-16.4 36.2 32.8 13.1-6.5V19l-13.1-6.5z"/>
    </svg>
  )
}

function GitHubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.342-3.369-1.342-.454-1.155-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836a9.59 9.59 0 0 1 2.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
    </svg>
  )
}
