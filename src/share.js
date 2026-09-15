// Share links and share text.
//
// One place for every string and URL that leaves the app, so the wording can
// be changed without touching any component.

import { slug } from './urlState.js'

const ORIGIN = () =>
  (typeof window !== 'undefined' && window.location.origin) || 'https://nexplore.us'

const TAGLINE = 'Family adventures in your neighborhood'

// A link to one place. Deliberately a query param on the existing app rather
// than a /event/:id route: there is no detail page, and adding one would mean a
// second surface to keep in sync with the card. App.jsx reads ?event= on load
// and opens the event sheet over the list.
//
// `viewLabel` is the pill the sharer was looking at, so the recipient lands on
// that category rather than on everything. Deliberately the sharer's pill and
// not one derived from the event: share a splash-pad playground from Water
// Play and the recipient should get Water Play, because that is the context it
// was sent in.
//
// Filters are deliberately NOT carried. The sharer's region and amenity chips
// are theirs, and a recipient landing on a near-empty filtered list reads as
// broken.
export function eventUrl(ev, viewLabel) {
  const view = viewSlug(viewLabel)
  const q = view ? `view=${view}&` : ''
  return `${ORIGIN()}/?${q}event=${encodeURIComponent(ev.id)}`
}

// Matches the spelling readFilters() matches on. 'All' resolves to nothing,
// which is also the right answer once the All pill is gone.
function viewSlug(label) {
  if (!label || label === 'All') return ''
  return encodeURIComponent(slug(label))
}

// A link to the category the user is looking at.
//
// Deliberately rebuilt from the pill rather than copied from the address bar.
// The address bar carries region, amenity chips, search and the month filter
// too, and sending those along means the recipient opens a list cut down to
// four cards and assumes that is all there is. The filters are obvious enough
// once they arrive; the catalogue is not.
//
// `map` is the one piece of view state that DOES travel, because a shared map
// is a different thing from a shared list and the sharer chose it deliberately.
export function viewUrl(pillLabel, isMap) {
  const p = new URLSearchParams()
  if (pillLabel) p.set('view', slug(pillLabel))
  if (isMap) p.set('map', '1')
  const qs = p.toString()
  return qs ? `${ORIGIN()}/?${qs}` : `${ORIGIN()}/`
}

// A link to one section of the home page. A query param rather than a #hash
// because a hash never reaches the server, so a #fall link would preview as
// the generic home card.
export function sectionUrl(section) {
  return `${ORIGIN()}/?section=${encodeURIComponent(section)}`
}

export function eventShareText(ev) {
  const where = ev.city || ev.area
  return `Explore ${ev.title}${where ? `, ${where}` : ''} on Nexplore. ${TAGLINE}.`
}

export function viewShareText(pillLabel, count, isMap) {
  const where = isMap ? 'on a map' : 'in the Bay Area'
  if (pillLabel === 'All') {
    return `Explore ${count} things to do with kids ${where} on Nexplore. ${TAGLINE}.`
  }
  return `Explore ${count} ${pillLabel} ${where} on Nexplore. ${TAGLINE}.`
}

// Destination builders. Each takes the finished text and link and returns a URL
// the browser can open. Keeping them separate from the sheet means a new
// destination is one line here and one tile there.
export const targets = {
  whatsapp: (text, url) => `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`,
  sms: (text, url) => {
    // iOS wants ?&body=, Android wants ?body=. This form works on both.
    const body = encodeURIComponent(`${text}\n${url}`)
    return `sms:${/iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent) ? '&' : '?'}body=${body}`
  },
  email: (text, url, subject) =>
    `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(`${text}\n\n${url}`)}`,
}

export async function copyLink(url) {
  try {
    await navigator.clipboard.writeText(url)
    return true
  } catch {
    // Clipboard API needs a secure context and is refused outright in some
    // in-app browsers. Fall back to the old selection trick.
    try {
      const ta = document.createElement('textarea')
      ta.value = url
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(ta)
      return ok
    } catch {
      return false
    }
  }
}

export function canNativeShare() {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function'
}

export async function nativeShare(title, text, url) {
  try {
    await navigator.share({ title, text, url })
    return true
  } catch {
    // The user dismissing the OS sheet rejects too. Nothing to report.
    return false
  }
}
