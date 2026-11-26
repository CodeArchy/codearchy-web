import { LINKS } from '../../data/links'
import { AgentIcon, ArrowRight, GlobeIcon, VSCodeIcon } from '../icons'
import CopyCommand from './CopyCommand'

export default function GetStarted() {
  return (
    <section className="section" id="get-started">
      <div className="container">
        <div className="section-head section-head--center reveal">
          <p className="eyebrow">Get started</p>
          <h2>Use it where you already work</h2>
          <p>The same map in your editor, in your browser and for your AI agent. Free, with nothing to sign up for.</p>
        </div>
        <div className="start">
          <article className="start__card reveal">
            <span className="start__icon"><VSCodeIcon /></span>
            <h3>VS Code, Cursor and Windsurf</h3>
            <p>Install the extension, open a project and run <strong>CodeArchy: Show Architecture</strong>.</p>
            <div className="btn-row">
              <a className="btn btn--primary btn--small" href={LINKS.marketplace} target="_blank" rel="noopener noreferrer">VS Code Marketplace</a>
              <a className="btn btn--secondary btn--small" href={LINKS.openVsx} target="_blank" rel="noopener noreferrer">Open VSX</a>
            </div>
          </article>
          <article className="start__card reveal">
            <span className="start__icon"><GlobeIcon /></span>
            <h3>In your browser</h3>
            <p>Open a folder, a .zip or a public GitHub or GitLab repository. Everything runs in the tab; nothing is uploaded.</p>
            <div className="btn-row">
              <a className="btn btn--primary btn--small" href={LINKS.app} target="_blank" rel="noopener">Open the app</a>
            </div>
            <p className="start__note">For big repositories and live updates, run the Companion in your repository:</p>
            <CopyCommand command="npx codearchy serve --root ." />
          </article>
          <article className="start__card reveal">
            <span className="start__icon"><AgentIcon /></span>
            <h3>For your AI agent</h3>
            <p>Give Claude Code, Codex, Gemini CLI or Copilot your architecture map over MCP.</p>
            <CopyCommand command="claude mcp add codearchy -- npx -y codearchy mcp --root ." />
            <a className="start__link" href={LINKS.mcpGuide} target="_blank" rel="noopener noreferrer">
              Set up other agents <ArrowRight />
            </a>
          </article>
        </div>
      </div>
    </section>
  )
}
