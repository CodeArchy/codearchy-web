/*
 * Cookie consent for codearchy.com, written for the GDPR and the ePrivacy rules:
 *
 *   - Nothing optional runs before a choice. Google Analytics' script isn't even
 *     requested until a visitor allows analytics, so a visitor who never answers,
 *     or says no, sends nothing to Google.
 *   - One optional category (analytics). The site has no ads and no marketing tags,
 *     so it doesn't ask about them.
 *   - Saying no is as easy as saying yes, and the choice can be changed at any time
 *     from "Cookie settings" in the footer or on the privacy page.
 *   - A choice is kept for 12 months, then the visitor is asked again. A browser that
 *     sends Global Privacy Control is treated as having said no.
 *   - Turning analytics off stops it at once and deletes Google Analytics' cookies.
 */

export const GA_ID = 'G-REPDR6673K'
export const CONSENT_KEY = 'codearchy_cookie_consent'
const VERSION = 2
const MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000
/** Google Analytics cookies last 13 months at most (the CNIL's guidance), not Google's default 2 years. */
const GA_COOKIE_SECONDS = 395 * 24 * 60 * 60
const OPEN_EVENT = 'codearchy:cookie-settings'

/** The stored choice, or null when there is none (or it's older than 12 months, or from an older banner). */
export function readConsent() {
  try {
    const stored = JSON.parse(localStorage.getItem(CONSENT_KEY) || 'null')
    if (!stored || stored.v !== VERSION || typeof stored.ts !== 'number') return null
    if (Date.now() - stored.ts > MAX_AGE_MS) return null
    return { analytics: stored.analytics === true, ts: stored.ts }
  } catch {
    return null
  }
}

/** True when the browser asks sites not to share or sell data (Global Privacy Control). */
export function gpcEnabled() {
  return typeof navigator !== 'undefined' && navigator.globalPrivacyControl === true
}

export function saveConsent({ analytics }) {
  const choice = { v: VERSION, analytics: analytics === true, ts: Date.now() }
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(choice))
  } catch {
    // Storage blocked (private mode, site data off): the choice holds for this visit only.
  }
  apply(choice.analytics)
  return choice
}

/** Starts or stops analytics to match a choice. */
export function apply(analytics) {
  if (analytics) startAnalytics()
  else stopAnalytics()
}

/** On load: honour a stored choice. Returns whether the banner should be shown. */
export function initConsent() {
  const stored = readConsent()
  if (stored) {
    apply(stored.analytics)
    return false
  }
  // Global Privacy Control counts as "no"; the visitor can still opt in from Cookie settings.
  return !gpcEnabled()
}

function gtag() {
  window.dataLayer = window.dataLayer || []
  // gtag.js reads the arguments object itself, not an array.
  // eslint-disable-next-line prefer-rest-params
  window.dataLayer.push(arguments)
}

let loaded = false
function startAnalytics() {
  window[`ga-disable-${GA_ID}`] = false
  gtag('consent', 'update', { analytics_storage: 'granted' })
  if (loaded) return
  loaded = true
  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`
  document.head.appendChild(script)
  gtag('js', new Date())
  gtag('config', GA_ID, {
    cookie_expires: GA_COOKIE_SECONDS,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  })
}

function stopAnalytics() {
  window[`ga-disable-${GA_ID}`] = true
  gtag('consent', 'update', { analytics_storage: 'denied' })
  deleteAnalyticsCookies()
}

/** Removes _ga and _ga_<id> for this host and its parent domains (GA sets them on the top domain). */
function deleteAnalyticsCookies() {
  const names = document.cookie
    .split(';')
    .map((c) => c.split('=')[0].trim())
    .filter((n) => n === '_ga' || n.startsWith('_ga_') || n === '_gid')
  if (!names.length) return
  const parts = window.location.hostname.split('.')
  const domains = ['']
  for (let i = 0; i < parts.length - 1; i++) domains.push(`; domain=.${parts.slice(i).join('.')}`)
  for (const name of names) {
    for (const domain of domains) document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${domain}`
  }
}

/** Opens the cookie settings (from the footer or the privacy page). */
export function openCookieSettings() {
  window.dispatchEvent(new Event(OPEN_EVENT))
}

export function onOpenCookieSettings(handler) {
  window.addEventListener(OPEN_EVENT, handler)
  return () => window.removeEventListener(OPEN_EVENT, handler)
}
