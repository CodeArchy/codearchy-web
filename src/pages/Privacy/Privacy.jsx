import { useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft, faShieldHalved } from '@fortawesome/free-solid-svg-icons'
import './Privacy.css'

const LAST_UPDATED = '17 May 2026'
const CONTACT_EMAIL = 'https://github.com/iyinusa/codearchy/issues'
const GITHUB_REPO   = 'https://github.com/iyinusa/codearchy'

export default function Privacy() {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
    document.title = 'Privacy Policy — CodeArchy'
    return () => { document.title = 'CodeArchy' }
  }, [])

  const handleBack = (e) => {
    e.preventDefault()
    if (window.history.length > 1) {
      window.history.back()
    } else {
      window.location.href = '/'
    }
  }

  return (
    <div className="privacy-page">
      {/* Background dot grid matches global body::before */}
      <div className="privacy-bg" aria-hidden="true" />

      {/* Top nav */}
      <nav className="privacy-nav">
        <div className="container privacy-nav__inner">
          <a href="/" className="privacy-nav__logo" onClick={handleBack}>
            <img src="/assets/images/logo-white.png" alt="CodeArchy" width="26" height="26" />
            <span>CodeArchy</span>
          </a>
          <a href="/" className="privacy-back" onClick={handleBack}>
            <FontAwesomeIcon icon={faArrowLeft} />
            <span>Back to site</span>
          </a>
        </div>
      </nav>

      {/* Hero */}
      <header className="privacy-hero">
        <div className="container privacy-hero__inner">
          <div className="privacy-hero__icon" aria-hidden="true">
            <FontAwesomeIcon icon={faShieldHalved} />
          </div>
          <h1 className="privacy-hero__title">Privacy Policy</h1>
          <p className="privacy-hero__meta">Last updated: <strong>{LAST_UPDATED}</strong></p>
          <p className="privacy-hero__lead">
            CodeArchy is built on a single founding principle: <strong>your code is yours</strong>.
            This policy explains what information we collect, why, and exactly how we handle it —
            in plain language.
          </p>
        </div>
      </header>

      {/* Content */}
      <main className="privacy-content">
        <div className="container privacy-content__inner">

          {/* Quick summary */}
          <section className="pp-section pp-summary" aria-label="Summary">
            <div className="pp-summary__grid">
              <SummaryCard
                icon="🚫"
                title="No source code ever leaves your machine"
                body="The CodeArchy VS Code extension processes your codebase 100% locally using Tree-sitter and a locally-running Gemma 4 model via Ollama. No file, symbol, query, or AI response is sent to any external server."
              />
              <SummaryCard
                icon="🍪"
                title="This website uses only cookies you approve"
                body="The CodeArchy website may set analytics or marketing cookies only after you explicitly accept them via the cookie consent banner. Strictly necessary cookies are always active."
              />
              <SummaryCard
                icon="🔒"
                title="No account, no tracking by default"
                body="We do not require you to register an account. We do not fingerprint, track, or profile you without your consent."
              />
            </div>
          </section>

          <Section id="who-we-are" title="1. Who We Are">
            <p>
              CodeArchy is an open-source VS Code extension created and maintained by{' '}
              <strong>I. Kennedy Yinusa</strong> ("we", "us", "our"). The extension and its
              accompanying website (<em>this site</em>) are provided free of charge under the{' '}
              <a href={`${GITHUB_REPO}/blob/main/LICENSE`} target="_blank" rel="noopener noreferrer">
                MIT License
              </a>.
            </p>
            <p>
              For the purposes of EU/UK GDPR, the extension itself does not
              transmit any data to us and therefore does not involve us as a controller.
            </p>
          </Section>

          <Section id="extension-privacy" title="2. The VS Code Extension — Zero Data Collection">
            <p>
              The CodeArchy extension processes all data <strong>exclusively on your local machine</strong>.
              Specifically:
            </p>
            <ul>
              <li>
                <strong>Source code parsing</strong> — Tree-sitter builds an AST and dependency
                graph locally. No source file or parsed result is transmitted anywhere.
              </li>
              <li>
                <strong>AI inference</strong> — Your dependency graph is sent to a Gemma 4 model
                running via Ollama at <code>http://localhost:11434</code>. This is a loopback
                address — requests never leave your device.
              </li>
              <li>
                <strong>Conversational queries</strong> — Every question you ask in the AI chat
                panel is sent only to your local Ollama instance.
              </li>
              <li>
                <strong>Voice synthesis</strong> — Kokoro TTS runs inside a VS Code Webview Web
                Worker. No audio is transmitted; speech is generated on-device using locally-cached
                model weights.
              </li>
              <li>
                <strong>Telemetry</strong> — CodeArchy contains <strong>no telemetry, no
                analytics, and no crash reporting</strong> whatsoever. We have deliberately
                chosen not to include these.
              </li>
            </ul>
            <Callout>
              We have no technical ability to access your source code, your queries, or your AI
              responses. This is not a policy commitment alone — it is an architectural guarantee.
            </Callout>
          </Section>

          <Section id="website-data" title="3. Data Collected by This Website">
            <p>
              When you visit <strong>codearchy.com</strong> (or the domain on which this site is
              hosted) we may collect the following categories of information:
            </p>
            <Table
              headers={['Category', 'Examples', 'Legal basis', 'Default state']}
              rows={[
                ['Strictly necessary', 'Cookie consent preference (localStorage)', 'Legitimate interest / legal obligation', 'Always active'],
                ['Analytics', 'Page views, session duration, referrer, browser type', 'Consent (Art. 6(1)(a) GDPR)', 'Off — requires opt-in'],
                ['Marketing', 'Cross-site visit tracking for personalised ads', 'Consent (Art. 6(1)(a) GDPR)', 'Off — requires opt-in'],
              ]}
            />
            <p>
              We do <strong>not</strong> collect your name, email address, or any other directly
              identifying information unless you voluntarily provide it (e.g. by opening a GitHub
              issue).
            </p>
          </Section>

          <Section id="cookies" title="4. Cookies &amp; Local Storage">
            <p>
              A <strong>cookie</strong> is a small text file placed on your device. We also use
              browser <strong>localStorage</strong> for certain preferences.
            </p>

            <h3 className="pp-subheading">4.1 Strictly Necessary</h3>
            <CookieTable rows={[
              {
                name: 'codearchy_cookie_consent',
                type: 'localStorage',
                purpose: 'Stores your cookie preference (accepted categories + timestamp) so we do not show the consent banner on every visit.',
                duration: '1 year from consent',
                provider: 'First-party',
              },
            ]} />

            <h3 className="pp-subheading">4.2 Analytics (only if you consent)</h3>
            <p>
              If you accept analytics cookies, we may use a privacy-respecting analytics tool to
              understand aggregate site usage (e.g. which pages are most visited). No individual
              profile is built. Analytics data is anonymised or pseudonymised before storage.
            </p>

            <h3 className="pp-subheading">4.3 Marketing (only if you consent)</h3>
            <p>
              If you accept marketing cookies, third-party advertising partners may set cookies
              to show you relevant adverts on other websites. You can withdraw consent at any
              time by clearing your cookies or revisiting the consent panel.
            </p>

            <h3 className="pp-subheading">4.4 Managing your preferences</h3>
            <p>
              You can change or withdraw your cookie choices at any time by clearing the{' '}
              <code>codearchy_cookie_consent</code> key from your browser's localStorage (DevTools
              → Application → Local Storage) and refreshing the page. The consent banner will
              reappear.
            </p>
            <p>
              You can also manage cookies through your browser settings. Note that disabling
              all cookies may affect website functionality.
            </p>
          </Section>

          <Section id="third-parties" title="5. Third-Party Services">
            <p>
              This website may embed or link to third-party services. Each operates under its own
              privacy policy:
            </p>
            <ul>
              <li>
                <strong>GitHub</strong> (repository hosting, issue tracker) —{' '}
                <a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement" target="_blank" rel="noopener noreferrer">
                  GitHub Privacy Statement
                </a>
              </li>
              <li>
                <strong>VS Code Marketplace</strong> (extension distribution) —{' '}
                <a href="https://privacy.microsoft.com/en-us/privacystatement" target="_blank" rel="noopener noreferrer">
                  Microsoft Privacy Statement
                </a>
              </li>
              <li>
                <strong>Ollama</strong> (local model server, installed by users) —{' '}
                <a href="https://ollama.com/privacy" target="_blank" rel="noopener noreferrer">
                  Ollama Privacy Policy
                </a>
              </li>
            </ul>
            <p>
              We do not sell or share your personal data with third parties for their own
              commercial purposes.
            </p>
          </Section>

          <Section id="data-retention" title="6. Data Retention">
            <p>
              We retain personal data only for as long as necessary for the purposes described
              in this policy:
            </p>
            <ul>
              <li>
                <strong>Cookie consent preference</strong> — stored in your browser's localStorage
                for up to 1 year, then the banner is shown again.
              </li>
              <li>
                <strong>Analytics data</strong> (if consented) — retained for up to 26 months in
                aggregated, anonymised form.
              </li>
              <li>
                <strong>GitHub issue content</strong> — retained as long as the issue exists on
                GitHub, subject to GitHub's policies.
              </li>
            </ul>
          </Section>

          <Section id="your-rights" title="7. Your Rights Under GDPR">
            <p>
              If you are located in the European Economic Area (EEA), the United Kingdom, or
              another jurisdiction with equivalent data protection laws, you have the following
              rights regarding your personal data:
            </p>
            <div className="pp-rights-grid">
              <RightCard title="Right of access" body="Request a copy of the personal data we hold about you." />
              <RightCard title="Right to rectification" body="Ask us to correct inaccurate or incomplete data." />
              <RightCard title="Right to erasure" body="Request deletion of your personal data where there is no compelling reason for us to continue processing it." />
              <RightCard title="Right to restrict processing" body="Ask us to pause processing your data while a dispute is resolved." />
              <RightCard title="Right to data portability" body="Receive your data in a structured, machine-readable format." />
              <RightCard title="Right to object" body="Object to processing based on legitimate interests or for direct marketing." />
              <RightCard title="Right to withdraw consent" body="Where processing is based on consent, withdraw it at any time without affecting the lawfulness of prior processing." />
              <RightCard title="Right to lodge a complaint" body="File a complaint with your local supervisory authority (e.g. the ICO in the UK, or your national DPA in the EU)." />
            </div>
            <p>
              To exercise any of these rights, please{' '}
              <a href={CONTACT_EMAIL} target="_blank" rel="noopener noreferrer">open a GitHub issue</a>{' '}
              or contact us directly. We will respond within 30 days.
            </p>
          </Section>

          <Section id="children" title="8. Children's Privacy">
            <p>
              CodeArchy is not directed at children under 13 years of age (or under 16 in the
              EEA). We do not knowingly collect personal data from children. If you believe a
              child has provided us with personal data, please contact us and we will delete it
              promptly.
            </p>
          </Section>

          <Section id="security" title="9. Security">
            <p>
              We take reasonable technical and organisational measures to protect any personal
              data we hold. However, no method of transmission over the internet or electronic
              storage is 100% secure. We encourage you to use the latest version of your browser
              and to report any security concerns via our{' '}
              <a href={`${GITHUB_REPO}/security`} target="_blank" rel="noopener noreferrer">
                GitHub Security page
              </a>.
            </p>
            <p>
              Because the extension processes all data locally, there is no server-side attack
              surface for your source code or queries.
            </p>
          </Section>

          <Section id="changes" title="10. Changes to This Policy">
            <p>
              We may update this Privacy Policy from time to time to reflect changes in the law
              or our practices. When we make material changes, we will update the "Last updated"
              date at the top of this page. We encourage you to review this page periodically.
            </p>
            <p>
              Continued use of this website after changes are published constitutes your
              acceptance of the updated policy.
            </p>
          </Section>

          <Section id="contact" title="11. Contact Us">
            <p>
              If you have any questions, concerns, or requests regarding this Privacy Policy or
              your personal data, please reach out via one of the following channels:
            </p>
            <ul>
              <li>
                <strong>GitHub Issues:</strong>{' '}
                <a href={CONTACT_EMAIL} target="_blank" rel="noopener noreferrer">
                  github.com/iyinusa/codearchy/issues
                </a>
              </li>
              <li>
                <strong>GitHub Profile:</strong>{' '}
                <a href="https://github.com/iyinusa" target="_blank" rel="noopener noreferrer">
                  github.com/iyinusa
                </a>
              </li>
            </ul>
          </Section>

        </div>
      </main>

      {/* Footer */}
      <footer className="privacy-footer">
        <div className="container privacy-footer__inner">
          <p>
            © {new Date().getFullYear()} CodeArchy by{' '}
            <a href="https://github.com/iyinusa" target="_blank" rel="noopener noreferrer">
              I. Kennedy Yinusa
            </a>. Released under the{' '}
            <a href={`${GITHUB_REPO}/blob/main/LICENSE`} target="_blank" rel="noopener noreferrer">
              MIT License
            </a>.
          </p>
          <a href="/" className="privacy-footer__home" onClick={handleBack}>
            ← Back to CodeArchy
          </a>
        </div>
      </footer>
    </div>
  )
}

