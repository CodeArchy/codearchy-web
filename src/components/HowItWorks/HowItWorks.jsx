import './HowItWorks.css'

const STEPS = [
  {
    num: '01',
    title: 'Parse',
    desc: 'Tree-sitter incrementally builds an AST for every file. Updates only what changed on each save.',
    color: 'purple',
  },
  {
    num: '02',
    title: 'Extract',
    desc: 'Symbols, imports, exports, and call relationships are extracted into a typed dependency graph.',
    color: 'blue',
  },
  {
    num: '03',
    title: 'Abstract',
    desc: 'The graph (not raw source) is sent to Gemma 4 via Ollama. The model acts as a software architect.',
    color: 'purple',
  },
  {
    num: '04',
    title: 'Render',
    desc: 'Structured response is parsed into ArchitectureNode and ArchitectureEdge objects and rendered in React Flow.',
    color: 'blue',
  },
  {
    num: '05',
    title: 'Converse',
    desc: 'Every follow-up question is answered by Gemma 4 with full architectural context maintained across turns.',
    color: 'green',
  },
  {
    num: '06',
    title: 'Narrate',
    desc: 'Kokoro neural TTS runs in a background Web Worker and streams synthesised speech for audio playback.',
    color: 'green',
  },
]

export default function HowItWorks() {
  return (
    <section className="how-it-works" id="how-it-works">
      <div className="container">
        <div className="section-header reveal">
          <span className="section-label">The Pipeline</span>
          <h2 className="section-title">
            How <span className="gradient-text">CodeArchy</span> Works
          </h2>
          <div className="divider divider--center" />
          <p className="section-desc">
            A 6-stage AI pipeline transforms raw source files into an interactive,
            conversational architecture experience — entirely on your machine.
          </p>
        </div>

        <div className="hiw__pipeline">
          {/* Visual connector line */}
          <div className="hiw__line" aria-hidden="true" />

          <div className="hiw__steps">
            {STEPS.map((step, i) => (
              <div
                key={step.num}
                className={`hiw__step reveal reveal-delay-${(i % 3) + 1}`}
              >
                <div className={`hiw__step-num hiw__step-num--${step.color}`}>
                  {step.num}
                </div>
                <div className="hiw__step-content">
                  <h3 className="hiw__step-title">{step.title}</h3>
                  <p className="hiw__step-desc">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Architecture box */}
        <div className="hiw__arch reveal">
          <div className="hiw__arch-inner">
            <div className="hiw__arch-node hiw__arch-node--top">
              Your Codebase
            </div>
            <div className="hiw__arch-flow">
              <div className="hiw__arch-tag">Tree-sitter AST Parser</div>
              <div className="hiw__arch-arrow" aria-hidden="true">↓</div>
              <div className="hiw__arch-tag">Symbol &amp; Dependency Extractor</div>
              <div className="hiw__arch-arrow" aria-hidden="true">↓</div>
              <div className="hiw__arch-tag">Graph Builder</div>
              <div className="hiw__arch-arrow" aria-hidden="true">↓</div>
              <div className="hiw__arch-ai">
                <span className="hiw__arch-ai-badge">Local · Private</span>
                Gemma 4 via Ollama
              </div>
              <div className="hiw__arch-arrow" aria-hidden="true">↓</div>
              <div className="hiw__arch-node hiw__arch-node--bottom">
                Interactive Diagram + AI Chat + Voice I/O
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
