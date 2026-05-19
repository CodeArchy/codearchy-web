import './Roadmap.css'

const DONE = [
  'Tree-sitter WASM multi-language AST parsing',
  'Semantic heuristic subsystem grouping',
  'React Flow interactive architecture diagram',
  'Cytoscape.js dense-graph view',
  'Gemma 4 via Ollama — local AI architecture inference',
  'Conversational AI assistant with context persistence',
  'Kokoro neural TTS — offline voice output',
  'Story narrator — AI-generated architectural walkthroughs',
  'Export diagrams as SVG and PNG',
  'Incremental re-analysis on file save',
]

const UPCOMING = [
  'Voice input (audio transcription → Gemma 4)',
  'Custom onboarding explainer — export/share',
  'Multi-root workspace support',
  'Custom subsystem annotation rules',
  'Architecture diff view (detect structural drift between branches)',
  'Team knowledge base — share architectural annotations across a repo',
]

export default function Roadmap() {
  return (
    <section className="roadmap" id="roadmap">
      <div className="container">
        <div className="section-header reveal">
          <span className="section-label">What's Next</span>
          <h2 className="section-title">
            <span className="gradient-text">Roadmap</span>
          </h2>
          <div className="divider divider--center" />
          <p className="section-desc">
            Built in the open. Every feature ships as an update to the VS Code Marketplace.
          </p>
        </div>

        <div className="roadmap__grid">
          {/* Done */}
          <div className="roadmap__col reveal reveal-delay-1">
            <div className="roadmap__col-header roadmap__col-header--done">
              <span className="roadmap__col-icon">✅</span>
              <h3 className="roadmap__col-title">Shipped</h3>
              <span className="badge badge--green">{DONE.length} features</span>
            </div>
            <ul className="roadmap__list">
              {DONE.map((item) => (
                <li key={item} className="roadmap__item roadmap__item--done">
                  <span className="roadmap__check" aria-hidden="true">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Upcoming */}
          <div className="roadmap__col reveal reveal-delay-2">
            <div className="roadmap__col-header roadmap__col-header--upcoming">
              <span className="roadmap__col-icon">🚧</span>
              <h3 className="roadmap__col-title">Coming Soon</h3>
              <span className="badge badge--purple">{UPCOMING.length} planned</span>
            </div>
            <ul className="roadmap__list">
              {UPCOMING.map((item) => (
                <li key={item} className="roadmap__item roadmap__item--upcoming">
                  <span className="roadmap__dot" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>

            {/* Contribute CTA */}
            <a
              href="https://github.com/iyinusa/codearchy/blob/main/CONTRIBUTING.md"
              className="roadmap__contribute"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span>🤝</span>
              <span>Want to contribute? Read the guide →</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