/* ─── Sub-components ─────────────────────────────────────────── */

function Section({ id, title, children }) {
  return (
    <section id={id} className="pp-section" aria-labelledby={`${id}-heading`}>
      <h2 className="pp-heading" id={`${id}-heading`}>{title}</h2>
      {children}
    </section>
  )
}

function SummaryCard({ icon, title, body }) {
  return (
    <div className="pp-summary-card">
      <div className="pp-summary-card__icon" aria-hidden="true">{icon}</div>
      <h3 className="pp-summary-card__title">{title}</h3>
      <p className="pp-summary-card__body">{body}</p>
    </div>
  )
}

function Callout({ children }) {
  return (
    <div className="pp-callout" role="note">
      <span className="pp-callout__icon" aria-hidden="true">🔒</span>
      <p>{children}</p>
    </div>
  )
}

function Table({ headers, rows }) {
  return (
    <div className="pp-table-wrap" role="region" aria-label="Data collection table">
      <table className="pp-table">
        <thead>
          <tr>{headers.map((h) => <th key={h}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function CookieTable({ rows }) {
  return (
    <div className="pp-table-wrap" role="region" aria-label="Cookie details table">
      <table className="pp-table pp-cookie-table">
        <thead>
          <tr>
            <th>Name / Key</th>
            <th>Type</th>
            <th>Purpose</th>
            <th>Duration</th>
            <th>Provider</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td><code>{r.name}</code></td>
              <td>{r.type}</td>
              <td>{r.purpose}</td>
              <td>{r.duration}</td>
              <td>{r.provider}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function RightCard({ title, body }) {
  return (
    <div className="pp-right-card">
      <h4 className="pp-right-card__title">{title}</h4>
      <p className="pp-right-card__body">{body}</p>
    </div>
  )
}
