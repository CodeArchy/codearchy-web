import { LINKS } from '../../data/links'
import { Logo } from './Logo'
import { openCookieSettings } from '../../lib/consent'

const COLUMNS = [
  { title: 'Product', links: [['VS Code Marketplace', LINKS.marketplace], ['Open VSX', LINKS.openVsx], ['Web app', LINKS.app], ['CLI on npm', LINKS.npm]] },
  { title: 'Guides', links: [['MCP for your agent', LINKS.mcpGuide], ['The Companion', LINKS.companionGuide], ['Authorship', LINKS.authorshipGuide], ['Changelog', LINKS.changelog]] },
  { title: 'Project', links: [['GitHub', LINKS.github], ['Issues', LINKS.issues], ['MIT license', LINKS.license], ['Privacy policy', '/privacy']] },
]

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container site-footer__inner">
        <div className="site-footer__brand">
          <a href="/" className="site-brand">
            <Logo size={24} />
            <span>CodeArchy</span>
          </a>
          <p>See how your codebase is built.</p>
        </div>
        {COLUMNS.map((c) => (
          <nav key={c.title} aria-label={c.title}>
            <h4>{c.title}</h4>
            <ul>
              {c.links.map(([label, href]) => (
                <li key={label}>
                  <a href={href} {...(href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
                    {label}
                  </a>
                </li>
              ))}
              {c.title === 'Project' && (
                <li>
                  <button type="button" className="site-footer__link-btn" onClick={openCookieSettings}>
                    Cookie settings
                  </button>
                </li>
              )}
            </ul>
          </nav>
        ))}
      </div>
      <div className="container">
        <div className="site-footer__base">© {new Date().getFullYear()} CodeArchy · Open source under the MIT license</div>
      </div>
    </footer>
  )
}
