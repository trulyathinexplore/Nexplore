import { useEffect, useState } from 'react'

// ---------------------------------------------------------------------------
// The Near bar, option C (RAG, Nov 16 2026). Replaces NearZipBar.
//
//   [ Use my location ] [ or zip code / city ] [ 10 mi ]
//
//   - "Use my location" asks the browser for a position only when tapped,
//     never on load. While it is on the button reads "Near me"; tapping it
//     again turns it off.
//   - One field takes a zip or a city. A number is read as a zip and searches
//     itself at five digits. Letters open a list of matching cities to tap.
//   - A city behaves like a zip: everything within the chosen miles of it.
//   - The X empties the field and goes back to everything.
//
// The bar holds only what is being typed. What is actually applied (centre,
// miles, label, error) lives in App.jsx as `near` and comes back in as a prop.
// ---------------------------------------------------------------------------

export const RADII = [5, 10, 15, 25]

// Listings cover all of California since the Nov 16 rink batch, so a zip or a
// city anywhere in the state is accepted. These are the same bounds as the
// events_coords_california check on the table. Anything outside is refused so
// a typo cannot fly the map to Kansas.
const CA = { latMin: 32.4, latMax: 42.1, lngMin: -124.6, lngMax: -114.0 }
const inCalifornia = (lat, lng) =>
  Number.isFinite(lat) && Number.isFinite(lng) && lat >= CA.latMin && lat <= CA.latMax && lng >= CA.lngMin && lng <= CA.lngMax

