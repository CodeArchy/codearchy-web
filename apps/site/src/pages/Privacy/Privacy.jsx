import { useEffect, useState } from 'react'
import { CpuIcon, GlobeIcon, ShieldIcon, SlidersIcon } from '../../components/icons'
import { openCookieSettings } from '../../lib/consent'
import { LINKS } from '../../data/links'
import './Privacy.css'

const LAST_UPDATED = '26 November 2026'
/** A private address for data requests. Leave empty to point people to GitHub only. */
const PRIVACY_EMAIL = ''

const SECTIONS = [
  ['who', 'Who we are'],
  ['code', 'Your code'],
  ['ai', 'AI features'],
  ['voice', 'The voice'],
  ['website', 'This website'],
  ['cookies', 'Cookies and storage'],
  ['sharing', 'Who else is involved'],
  ['rights', 'Your rights'],
  ['other', 'Children, security, changes'],
  ['contact', 'Contact'],
]

const SUMMARY = [
  [CpuIcon, 'Your code stays on your machine', 'CodeArchy reads your code on your computer or in your browser tab. We never receive your code, your questions or your API keys.'],
  [SlidersIcon, 'AI is off until you turn it on', 'When you do, requests go straight from your device to the provider you pick, and you choose how much they see.'],
  [GlobeIcon, 'Analytics only with your yes', 'This website uses Google Analytics only if you accept. Fonts, images and videos come from our own server.'],
  [ShieldIcon, 'No accounts, no ads', 'There is nothing to sign up for. We don’t sell data, show ads or build profiles.'],
]

