import { useEffect, useState } from 'react'
import Header from './components/site/Header'
import Hero from './components/site/Hero'
import Features from './components/site/Features'
import More from './components/site/More'
import GetStarted from './components/site/GetStarted'
import PrivateByDefault from './components/site/Privacy'
import Closing from './components/site/Closing'
import Footer from './components/site/Footer'
import CookieConsent from './components/CookieConsent/CookieConsent'
import Privacy from './pages/Privacy/Privacy'
import { useTheme } from './lib/theme'
import './components/site/site.css'

/** Minimal client-side router: the home page and /privacy. */
function usePage() {
  const getPath = () => window.location.pathname.replace(/\/$/, '') || '/'
  const [path, setPath] = useState(getPath)
  useEffect(() => {
    const handler = () => setPath(getPath())
    window.addEventListener('popstate', handler)
    return () => window.removeEventListener('popstate', handler)
  }, [])
  return path
}

export default function App() {
  const page = usePage()
  const { theme, toggle } = useTheme()

  // Sections fade in once as they come into view.
  useEffect(() => {
    if (page !== '/') return
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('visible')
            observer.unobserve(e.target)
          }
        }),
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    )
    document.querySelectorAll('.reveal').forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [page])

  if (page === '/privacy') {
    return (
      <>
        <Header theme={theme} onToggleTheme={toggle} />
        <Privacy />
        <Footer />
        <CookieConsent />
      </>
    )
  }

  return (
    <>
      <Header theme={theme} onToggleTheme={toggle} />
      <main>
        <Hero />
        <Features />
        <More />
        <GetStarted />
        <PrivateByDefault />
        <Closing />
      </main>
      <Footer />
      <CookieConsent />
    </>
  )
}
