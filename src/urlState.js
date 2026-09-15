// Two-way sync between filter state and the URL query string,
// so any filtered view is a shareable link.
// Exported because share.js builds `view=` into shared links and has to use
// the exact same spelling readFilters matches on.
export const slug = (s) => s.toLowerCase().replace(/\s+/g, '-')

// pill null means the HOME page. There is no 'All' any more: a bare URL is
// home, and any URL carrying a view is the list.
export const DEFAULTS = {
  pill: null, region: null, free: false, weekend: false, month: true, amenities: [], q: '', event: null,
}

export function readFilters(search, pillLabels, regions) {
  const p = new URLSearchParams(search)
  const findBySlug = (list, v) => list.find((x) => slug(x) === v) || null
  return {
    pill: findBySlug(pillLabels, p.get('view') || '') || null,
    region: findBySlug(regions, p.get('region') || ''),
    free: p.get('free') === '1',
    weekend: p.get('weekend') === '1',
    month: p.get('month') !== '0', // June default on unless explicitly off
    amenities: (p.get('amenities') || '').split(',').map((s) => s.trim()).filter(Boolean),
    q: p.get('q') || '',
    // Set by a shared link. App.jsx opens the event sheet over the list when
    // this matches a loaded row, and clears it when the sheet is closed.
    event: p.get('event') || null,
    // A shared map link. Opens on the map rather than the list, the same way
    // a shared category link opens on that category.
    map: p.get('map') === '1',
    // Deep link into a section of the home page. A query param rather than a
    // #hash on purpose: a hash is never sent to the server, so a #fall link
    // would preview as the generic home card. This one the edge function can
    // see, and give its own preview.
    section: p.get('section') || null,
  }
}

export function writeFilters(f) {
  const p = new URLSearchParams()
  if (f.pill) p.set('view', slug(f.pill))
  if (f.region) p.set('region', slug(f.region))
  if (f.free) p.set('free', '1')
  if (f.weekend) p.set('weekend', '1')
  if (!f.month) p.set('month', '0')
  if (f.amenities.length) p.set('amenities', f.amenities.join(','))
  if (f.q) p.set('q', f.q)
  // Kept in the URL while the sheet is open so a refresh, or a bookmark taken
  // mid-read, lands back on the same place.
  if (f.event) p.set('event', f.event)
  // So the address bar always describes what is on screen, which is also what
  // makes the map shareable without any extra plumbing.
  if (f.map) p.set('map', '1')
  // Kept, otherwise writeFilters strips it on mount and the scroll effect,
  // which reads the URL on every render, finds nothing on its second pass and
  // silently never scrolls.
  if (f.section) p.set('section', f.section)
  const qs = p.toString()
  const url = qs ? `${location.pathname}?${qs}` : location.pathname
  window.history.replaceState(null, '', url)
}
