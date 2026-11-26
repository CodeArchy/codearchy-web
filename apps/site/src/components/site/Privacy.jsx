import { CpuIcon, ShieldIcon, SlidersIcon } from '../icons'

const POINTS = [
  { icon: CpuIcon, title: 'Parsed on your machine', body: 'Your code is read with tree-sitter on your computer, or in your browser tab. The map, lenses, flows and tours need no network and no account.' },
  { icon: SlidersIcon, title: 'AI is optional, and your choice', body: 'Use a model on your machine (Ollama or LM Studio), your GitHub Copilot plan, or your own key for Anthropic, OpenAI, Gemini, OpenRouter, Groq or Mistral.' },
  { icon: ShieldIcon, title: 'You decide what leaves', body: 'Local only is the default. Allow structure, or code excerpts, when you want to. Secrets are removed first, you can review each request, and you can cap daily usage.' },
]

export default function Privacy() {
  return (
    <section className="section section--soft" id="privacy">
      <div className="container">
        <div className="section-head reveal">
          <p className="eyebrow">Private by default</p>
          <h2>Your code stays yours</h2>
        </div>
        <div className="privacy-points">
          {POINTS.map(({ icon: Icon, title, body }) => (
            <div className="privacy-point reveal" key={title}>
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
