import { LINKS } from '../../data/links'
import { VSCodeIcon, GlobeIcon } from '../icons'
import DemoPlayer from './DemoPlayer'

export default function Hero() {
  return (
    <section className="hero" id="top">
      <div className="container">
        <div className="hero__copy">
          <p className="eyebrow">Free and open source · VS Code, browser and CLI</p>
          <h1>See how your codebase is built.</h1>
          <p className="lead hero__lead">
            CodeArchy maps any repository into an architecture you can explore: what depends on what, how each request flows, who owns each part, and how much of it AI wrote. It runs on your machine.
          </p>
          <div className="btn-row hero__actions">
            <a className="btn btn--primary" href={LINKS.marketplace} target="_blank" rel="noopener noreferrer">
              <VSCodeIcon />
              Install for VS Code
            </a>
            <a className="btn btn--secondary" href={LINKS.app} target="_blank" rel="noopener">
              <GlobeIcon />
              Open in the browser
            </a>
          </div>
          <p className="hero__also">
            Also for Cursor and Windsurf on <a href={LINKS.openVsx} target="_blank" rel="noopener noreferrer">Open VSX</a>, and on the command line with <a href={LINKS.npm} target="_blank" rel="noopener noreferrer"><code>npx codearchy</code></a>.
          </p>
        </div>
        <DemoPlayer />
      </div>
    </section>
  )
}
