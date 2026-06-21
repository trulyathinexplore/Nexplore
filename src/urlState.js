// Two-way sync between filter state and the URL query string,
// so any filtered view is a shareable link.
const slug = (s) => s.toLowerCase().replace(/\s+/g, '-')

export const DEFAULTS = {
  pill: 'All', region: null, free: false, weekend: false, month: true, amenities: [], q: '',
}

export function readFilters(search, pillLabels, regions) {
  const p = new URLSearchParams(search)
  const findBySlug = (list, v) => list.find((x) => slug(x) === v) || null
  return {
    pill: findBySlug(pillLabels, p.get('view') || '') || 'All',
    region: findBySlug(regions, p.get('region') || ''),
    free: p.get('free') === '1',
    weekend: p.get('weekend') === '1',
    month: p.get('month') !== '0', // June default on unless explicitly off
    amenities: (p.get('amenities') || '').split(',').map((s) => s.trim()).filter(Boolean),
    q: p.get('q') || '',
  }
}

export function writeFilters(f) {
  const p = new URLSearchParams()
  if (f.pill && f.pill !== DEFAULTS.pill) p.set('view', slug(f.pill))
  if (f.region) p.set('region', slug(f.region))
  if (f.free) p.set('free', '1')
  if (f.weekend) p.set('weekend', '1')
  if (!f.month) p.set('month', '0')
  if (f.amenities.length) p.set('amenities', f.amenities.join(','))
  if (f.q) p.set('q', f.q)
  const qs = p.toString()
  const url = qs ? `${location.pathname}?${qs}` : location.pathname
  window.history.replaceState(null, '', url)
}
