import { AgentIcon, BranchIcon, ChatIcon, CodeIcon, LayersIcon, VoiceIcon } from '../icons'

const MORE = [
  { icon: ChatIcon, title: 'Ask, with sources', body: 'Questions answered from the map, citing the files and lines they rely on. Answers can be read aloud while the map follows along.' },
  { icon: LayersIcon, title: 'The architecture diagram', body: 'Layers, services and the external systems they reach, built from the code. Design with AI names the subsystems.' },
  { icon: BranchIcon, title: 'Branch reports', body: 'What a branch adds, who wrote it and the dependencies it introduces, as Markdown ready for your pull request.' },
  { icon: AgentIcon, title: 'For your AI agent', body: 'npx codearchy mcp gives Claude Code, Codex, Gemini CLI and Copilot the map, so they answer from the structure, not guesses.' },
  { icon: CodeIcon, title: 'In your editor', body: 'A CodeLens and the status bar show where each file sits. Reveal it on the map from the editor or the Explorer.' },
  { icon: VoiceIcon, title: 'Read aloud', body: 'Tours and answers narrated by a neural voice that runs on your machine, or by your system’s voice.' },
]

export default function More() {
  return (
    <section className="section section--soft" id="more">
      <div className="container">
        <div className="section-head reveal">
          <p className="eyebrow">And more</p>
          <h2>Built for how teams work</h2>
        </div>
        <div className="more">
          {MORE.map(({ icon: Icon, title, body }) => (
            <div className="more__item reveal" key={title}>
              <span className="more__icon">
                <Icon />
              </span>
              <h3>{title}</h3>
              <p>{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
