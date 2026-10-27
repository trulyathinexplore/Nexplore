import { useState } from 'react'

// Halloween map (Oct 27, 2026): the pieces that are not the map itself.
//
//   TourBar       the green "Open route" bar that slides up once a stop is
//                 checked. One Google Maps directions link with every stop as a
//                 waypoint, in the order they were checked.
//   NearZipBar    one pill under the title: city, zip, radius. Applies the
//                 moment the fifth digit lands; no Go button.
//   tourRouteUrl  the Google Maps link. A street goes in as coordinates so
//                 Maps lands on the block itself; everything else as its
//                 address so the turn-by-turn list reads as a place name.
//   geocodeZip    zip → [lat, lng] through Nominatim, the geocoder the app
//                 already uses for addresses (resolveCoords in supabase.js).
//
// Everything a pin IS comes from Supabase (map_kind, map_city, map_path, the
// coordinates). This file only knows how to draw and route them, so adding a
// street or a maze is a row, never a deploy.

export function milesBetween(a, b) {
  const R = 3958.8
  const toR = (d) => (d * Math.PI) / 180
  const dLat = toR(b[0] - a[0])
  const dLng = toR(b[1] - a[1])
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a[0])) * Math.cos(toR(b[0])) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

// Bay Area only, same guard as resolveCoords: a bad zip must not fly the map
// to Kansas.
const BAY = { latMin: 36.9, latMax: 39.0, lngMin: -123.5, lngMax: -121.2 }
const zipCache = {}
export async function geocodeZip(code) {
  if (zipCache[code] !== undefined) return zipCache[code]
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us&postalcode=${encodeURIComponent(code)}`
    const j = await (await fetch(url)).json()
    const hit = j && j[0]
    const lat = Number(hit?.lat), lng = Number(hit?.lon)
    const ok = Number.isFinite(lat) && Number.isFinite(lng) && lat >= BAY.latMin && lat <= BAY.latMax && lng >= BAY.lngMin && lng <= BAY.lngMax
    zipCache[code] = ok ? [lat, lng] : null
  } catch {
    zipCache[code] = null
  }
  return zipCache[code]
}

function stopQuery(ev) {
  if (ev.mapKind === 'street') return `${ev.lat},${ev.lng}`
  return ev.fullAddress ? `${ev.title}, ${ev.fullAddress}` : `${ev.lat},${ev.lng}`
}

export function tourRouteUrl(stops) {
  if (!stops.length) return '#'
  const q = stops.map(stopQuery)
  const last = q[q.length - 1]
  const way = q.slice(0, -1)
  return 'https://www.google.com/maps/dir/?api=1&travelmode=driving'
    + '&destination=' + encodeURIComponent(last)
    + (way.length ? '&waypoints=' + encodeURIComponent(way.join('|')) : '')
}

export function tourCounts(stops) {
  const c = { yard: 0, maze_free: 0, maze_paid: 0, street: 0 }
  stops.forEach((ev) => {
    if (ev.mapKind === 'yard') c.yard += 1
    else if (ev.mapKind === 'street') c.street += 1
    else if (ev.mapKind === 'maze') c[ev.free ? 'maze_free' : 'maze_paid'] += 1
  })
  return c
}

export function TourBar({ stops, onOpen, onClear, max }) {
  const c = tourCounts(stops)
  const mix = [
    c.yard && `${c.yard} 🎃`,
    (c.maze_free + c.maze_paid) && `${c.maze_free + c.maze_paid} 😱`,
    c.street && `${c.street} 🍬`,
  ].filter(Boolean).join(' · ')
  const n = stops.length
  const empty = n === 0
  return (
    <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 950, padding: '10px 16px calc(10px + env(safe-area-inset-bottom, 0px))', background: 'linear-gradient(to top, #F7F4EF 75%, transparent)', animation: 'fadeIn 0.22s ease' }}>
      <div style={{ maxWidth: 448, margin: '0 auto', display: 'flex', gap: 8, alignItems: 'center' }}>
        {/* Always on screen while the Halloween map is open, so people know
            the tour exists before they have checked anything. Empty state is
            the prompt; with stops it becomes the route button. */}
        <button
          onClick={empty ? undefined : onOpen}
          aria-disabled={empty}
          style={{ flex: 1, border: 0, background: empty ? '#1A6B4A' : '#1A6B4A', color: 'white', fontWeight: 700, fontSize: empty ? 14 : 15, padding: '12px 16px', borderRadius: 14, boxShadow: '0 4px 14px rgba(0,0,0,.18)', cursor: empty ? 'default' : 'pointer', fontFamily: 'inherit', textAlign: empty ? 'left' : 'center' }}
        >
          {empty ? '🗺 Build your own Halloween drive' : 'Open route in Google Maps'}
          <small style={{ display: 'block', fontWeight: 500, fontSize: 11.5, opacity: .9, marginTop: 2, lineHeight: 1.35 }}>
            {empty
              ? 'Tap any pin and check "Add to tour". Up to 9 stops, one route in Google Maps.'
              : `${n} ${n === 1 ? 'stop' : 'stops'}${mix ? ` · ${mix}` : ''}${n >= max ? ' · max' : ''} · from your location`}
          </small>
        </button>
        {!empty && (
          <button
            onClick={onClear}
            style={{ fontFamily: 'inherit', fontSize: 13, fontWeight: 700, padding: '12px 14px', borderRadius: 14, border: '0.5px solid #E2DDD6', background: 'white', color: '#2D2D2D', cursor: 'pointer' }}
          >
            Clear
          </button>
        )}
      </div>
    </div>
  )
}

const RADII = [5, 10, 15, 25]

// The one-row control under the page title, matching the prototype: city
// dropdown on the left, zip in the middle, radius on the right, one pill.
// Mirrors the header's Near picker (same state), so either one works.
export function NearZipBar({ city, cities, region, onCity, zip, onSearch, onClear, hiddenCount = 0 }) {
  const [code, setCode] = useState(zip.code || '')
  const [radius, setRadius] = useState(zip.radius || 10)
  const active = !!zip.center
  const sel = { border: 0, background: 'transparent', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 700, color: '#2D2D2D', outline: 'none', height: '100%', minWidth: 0, appearance: 'none', WebkitAppearance: 'none' }
  const cityValue = active ? '' : city
  return (
    <div style={{ margin: '0 16px 10px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.1fr) minmax(0,1fr) auto', height: 40, border: '1.5px solid #1A6B4A', borderRadius: 999, background: 'white', overflow: 'hidden' }}>
        <div style={{ position: 'relative', borderRight: '0.5px solid #E2DDD6', display: 'flex', alignItems: 'center' }}>
          <span style={{ position: 'absolute', left: 11, fontSize: 13, pointerEvents: 'none' }}>📍</span>
          <select id="nx-city" aria-label="Near" value={cityValue} onChange={(e) => onCity(e.target.value)} style={{ ...sel, width: '100%', padding: '0 22px 0 31px' }}>
            <option value="">All Bay Area</option>
            {region && <option value={`region:${region}`}>{region}</option>}
            {cities.map((c) => <option key={c} value={c}>{c}</option>)}
            {city && !city.startsWith('region:') && !cities.includes(city) && <option value={city}>{city}</option>}
          </select>
          <span style={{ position: 'absolute', right: 10, fontSize: 10, color: '#2D2D2D', pointerEvents: 'none' }}>▼</span>
        </div>
        <input
          value={code}
          inputMode="numeric"
          maxLength={5}
          placeholder="or zip code"
          aria-label="Zip code"
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, '').slice(0, 5)
            setCode(v)
            if (v.length === 5) onSearch(v, radius)
            else if (!v.length && active) onClear()
          }}
          style={{ border: 0, background: 'transparent', padding: '0 10px', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 600, color: '#2D2D2D', outline: 'none', minWidth: 0, width: '100%' }}
        />
        <div style={{ position: 'relative', borderLeft: '0.5px solid #E2DDD6', background: active ? '#E8F5EE' : '#F7F4EF', display: 'flex', alignItems: 'center' }}>
          <select aria-label="Radius" value={radius} onChange={(e) => { const r = Number(e.target.value); setRadius(r); if (code.length === 5) onSearch(code, r) }} style={{ ...sel, width: 72, padding: '0 22px 0 9px', fontSize: 12.5, color: active ? '#0F5238' : '#888880' }}>
            {RADII.map((r) => <option key={r} value={r}>{r} mi</option>)}
          </select>
          <span style={{ position: 'absolute', right: 9, fontSize: 10, color: active ? '#0F5238' : '#888880', pointerEvents: 'none' }}>▼</span>
        </div>
      </div>
      {zip.error && <div style={{ fontSize: 11.5, color: '#B3362A', margin: '5px 4px 0' }}>{zip.error}</div>}
      {active && !zip.error && hiddenCount > 0 && (
        <div style={{ fontSize: 11.5, color: '#888880', margin: '5px 4px 0' }}>{hiddenCount} without a location aren't shown while a zip is set.</div>
      )}
    </div>
  )
}
