import Clip from './Clip'

const FEATURES = [
  {
    id: 'map',
    eyebrow: 'Map',
    title: 'The architecture, drawn from the code',
    body: 'Packages, components, files and symbols on one canvas. Expand any part where it is, and click it to see what it uses and what uses it. It’s parsed on your machine in seconds, with no AI and no setup.',
    points: ['10 languages, with each ecosystem’s imports resolved', 'Health and Tests lenses for cycles, hubs and untested code', 'A dependency matrix that makes layering problems obvious'],
  },
  {
    id: 'ownership',
    eyebrow: 'Ownership',
    title: 'Who owns each part',
    body: 'From git blame: each part’s owners, their share of today’s lines and when they last changed it. CodeArchy flags the parts where one person holds most of the code, so knowledge risk is visible before it becomes a problem.',
    points: ['The bus factor for every part', 'Bots and uncommitted lines left out, .mailmap respected', 'Names stay on your machine and never go to an AI model'],
  },
  {
    id: 'authorship',
    eyebrow: 'AI authorship',
    title: 'How much of it AI wrote',
    body: 'From the evidence AI tools leave in git: Co-authored-by trailers, coding-agent commits and tool markers. See the share for every part, by tool and over time, and put a branch report in your pull request.',
    points: ['Claude Code, Copilot, Cursor, Codex and more', 'In the editor: AI-written lines in the gutter, and Mark as reviewed', 'Shared with your team through git notes'],
  },
  {
    id: 'flows',
    eyebrow: 'Flows',
    title: 'How every request flows',
    body: 'Pick an HTTP route, a job or a command and follow it call by call, across the parts it passes through, down to the databases, caches, queues and APIs it reaches.',
    points: ['Express, NestJS, FastAPI, Django, Spring, Rails, Laravel and more', 'Follows calls across a monorepo’s packages', 'Walk through any flow as a tour'],
  },
  {
    id: 'tours',
    eyebrow: 'Tours',
    title: 'A guided start for new engineers',
    body: 'Start Here is generated for every repository: the big picture, where things start, the core and the data layer. Write your own tours and keep them in git, reviewed like code.',
    points: ['Narrated, with a voice that runs on your machine', 'Progress you can pick up later', 'Ask about any step'],
  },
]

export default function Features() {
  return (
    <section className="section" id="features">
      <div className="container">
        <div className="section-head reveal">
          <p className="eyebrow">What it shows you</p>
          <h2>Answers to the questions every team asks about its code</h2>
          <p>How is it put together? Who knows this part? How much did AI write? What happens when a request comes in? Where should a new engineer start?</p>
        </div>
        <div className="features">
          {FEATURES.map((f, i) => (
            <article className={`feature reveal${i % 2 ? ' feature--flip' : ''}`} key={f.id} id={`feature-${f.id}`}>
              <div className="feature__copy">
                <p className="eyebrow">{f.eyebrow}</p>
                <h3>{f.title}</h3>
                <p className="feature__body">{f.body}</p>
                <ul className="feature__points">
                  {f.points.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </div>
              <Clip id={f.id} label={`${f.eyebrow} in CodeArchy`} />
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
