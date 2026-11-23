import { useState, useEffect } from 'react'
import './CookieConsent.css'

const STORAGE_KEY = 'codearchy_cookie_consent'

const defaultPrefs = {
  necessary: true,   // always on
  analytics: false,
  marketing: false,
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [prefs, setPrefs] = useState(defaultPrefs)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) {
      // Slight delay so the page can paint first
      const t = setTimeout(() => setVisible(true), 800)
      return () => clearTimeout(t)
    }
  }, [])

  const save = (savedPrefs) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...savedPrefs, ts: Date.now() }))

    // Update Google Consent Mode v2 signals
    if (typeof window.gtag === 'function') {
      window.gtag('consent', 'update', {
        analytics_storage:  savedPrefs.analytics ? 'granted' : 'denied',
        ad_storage:         savedPrefs.marketing ? 'granted' : 'denied',
        ad_user_data:       savedPrefs.marketing ? 'granted' : 'denied',
        ad_personalization: savedPrefs.marketing ? 'granted' : 'denied',
      })
    }

    setVisible(false)
  }

  const acceptAll = () => save({ necessary: true, analytics: true, marketing: true })
  const rejectAll = () => save({ necessary: true, analytics: false, marketing: false })
  const saveCustom = () => save(prefs)

  const toggle = (key) => setPrefs((p) => ({ ...p, [key]: !p[key] }))

  if (!visible) return null

  return (
    <div className="cc-overlay" role="dialog" aria-modal="true" aria-labelledby="cc-title" aria-describedby="cc-desc">
      <div className="cc-banner">
        {/* Glow accent */}
        <div className="cc-glow" aria-hidden="true" />

        {/* Header */}
        <div className="cc-header">
          <div className="cc-icon" aria-hidden="true">🍪</div>
          <div>
            <h2 className="cc-title" id="cc-title">We value your privacy</h2>
            <p className="cc-desc" id="cc-desc">
              We use cookies to enhance your browsing experience, analyse site traffic, and personalise
              content. You can choose which categories to allow below.{' '}
              <a
                href="/privacy"
                className="cc-link"
                onClick={(e) => {
                  e.preventDefault()
                  window.history.pushState({}, '', '/privacy')
                  window.dispatchEvent(new PopStateEvent('popstate'))
                }}
              >
                Privacy Policy
              </a>
            </p>
          </div>
        </div>

        {/* Details panel */}
        {showDetails && (
          <div className="cc-details" role="group" aria-label="Cookie category preferences">
            <CookieToggle
              id="cc-necessary"
              label="Strictly Necessary"
              description="Essential for the site to function. Cannot be disabled."
              checked={true}
              disabled={true}
            />
            <CookieToggle
              id="cc-analytics"
              label="Analytics"
              description="Help us understand how visitors interact with the site (e.g. page views, session duration)."
              checked={prefs.analytics}
              onChange={() => toggle('analytics')}
            />
            <CookieToggle
              id="cc-marketing"
              label="Marketing"
              description="Used to track visitors across websites to display relevant advertisements."
              checked={prefs.marketing}
              onChange={() => toggle('marketing')}
            />
          </div>
        )}

        {/* Actions */}
        <div className="cc-actions">
          <button
            className="cc-btn cc-btn--ghost"
            onClick={() => setShowDetails((v) => !v)}
            aria-expanded={showDetails}
            aria-controls="cc-details"
          >
            {showDetails ? 'Hide options' : 'Customise'}
          </button>

          {showDetails ? (
            <button className="cc-btn cc-btn--secondary" onClick={saveCustom}>
              Save preferences
            </button>
          ) : (
            <button className="cc-btn cc-btn--secondary" onClick={rejectAll}>
              Reject non-essential
            </button>
          )}

          <button className="cc-btn cc-btn--primary" onClick={acceptAll}>
            Accept all
          </button>
        </div>
      </div>
    </div>
  )
}

function CookieToggle({ id, label, description, checked, disabled, onChange }) {
  return (
    <div className={`cc-toggle-row${disabled ? ' cc-toggle-row--disabled' : ''}`}>
      <div className="cc-toggle-info">
        <label htmlFor={id} className="cc-toggle-label">{label}</label>
        <p className="cc-toggle-desc">{description}</p>
      </div>
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        aria-label={`${label} cookies`}
        disabled={disabled}
        onClick={onChange}
        className={`cc-switch${checked ? ' cc-switch--on' : ''}`}
      >
        <span className="cc-switch-thumb" />
        <span className="sr-only">{checked ? 'Enabled' : 'Disabled'}</span>
      </button>
    </div>
  )
}
