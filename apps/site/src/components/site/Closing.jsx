import { LINKS } from '../../data/links'
import { GitHubIcon, VSCodeIcon } from '../icons'

export default function Closing() {
  return (
    <section className="section closing" id="open-source">
      <div className="container closing__inner reveal">
        <h2>Map your codebase in a minute</h2>
        <p className="lead">Free and open source under the MIT license. TypeScript, JavaScript, Python, Java, Kotlin, Go, Rust, C#, PHP and Ruby.</p>
        <div className="btn-row closing__actions">
          <a className="btn btn--primary" href={LINKS.marketplace} target="_blank" rel="noopener noreferrer">
            <VSCodeIcon />
            Install for VS Code
          </a>
          <a className="btn btn--secondary" href={LINKS.github} target="_blank" rel="noopener noreferrer">
            <GitHubIcon />
            Star on GitHub
          </a>
        </div>
      </div>
    </section>
  )
}
