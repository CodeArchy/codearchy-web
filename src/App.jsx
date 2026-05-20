import { useState, useEffect } from 'react'
import Header from './components/Header/Header'
import Hero from './components/Hero/Hero'
import Features from './components/Features/Features'
import HowItWorks from './components/HowItWorks/HowItWorks'
import Screenshots from './components/Screenshots/Screenshots'
import Install from './components/Install/Install'
import Roadmap from './components/Roadmap/Roadmap'
import Footer from './components/Footer/Footer'
import CookieConsent from './components/CookieConsent/CookieConsent'
import Privacy from './pages/Privacy/Privacy'

/** Minimal client-side router — no library required */
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

  // Scroll-reveal observer (home page only)
  useEffect(() => {
    if (page !== '/') return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible')
          }
        })
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    )

    const elements = document.querySelectorAll('.reveal')
    elements.forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  }, [page])

  if (page === '/privacy') {
    return <Privacy />
  }

  return (
    <>
      <Header />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <Screenshots />
        <Install />
        <Roadmap />
      </main>
      <Footer />
      <CookieConsent />
    </>
  )
}
