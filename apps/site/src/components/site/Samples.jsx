import { LINKS } from '../../data/links'
import DATA from '../../data/samples.json'

/** Famous open-source projects, each one click from its architecture in the web app. */
export default function Samples() {
  return (
    <section className="section" id="samples">
      <div className="container">
        <div className="section-head section-head--center reveal">
          <p className="eyebrow">Try it now</p>
          <h2>Explore a codebase you already know</h2>
          <p>
            Pick a famous project and see how it’s built, right in your browser. Nothing to install, and nothing is uploaded: the app downloads the code from GitHub into your tab.
          </p>
        </div>
        <ul className="samples reveal">
          {DATA.samples.filter((s) => s.site !== false).map((s) => (
            <li key={s.repo}>
              <a
                className="sample"
                href={`${LINKS.app}/?repo=${s.repo}`}
                target="_blank"
                rel="noopener"
                style={s.logo.color ? { '--brand': s.logo.color } : undefined}
                title={`${s.repo}: ${s.blurb} (${s.files.toLocaleString('en')} files)`}
              >
                <span className="sample__logo" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="22" height="22" focusable="false">
                    <path d={s.logo.path} fill="currentColor" />
                  </svg>
                </span>
                <span className="sample__text">
                  <strong>{s.name}</strong>
                  <span>{s.language}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
        <p className="samples__note">
          Or open any public repository at <a href={LINKS.app} target="_blank" rel="noopener">app.codearchy.com</a>.
        </p>
      </div>
    </section>
  )
}