export default function Privacy() {
  useEffect(() => {
    document.title = 'Privacy policy · CodeArchy'
    // The page renders after load, so jump to a #section ourselves.
    const target = window.location.hash && document.getElementById(window.location.hash.slice(1))
    if (target) target.scrollIntoView()
    else window.scrollTo(0, 0)
    return () => {
      document.title = 'CodeArchy: see how your codebase is built'
    }
  }, [])
  const active = useActiveSection()

  return (
    <main className="policy">
      <header className="policy__head">
        <div className="container">
          <p className="eyebrow">Privacy</p>
          <h1>Privacy policy</h1>
          <p className="lead">
            What CodeArchy does with your code and your data, in plain words. It covers this website, the web app at
            app.codearchy.com, the VS Code extension and the <code>codearchy</code> command-line tool.
          </p>
          <p className="policy__date">Last updated {LAST_UPDATED}</p>
        </div>
      </header>

      <div className="container">
        <section className="policy__summary" aria-label="In short">
          {SUMMARY.map(([Icon, title, text]) => (
            <div key={title} className="policy__point">
              <span className="policy__icon" aria-hidden="true">
                <Icon />
              </span>
              <h2>{title}</h2>
              <p>{text}</p>
            </div>
          ))}
        </section>

        <div className="policy__layout">
          <nav className="policy__toc" aria-label="On this page">
            <p>On this page</p>
            <ol>
              {SECTIONS.map(([id, label]) => (
                <li key={id}>
                  <a href={`#${id}`} className={active === id ? 'is-active' : undefined}>
                    {label}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <article className="policy__body">
            <Section id="who" title="Who we are">
              <p>
                CodeArchy is free, open-source software under the <a href={LINKS.license}>MIT license</a>, made and
                maintained by I. Kennedy Yinusa (&ldquo;we&rdquo;, &ldquo;us&rdquo;). For this website we are the
                data controller under the EU and UK General Data Protection Regulation (GDPR).
              </p>
              <p>
                The extension, the web app and the command-line tool run on your device. They don&rsquo;t send us
                anything, so for what they do with your code we hold no data and are not a controller.
              </p>
            </Section>

            <Section id="code" title="Your code">
              <p>Everything CodeArchy shows you is worked out on your device:</p>
              <Table
                head={['What happens', 'Where it happens']}
                rows={[
                  ['Reading code and drawing the map, lenses, flows and tours', 'On your computer (extension, CLI) or inside your browser tab (web app), with tree-sitter. Nothing is uploaded.'],
                  ['Opening a public repository by URL in the web app', 'Your browser downloads the files straight from GitHub or GitLab, without any credentials. They see the request as they would any visit.'],
                  ['Ownership and AI authorship', 'Read from your local git history (git blame and commit metadata). Names and email addresses stay on your device and are never sent to an AI model.'],
                  ['Sharing authorship with your team (optional)', 'Stored as git notes that you push to your own git remote, like any commit.'],
                  ['The Companion (codearchy serve)', 'A server on your computer that only listens on 127.0.0.1, so only your own browser can reach it.'],
                  ['The MCP server (codearchy mcp)', 'Talks to the AI agent you connect, on your computer. That agent then sends what it reads to its own provider under its own terms.'],
                  ['Settings, saved tours and API keys', 'Kept on your device. The extension keeps keys in your operating system’s keychain (VS Code SecretStorage); the web app encrypts them in your browser’s storage.'],
                ]}
              />
              <p>
                None of the extension, the web app or the CLI contains telemetry, analytics or crash reporting. We have
                no way to see your code, your questions or the answers you get.
              </p>
            </Section>

            <Section id="ai" title="AI features">
              <p>
                AI is optional. It starts at <strong>Local only</strong>, where nothing leaves your device. If you turn
                it on, you pick where requests go:
              </p>
              <ul>
                <li>
                  <strong>A model on your machine</strong>, with Ollama or LM Studio. Requests stay on your computer.
                </li>
                <li>
                  <strong>GitHub Copilot</strong>, through VS Code, under your Copilot plan and GitHub&rsquo;s terms.
                </li>
                <li>
                  <strong>Your own API key</strong> for Anthropic, OpenAI, Google Gemini, OpenRouter, Groq or Mistral.
                  Requests go directly from your device to that provider. They never pass through us.
                </li>
              </ul>
              <p>You decide how much a cloud model sees:</p>
              <ul>
                <li>
                  <strong>Structure</strong>: names of folders, files and symbols, and how they connect.
                </li>
                <li>
                  <strong>Code excerpts</strong>: the structure plus short pieces of source code.
                </li>
              </ul>
              <p>
                Before anything is sent, secrets such as keys and tokens are detected and removed. You can preview each
                request and set daily or monthly limits. The provider handles what it receives under its own privacy
                policy and your agreement with it; for that processing you, or your organisation, are the controller.
              </p>
            </Section>

            <Section id="voice" title="The voice">
              <p>
                Tours and answers can be read aloud by a neural voice (Kokoro) that runs on your device, or by your
                system&rsquo;s own voice. The text is never sent anywhere. The voice model is downloaded once and then
                kept on your device: the web app gets it from app.codearchy.com, and the VS Code extension gets it from
                Hugging Face, which sees that download like any other.
              </p>
            </Section>

            <Section id="website" title="This website">
              <h3>Server logs</h3>
              <p>
                Like any web server, ours records each request: IP address, time, the page asked for, the referring
                page and your browser&rsquo;s user agent. We use these logs only to keep the sites running and secure
                (legitimate interest), we don&rsquo;t use them to track or profile anyone, and they are normally kept
                for no more than 30 days.
              </p>
              <h3>Google Analytics, only if you accept</h3>
              <p>
                If you click Accept, we use Google Analytics 4 to see which pages are read and where visitors come
                from. It records pages visited, the referring site, approximate location (country and city), device,
                browser and screen size. Google Analytics 4 doesn&rsquo;t log or store IP addresses. We turn off Google
                signals and ad personalisation, and we don&rsquo;t combine this with anything else.
              </p>
              <p>
                Until you accept, the Google Analytics script isn&rsquo;t loaded at all, so nothing is sent to Google.
                Analytics data is kept for up to 14 months. The service is provided by Google Ireland Limited; data
                may be processed by Google LLC in the United States under the EU&ndash;US Data Privacy Framework and
                the European Commission&rsquo;s standard contractual clauses.
              </p>
              <h3>The web app</h3>
              <p>app.codearchy.com has no analytics, no cookies and no third-party scripts.</p>
            </Section>

            <Section id="cookies" title="Cookies and storage">
              <p>
                Analytics is the only optional category, and you can change your answer at any time. Turning it off
                stops it straight away and deletes its cookies.
              </p>
              <button type="button" className="btn btn--secondary btn--small policy__cookie-btn" onClick={openCookieSettings}>
                Cookie settings
              </button>
              <Table
                head={['Name', 'Kind', 'What it’s for', 'How long']}
                rows={[
                  [<code key="c">codearchy_cookie_consent</code>, 'Necessary, browser storage', 'Remembers your cookie choice', '12 months, then we ask again'],
                  [<code key="t">codearchy.site.theme</code>, 'Necessary, browser storage', 'Your light or dark theme, if you pick one', 'Until you clear it'],
                  [<code key="g">_ga</code>, 'Analytics cookie (only with consent)', 'Google Analytics: tells visits apart', '13 months'],
                  [<code key="s">_ga_REPDR6673K</code>, 'Analytics cookie (only with consent)', 'Google Analytics: keeps the current visit together', '13 months'],
                  ['Web app storage', 'Necessary, on your device (app.codearchy.com)', 'Settings, encrypted API keys, saved tours, offline files and the voice model', 'Until you clear the site’s data'],
                ]}
              />
              <p>
                If your browser sends Global Privacy Control, we treat it as a no and don&rsquo;t ask. You can still
                allow analytics from Cookie settings.
              </p>
            </Section>

            <Section id="sharing" title="Who else is involved">
              <p>
                We don&rsquo;t sell or share personal data. For this website we use two processors: our hosting
                provider, which runs the server, and Google, for analytics if you allow it.
              </p>
              <p>
                Other services are ones you choose to use, under their own privacy policies:{' '}
                <Ext href="https://docs.github.com/site-policy/privacy-policies/github-general-privacy-statement">GitHub</Ext>,{' '}
                <Ext href="https://about.gitlab.com/privacy/">GitLab</Ext>,{' '}
                <Ext href="https://privacy.microsoft.com/privacystatement">Microsoft</Ext> (VS Code Marketplace),{' '}
                <Ext href="https://www.eclipse.org/legal/privacy/">Eclipse Foundation</Ext> (Open VSX),{' '}
                <Ext href="https://docs.npmjs.com/policies/privacy">npm</Ext>,{' '}
                <Ext href="https://huggingface.co/privacy">Hugging Face</Ext>, and the AI provider you choose:{' '}
                <Ext href="https://www.anthropic.com/legal/privacy">Anthropic</Ext>,{' '}
                <Ext href="https://openai.com/policies/privacy-policy/">OpenAI</Ext>,{' '}
                <Ext href="https://ai.google.dev/gemini-api/terms">Google Gemini</Ext>,{' '}
                <Ext href="https://openrouter.ai/privacy">OpenRouter</Ext>,{' '}
                <Ext href="https://groq.com/privacy-policy/">Groq</Ext> or{' '}
                <Ext href="https://mistral.ai/terms#privacy-policy">Mistral</Ext>.
              </p>
            </Section>

            <Section id="rights" title="Your rights">
              <p>Under the GDPR and the UK GDPR you can:</p>
              <ul className="policy__rights">
                <li>ask for a copy of the personal data we hold about you</li>
                <li>have it corrected or deleted</li>
                <li>restrict or object to how we use it</li>
                <li>receive it in a portable format</li>
                <li>withdraw consent at any time, as easily as you gave it</li>
                <li>complain to a supervisory authority</li>
              </ul>
              <p>
                We have no accounts, so we usually hold nothing that identifies you. If we can&rsquo;t find data about
                you, we&rsquo;ll tell you. We reply within one month. To complain, contact the data protection
                authority where you live (
                <Ext href="https://www.edpb.europa.eu/about-edpb/about-edpb/members_en">list of EU authorities</Ext>
                ) or, in the UK, the <Ext href="https://ico.org.uk/make-a-complaint/">ICO</Ext>.
              </p>
            </Section>

            <Section id="other" title="Children, security, changes">
              <p>
                <strong>Children.</strong> CodeArchy is a tool for software engineers and isn&rsquo;t aimed at
                children under 16. We don&rsquo;t knowingly collect their data.
              </p>
              <p>
                <strong>Security.</strong> The sites are served over HTTPS, and the web app runs under a strict
                content security policy that allows no third-party scripts. Please report vulnerabilities privately
                through <Ext href={`${LINKS.github}/security`}>GitHub security advisories</Ext>.
              </p>
              <p>
                <strong>Changes.</strong> When this policy changes, we update the date at the top and record the change
                in the project&rsquo;s history on GitHub. If a change affects what you agreed to, we ask again.
              </p>
            </Section>

            <Section id="contact" title="Contact">
              <p>
                For questions about this policy, open an issue at{' '}
                <Ext href={LINKS.issues}>github.com/CodeArchy/codearchy/issues</Ext>.{' '}
                {PRIVACY_EMAIL ? (
                  <>
                    For a request about your own data, email <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>.
                  </>
                ) : (
                  <>Issues are public, so for a request about your own data, open one asking for a private channel and leave out any personal details.</>
                )}
              </p>
            </Section>
          </article>
        </div>
      </div>
    </main>
  )
}

function Section({ id, title, children }) {
  return (
    <section id={id} className="policy__section">
      <h2>{title}</h2>
      {children}
    </section>
  )
}

function Table({ head, rows }) {
  return (
    <div className="policy__table">
      <table>
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h} scope="col">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (j === 0 ? <th key={j} scope="row">{cell}</th> : <td key={j}>{cell}</td>))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Ext({ href, children }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  )
}

/** The section currently being read, for the contents list. */
function useActiveSection() {
  const [active, setActive] = useState(SECTIONS[0][0])
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActive(visible[0].target.id)
      },
      { rootMargin: '-80px 0px -65% 0px' }
    )
    SECTIONS.forEach(([id]) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [])
  return active
}
