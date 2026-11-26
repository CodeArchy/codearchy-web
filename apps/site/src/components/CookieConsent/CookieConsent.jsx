import { useEffect, useRef, useState } from 'react'
import { initConsent, onOpenCookieSettings, readConsent, saveConsent } from '../../lib/consent'
import './CookieConsent.css'

/**
 * The cookie banner. It doesn't block the page, "Reject" and "Accept" carry the
 * same weight, and "Cookie settings" (footer, privacy page) reopens it with the
 * current choice.
 */
export default function CookieConsent() {
  const [open, setOpen] = useState(false)
  const [details, setDetails] = useState(false)
  const [analytics, setAnalytics] = useState(false)
  const panel = useRef(null)

  useEffect(() => {
    if (initConsent()) setOpen(true)
    return onOpenCookieSettings(() => {
      setAnalytics(readConsent()?.analytics ?? false)
      setDetails(true)
      setOpen(true)
    })
  }, [])

  // When reopened from a link, move focus into the panel so keyboard users land on it.
  useEffect(() => {
    if (open && details) panel.current?.focus()
  }, [open, details])

  const choose = (value) => {
    saveConsent({ analytics: value })
    setOpen(false)
    setDetails(false)
  }

  if (!open) return null

  return (
    <section className="cc" role="region" aria-label="Cookie choices" ref={panel} tabIndex={-1}>
      <h2 className="cc__title">Cookies on this site</h2>
      <p className="cc__text">
        With your permission we use Google Analytics to see which pages help people. It stays off unless you
        allow it, and the site works the same either way. <a href="/privacy#cookies">How we use cookies</a>
      </p>

      {details && (
        <div className="cc__options">
          <div className="cc__option">
            <div>
              <p className="cc__option-name">Necessary</p>
              <p className="cc__option-text">Remember this choice and your light or dark theme, in your browser only.</p>
            </div>
            <span className="cc__always">Always on</span>
          </div>
          <div className="cc__option">
            <div>
              <label className="cc__option-name" htmlFor="cc-analytics">
                Analytics
              </label>
              <p className="cc__option-text">
                Google Analytics: pages visited, where visitors came from, rough location and device. Cookies{' '}
                <code>_ga</code> and <code>_ga_*</code>, kept up to 13 months.
              </p>
            </div>
            <button
              id="cc-analytics"
              type="button"
              role="switch"
              aria-checked={analytics}
              className={`cc__switch${analytics ? ' is-on' : ''}`}
              onClick={() => setAnalytics((v) => !v)}
            />
          </div>
        </div>
      )}

      <div className="cc__actions">
        {details ? (
          <button type="button" className="cc__btn cc__btn--main" onClick={() => choose(analytics)}>
            Save choice
          </button>
        ) : (
          <button type="button" className="cc__btn cc__btn--link" onClick={() => setDetails(true)}>
            Choose
          </button>
        )}
        <button type="button" className="cc__btn" onClick={() => choose(false)}>
          Reject
        </button>
        <button type="button" className="cc__btn" onClick={() => choose(true)}>
          Accept
        </button>
      </div>
    </section>
  )
}
