import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGlobe, faBrain, faChartBar, faComments, faVolumeHigh, faBook, faBolt, faFileExport, faLock } from '@fortawesome/free-solid-svg-icons'
import './Features.css'

const FEATURES = [
  {
    icon: faGlobe,
    title: 'Multi-Language AST',
    desc: 'TypeScript, JavaScript, Python, Java, Go & Rust parsed via Tree-sitter WASM — all natively in-editor.',
    tag: 'Parsing',
    tagColor: 'blue',
  },
  {
    icon: faBrain,
    title: 'Gemma 4 AI Architect',
    desc: 'Local LLM via Ollama produces a professional system architecture — not just a file list.',
    tag: 'AI',
    tagColor: 'purple',
  },
  {
    icon: faChartBar,
    title: 'Interactive Diagrams',
    desc: 'Interactive clean graphs for large, dense dependency networks. Pan, zoom, click.',
    tag: 'Visualization',
    tagColor: 'blue',
  },
  {
    icon: faComments,
    title: 'AI Chat Assistant',
    desc: 'Ask architecture questions in natural language. Context is maintained across the entire session.',
    tag: 'Chat',
    tagColor: 'purple',
  },
  {
    icon: faVolumeHigh,
    title: 'Kokoro Neural TTS',
    desc: 'Offline text-to-speech engine. AI responses read aloud via GPU-accelerated or WASM fallback.',
    tag: 'Voice',
    tagColor: 'green',
  },
  {
    icon: faBook,
    title: 'Story Narrator',
    desc: 'Step-by-step architectural walkthroughs — generated and narrated by AI for deep understanding.',
    tag: 'Narration',
    tagColor: 'green',
  },
  {
    icon: faBolt,
    title: 'Incremental Re-analysis',
    desc: 'Only re-parses changed files on save. Stays fast even on large monorepos with thousands of files.',
    tag: 'Performance',
    tagColor: 'blue',
  },
  {
    icon: faFileExport,
    title: 'Export Diagrams',
    desc: 'Save architecture diagrams as SVG or PNG. Perfect for docs, presentations, and team communication.',
    tag: 'Export',
    tagColor: 'purple',
  },
  {
    icon: faLock,
    title: 'Fully Offline',
    desc: 'Zero runtime network calls. No API keys. No subscriptions. Your source code never leaves your machine.',
    tag: 'Privacy',
    tagColor: 'green',
  },
]

export default function Features() {
  return (
    <section className="features" id="features">
      <div className="container">
        <div className="section-header reveal">
          <span className="section-label">Capabilities</span>
          <h2 className="section-title">
            Everything You Need to{' '}
            <span className="gradient-text">Understand Any Codebase</span>
          </h2>
          <div className="divider divider--center" />
          <p className="section-desc">
            From parsing to diagrams to conversation — CodeArchy brings every architectural insight
            directly into VS Code, with no internet required.
          </p>
        </div>

        <div className="features__grid">
          {FEATURES.map((feature, i) => (
            <article
              key={feature.title}
              className={`card features__card reveal reveal-delay-${(i % 4) + 1}`}
            >
              <div className="features__icon" aria-hidden="true">
                <FontAwesomeIcon icon={feature.icon} />
              </div>
              <div className={`badge badge--${feature.tagColor} features__tag`}>
                {feature.tag}
              </div>
              <h3 className="features__title">{feature.title}</h3>
              <p className="features__desc">{feature.desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
