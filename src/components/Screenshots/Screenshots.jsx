import { useState } from 'react'
import './Screenshots.css'

const SCREENSHOTS = [
  {
    src: '/assets/images/explainer.png',
    alt: 'CodeArchy architecture explainer view',
    label: 'Architecture Explainer',
    desc: 'High-level system overview with subsystem responsibilities and data flows.',
  },
  {
    src: '/assets/images/flow-visualization.png',
    alt: 'CodeArchy React Flow interactive diagram',
    label: 'React Flow Diagram',
    desc: 'Interactive pan, zoom, and click-to-inspect architecture diagrams.',
  },
  {
    src: '/assets/images/dense-visualization.png',
    alt: 'CodeArchy Cytoscape dense graph visualization',
    label: 'Dense Graph View',
    desc: 'Cytoscape.js layout handles large, complex dependency networks effortlessly.',
  },
  {
    src: '/assets/images/system-visualization.png',
    alt: 'CodeArchy system visualization',
    label: 'System Visualization',
    desc: 'Full system map showing module relationships and architectural patterns.',
  },
  {
    src: '/assets/images/model-selection.png',
    alt: 'CodeArchy AI model selection panel',
    label: 'Model Selection',
    desc: 'Choose Gemma 4 variant based on your hardware — speed or depth.',
  },
]

export default function Screenshots() {
  const [active, setActive] = useState(0)

  return (
    <section className="screenshots" id="screenshots">
      <div className="container">
        <div className="section-header reveal">
          <span className="section-label">In Action</span>
          <h2 className="section-title">
            See It <span className="gradient-text">For Yourself</span>
          </h2>
          <div className="divider divider--center" />
          <p className="section-desc">
            From dense dependency graphs to conversational AI — explore every facet of CodeArchy.
          </p>
        </div>

        <div className="screenshots__viewer reveal">
          {/* Main display */}
          <div className="screenshots__display">
            <div className="screenshots__img-wrap">
              <div className="screenshots__glow" aria-hidden="true" />
              <img
                key={active}
                src={SCREENSHOTS[active].src}
                alt={SCREENSHOTS[active].alt}
                className="screenshots__img"
                loading="lazy"
              />
            </div>
            <div className="screenshots__caption">
              <span className="screenshots__caption-label">{SCREENSHOTS[active].label}</span>
              <p className="screenshots__caption-desc">{SCREENSHOTS[active].desc}</p>
            </div>
          </div>

          {/* Thumbnails */}
          <div className="screenshots__thumbs" role="tablist" aria-label="Screenshot gallery">
            {SCREENSHOTS.map((shot, i) => (
              <button
                key={shot.label}
                role="tab"
                aria-selected={i === active}
                aria-label={shot.label}
                className={`screenshots__thumb${i === active ? ' screenshots__thumb--active' : ''}`}
                onClick={() => setActive(i)}
              >
                <img src={shot.src} alt={shot.alt} loading="lazy" />
                <span className="screenshots__thumb-label">{shot.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
