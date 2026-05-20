import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faRocket } from '@fortawesome/free-solid-svg-icons'
import './Install.css'

const PREREQS = [
  {
    num: '1',
    title: 'Install Ollama',
    desc: 'Download Ollama from ollama.com and run it locally. Handles all AI inference on your machine.',
    code: '# Verify installation\nollama --version',
    link: 'https://ollama.com/',
    linkLabel: 'ollama.com →',
  },
  {
    num: '2',
    title: 'Pull a Gemma 4 Model',
    desc: 'Choose a variant based on your hardware. The e2b model is recommended to start.',
    code: '# Recommended — fast on most machines\nollama pull gemma4:e2b\n\n# Deeper reasoning\nollama pull gemma4:e4b',
  },
  {
    num: '3',
    title: 'Install CodeArchy',
    desc: 'Install the extension from the VS Code Marketplace with one click.',
    code: '# Or from VS Code command palette:\next install iyinusa.codearchy',
    link: 'https://marketplace.visualstudio.com/items?itemName=iyinusa.codearchy',
    linkLabel: 'Open Marketplace →',
  },
]

export default function Install() {
  return (
    <section className="install" id="install">
      {/* Background accent */}
      <div className="install__bg" aria-hidden="true" />

      <div className="container">
        <div className="section-header reveal">
          <span className="section-label">Get Started</span>
          <h2 className="section-title">
            Up and Running in <span className="gradient-text">3 Steps</span>
          </h2>
          <div className="divider divider--center" />
          <p className="section-desc">
            No API keys. No cloud accounts. No subscriptions. Just install Ollama, pull a model, and go.
          </p>
        </div>

        <div className="install__steps">
          {PREREQS.map((step, i) => (
            <div key={step.num} className={`install__step reveal reveal-delay-${i + 1}`}>
              <div className="install__step-header">
                <div className="install__step-num">{step.num}</div>
                <div>
                  <h3 className="install__step-title">{step.title}</h3>
                  <p className="install__step-desc">{step.desc}</p>
                </div>
              </div>
              <pre className="code-block install__code">{step.code}</pre>
              {step.link && (
                <a
                  href={step.link}
                  className="install__link"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {step.linkLabel}
                </a>
              )}
            </div>
          ))}
        </div>

        {/* Quick start note */}
        <div className="install__quickstart reveal">
          <div className="install__quickstart-inner">
            <span className="install__quickstart-icon"><FontAwesomeIcon icon={faRocket} /></span>
            <div>
              <h3 className="install__quickstart-title">Quick Start</h3>
              <p className="install__quickstart-desc">
                Open any project in VS Code → click the <strong>CodeArchy icon</strong> in the
                Activity Bar or run <code>CodeArchy: Show Architecture</code> from the Command
                Palette (<kbd>⌘⇧P</kbd> / <kbd>Ctrl+Shift+P</kbd>).
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="install__cta reveal">
          <a
            href="https://marketplace.visualstudio.com/items?itemName=iyinusa.codearchy"
            className="btn btn--primary btn--lg"
            target="_blank"
            rel="noopener noreferrer"
          >
            Install on VS Code Marketplace
          </a>
          <a
            href="https://github.com/iyinusa/codearchy"
            className="btn btn--outline btn--lg"
            target="_blank"
            rel="noopener noreferrer"
          >
            Read the Docs
          </a>
        </div>
      </div>
    </section>
  )
}