// Nominatim, the geocoder the app already uses. One request per search, and
// every answer (a miss included) is remembered for the rest of the visit. A
// network failure is NOT remembered, so a second try can still succeed.
const geoCache = {}
async function lookup(key, query) {
  if (geoCache[key] !== undefined) return geoCache[key]
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us&${query}`
    const res = await fetch(url)
    if (!res.ok) return null
    const j = await res.json()
    const hit = j && j[0]
    const lat = Number(hit?.lat), lng = Number(hit?.lon)
    geoCache[key] = hit && inCalifornia(lat, lng) ? [lat, lng] : null
    return geoCache[key]
  } catch {
    return null
  }
}
export const geocodeZipCA = (code) => lookup(`zip:${code}`, `postalcode=${encodeURIComponent(code)}`)
export const geocodeCityCA = (name) =>
  lookup(`city:${name.trim().toLowerCase()}`, `city=${encodeURIComponent(name.trim())}&state=California`)

// The browser's own position. Resolves to [lat, lng], or null when the person
// says no, location is off, or it takes longer than ten seconds.
export function locateMe() {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) { resolve(null); return }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve([pos.coords.latitude, pos.coords.longitude]),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 10 * 60 * 1000 },
    )
  })
}

// Cities that match what has been typed: names that start with it first, then
// names where a later word starts with it ("ramon" finds San Ramon).
export function matchCities(cities, typed, max = 6) {
  const q = typed.trim().toLowerCase()
  if (!q) return []
  const starts = [], inner = []
  for (const c of cities) {
    const n = c.toLowerCase()
    if (n.startsWith(q)) starts.push(c)
    else if (n.includes(` ${q}`)) inner.push(c)
  }
  return starts.concat(inner).slice(0, max)
}

const TargetGlyph = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" style={{ flex: '0 0 auto' }}>
    <circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
  </svg>
)

// near        { code, radius, center, error, kind, busy } from App.jsx.
//             kind is 'zip', 'city' or 'me' once something is applied;
//             code is the zip or city searched for, empty for 'me'.
// cities      names offered as the person types.
// fixedLabel  a city or region applied some other way (an old shared link, a
//             Halloween city map). Shown in the field so the X can clear it.
// exactCity   Halloween: a city name opens that city's map, so it is passed
//             on exactly as picked and free text is not offered.
export function NearBar({ near, cities, fixedLabel = '', exactCity = false, onZip, onCity, onMe, onRadius, onClear, hiddenCount = 0 }) {
  // near.code is the zip or city last searched for: set the moment a search
  // starts, kept if it fails (so the words stay next to the error), emptied
  // when App clears the location, on a page change for instance.
  const sought = near.code || fixedLabel
  const [text, setText] = useState(sought)
  const [open, setOpen] = useState(false)
  // Follow App, but never overwrite a half-typed word: this only runs when
  // the searched-for value itself changes, not on every keystroke.
  useEffect(() => { setText(sought) }, [sought])

  const active = !!near.center
  const meOn = near.kind === 'me' && active
  const applied = active && !meOn ? near.code : ''
  const settled = !!text && (text === applied || text === fixedLabel)
  const typingCity = !!text && !/^\d/.test(text) && !settled
  const options = typingCity ? matchCities(cities, text) : []
  const typed = text.trim()
  const offerFreeText = typingCity && !exactCity && typed.length >= 3 && !options.some((c) => c.toLowerCase() === typed.toLowerCase())
  const showList = open && (options.length > 0 || offerFreeText)

  const pick = (name) => { setText(name); setOpen(false); onCity(name) }
  const change = (raw) => {
    // A leading digit means a zip: digits only, five at most.
    const v = /^\s*\d/.test(raw) ? raw.replace(/\D/g, '').slice(0, 5) : raw.replace(/^\s+/, '').slice(0, 40)
    setText(v)
    setOpen(true)
    if (/^\d{5}$/.test(v)) onZip(v)
    else if (!v) onClear()
  }
  const clear = () => { setText(''); setOpen(false); onClear() }
  const enter = () => {
    if (/^\d/.test(text)) { if (/^\d{5}$/.test(text)) onZip(text); return }
    if (options.length) pick(options[0])
    else if (offerFreeText) pick(typed)
  }

  const cell = { border: 0, fontFamily: 'inherit', outline: 'none', minWidth: 0 }
  const tone = active ? '#2D2D2D' : '#6F6F68'
  return (
    <div style={{ margin: '0 16px 10px', position: 'relative' }}>
      <div className="nx-nearbar" style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0,1fr) 62px', height: 44, border: '1.5px solid #1A6B4A', borderRadius: 999, background: 'white', overflow: 'hidden' }}>
        <button
          type="button"
          className="nx-nearme"
          aria-pressed={meOn}
          aria-label={meOn ? 'Using my location. Tap to turn off' : 'Use my location'}
          onClick={() => (meOn ? clear() : (setText(''), setOpen(false), onMe()))}
          style={{ ...cell, borderRight: meOn ? 0 : '0.5px solid #E2DDD6', background: meOn ? '#1A6B4A' : 'transparent', color: meOn ? 'white' : '#1A6B4A', padding: '0 10px 0 11px', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap' }}
        >
          <TargetGlyph />
          <span>{near.busy === 'me' ? 'Locating...' : meOn ? 'Near me' : 'Use my location'}</span>
        </button>
        <div style={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
          <input
            type="text"
            value={text}
            placeholder="or zip code / city"
            aria-label="Zip code or city"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="search"
            onChange={(e) => change(e.target.value)}
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); enter(); e.target.blur() } else if (e.key === 'Escape') setOpen(false) }}
            style={{ ...cell, background: 'transparent', padding: '0 0 0 9px', fontSize: 13.5, fontWeight: settled ? 700 : 600, color: settled && !/^\d/.test(text) ? '#1A6B4A' : '#2D2D2D', width: '100%', boxSizing: 'border-box' }}
          />
          {text && (
            <button type="button" aria-label="Clear" onMouseDown={(e) => e.preventDefault()} onClick={clear}
              style={{ ...cell, background: 'transparent', width: 32, height: '100%', flex: '0 0 32px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6F6F68', cursor: 'pointer' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          )}
        </div>
        <div style={{ position: 'relative', borderLeft: '0.5px solid #E2DDD6', background: active ? '#E8F5EE' : '#F7F4EF', display: 'flex', alignItems: 'center' }}>
          <select aria-label="Radius" value={near.radius} onChange={(e) => onRadius(Number(e.target.value))}
            style={{ ...cell, background: 'transparent', fontSize: 12.5, fontWeight: 700, color: tone, height: '100%', width: '100%', appearance: 'none', WebkitAppearance: 'none', padding: '0 18px 0 9px' }}>
            {RADII.map((r) => <option key={r} value={r}>{r} mi</option>)}
          </select>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={tone} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ position: 'absolute', right: 8, pointerEvents: 'none' }}><path d="M6 9l6 6 6-6" /></svg>
        </div>
      </div>

      {/* Sits over the list instead of pushing it down. onMouseDown keeps the
          field focused, so a tap on a city lands before the list closes. */}
      {showList && (
        <div className="nx-nearlist" role="listbox" onMouseDown={(e) => e.preventDefault()}
          style={{ position: 'absolute', left: 0, right: 0, top: 48, zIndex: 30, background: 'white', border: '0.5px solid #E2DDD6', borderRadius: 14, boxShadow: '0 6px 18px rgba(45,45,45,0.14)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {options.map((c, i) => {
            const at = c.toLowerCase().indexOf(typed.toLowerCase())
            return (
              <button type="button" role="option" aria-selected={i === 0} key={c} onClick={() => pick(c)}
                style={{ border: 0, borderBottom: '0.5px solid #EFEBE4', background: i === 0 ? '#F1F8F4' : 'transparent', height: 44, padding: '0 14px', textAlign: 'left', fontFamily: 'inherit', fontSize: 13.5, color: '#2D2D2D', cursor: 'pointer' }}>
                {at < 0 ? c : <>{c.slice(0, at)}<strong>{c.slice(at, at + typed.length)}</strong>{c.slice(at + typed.length)}</>}
              </button>
            )
          })}
          {offerFreeText && (
            <button type="button" role="option" aria-selected={options.length === 0} onClick={() => pick(typed)}
              style={{ border: 0, background: options.length ? 'transparent' : '#F1F8F4', height: 44, padding: '0 14px', textAlign: 'left', fontFamily: 'inherit', fontSize: 13, color: '#1A6B4A', fontWeight: 600, cursor: 'pointer' }}>
              Search near "{typed}"
            </button>
          )}
        </div>
      )}

      {near.error && <div role="alert" style={{ fontSize: 11.5, color: '#B3362A', margin: '5px 4px 0' }}>{near.error}</div>}
      {active && !near.error && hiddenCount > 0 && (
        <div style={{ fontSize: 11.5, color: '#888880', margin: '5px 4px 0' }}>{hiddenCount} without a saved location aren't shown while a location is set.</div>
      )}
    </div>
  )
}
