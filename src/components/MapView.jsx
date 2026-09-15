import { useEffect, useRef, useState } from 'react'
import { EventCard } from './ui.jsx'

// Leaflet + CARTO basemap tiles. No API key, no account, no billing.
//
// Loaded from a CDN at runtime rather than bundled, so switching map libraries
// stays a single-file change and package.json never moves. The Google Maps
// version of this component is kept alongside as MapView.google.jsx: swap the
// filenames and add VITE_GOOGLE_MAPS_KEY to change back.
//
// TILES: osm.org's standard basemap. Verified 2026-09-14 by loading a real Bay
// Area tile and looking at it.
//
// CARTO's basemaps were used first and had to be abandoned: they now stamp
// "API KEY REQUIRED / carto.com/basemaps/apikey" diagonally across every tile
// unless you register. Both their Voyager and Positron styles do this. Do not
// go back to a cartocdn.com URL without a key.
//
// osm.org's tiles are donation-funded, so their usage policy asks for modest
// use and no heavy bulk traffic. Fine at Nexplore's current scale; if traffic
// grows, move to a tile plan (MapTiler, Stadia, or CARTO with a key) by
// changing TILE_URL alone — and update TILE_ATTRIB to credit whoever serves
// them, which is a licence requirement rather than a courtesy.
//
// No {s} subdomain: osm.org serves over HTTP/2 and asks clients not to shard.
// No detectRetina: osm.org publishes no @2x tiles, and Leaflet would instead
// request four times as many tiles to fake it, which is exactly the bulk
// traffic their policy asks us to avoid.
const LEAFLET_VERSION = '1.9.4'
const LEAFLET_JS = `https://cdnjs.cloudflare.com/ajax/libs/leaflet/${LEAFLET_VERSION}/leaflet.js`
const LEAFLET_CSS = `https://cdnjs.cloudflare.com/ajax/libs/leaflet/${LEAFLET_VERSION}/leaflet.css`
const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const TILE_ATTRIB =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

const DEFAULT_CENTER = [37.76, -122.25]
const DEFAULT_ZOOM = 9

const GREEN = '#1A6B4A'
const TERRA = '#C94F2C'

// encodeURIComponent, not btoa: the emoji glyph is multi-byte and btoa throws.
function pinIcon(selected) {
  const fill = selected ? TERRA : GREEN
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="42" viewBox="0 0 34 42">
    <path d="M17 41 L11 27 h12 Z" fill="#fff"/>
    <circle cx="17" cy="15" r="13" fill="#fff"/>
    <circle cx="17" cy="15" r="11" fill="${fill}"/>
    <text x="17" y="20" font-size="13" text-anchor="middle">🎃</text>
  </svg>`
  return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg)
}

function leafletIcon(L, selected) {
  const w = selected ? 40 : 34
  const h = selected ? 49 : 42
  return L.icon({ iconUrl: pinIcon(selected), iconSize: [w, h], iconAnchor: [w / 2, h - 1] })
}

// Cache the promise, not a boolean, so two near-simultaneous mounts share one
// load instead of racing. The stylesheet is awaited alongside the script:
// initialising a map before Leaflet's CSS lands leaves tiles mispositioned.
let leafletPromise = null
function loadLeaflet() {
  if (window.L?.map) return Promise.resolve(window.L)
  if (leafletPromise) return leafletPromise

  leafletPromise = new Promise((resolve, reject) => {
    const cssDone = new Promise((done) => {
      if (document.querySelector(`link[data-leaflet]`)) return done()
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = LEAFLET_CSS
      link.setAttribute('data-leaflet', '')
      link.onload = done
      link.onerror = done // a missing stylesheet is ugly, not fatal
      document.head.appendChild(link)
    })

    const script = document.createElement('script')
    script.src = LEAFLET_JS
    script.async = true
    script.onload = () => cssDone.then(() => resolve(window.L))
    script.onerror = () => { leafletPromise = null; reject(new Error('script-failed')) }
    document.head.appendChild(script)
  })
  return leafletPromise
}

export default function MapView({ events, onSelect, onDirections, onClose }) {
  const holder = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef([])
  const [selected, setSelected] = useState(null)
  const [status, setStatus] = useState('loading') // loading | ready | failed

  const plotted = events.filter((e) => typeof e.lat === 'number' && typeof e.lng === 'number')
  const missing = events.length - plotted.length

  // Build the map once per mount. App unmounts this component on every close,
  // so teardown has to be complete — leaving the Leaflet instance attached
  // makes the next open throw "Map container is already initialized".
  useEffect(() => {
    let dead = false
    loadLeaflet()
      .then((L) => {
        if (dead || !holder.current || mapRef.current) return
        const map = L.map(holder.current, {
          center: DEFAULT_CENTER,
          zoom: DEFAULT_ZOOM,
          zoomControl: false,
          attributionControl: true,
        })
        L.control.zoom({ position: 'topright' }).addTo(map)
        L.tileLayer(TILE_URL, { attribution: TILE_ATTRIB, maxZoom: 19, detectRetina: false }).addTo(map)
        map.on('click', () => setSelected(null))
        mapRef.current = map
        // The container is absolutely positioned inside a flex child, so its
        // size can still be 0 on the tick the map is created. Without this the
        // map renders a single grey tile in the corner.
        setTimeout(() => { if (!dead && mapRef.current) mapRef.current.invalidateSize() }, 0)
        setStatus('ready')
      })
      .catch(() => { if (!dead) setStatus('failed') })

    return () => {
      dead = true
      markersRef.current = []
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }
    }
  }, [])

  // Redraw markers whenever the filtered set changes, so the map always shows
  // exactly what the list would show.
  useEffect(() => {
    const L = window.L
    const map = mapRef.current
    if (status !== 'ready' || !L || !map) return

    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []

    plotted.forEach((ev) => {
      const marker = L.marker([ev.lat, ev.lng], { icon: leafletIcon(L, false), title: ev.title, riseOnHover: true })
      marker.__eventId = ev.id
      marker.on('click', (e) => {
        // Without this the click also reaches the map and immediately clears
        // the selection the marker just made.
        if (e.originalEvent) L.DomEvent.stopPropagation(e.originalEvent)
        setSelected(ev)
      })
      marker.addTo(map)
      markersRef.current.push(marker)
    })

    if (plotted.length === 1) {
      map.setView([plotted[0].lat, plotted[0].lng], 12)
    } else if (plotted.length > 1) {
      map.fitBounds(L.latLngBounds(plotted.map((ev) => [ev.lat, ev.lng])), { padding: [40, 40] })
    }
    setSelected(null)
  }, [status, events])

  // Recolour in place: rebuilding the whole marker set on every tap would make
  // the map flicker and drop the tap target out from under the finger.
  useEffect(() => {
    const L = window.L
    if (status !== 'ready' || !L) return
    markersRef.current.forEach((m) => {
      const on = selected && m.__eventId === selected.id
      m.setIcon(leafletIcon(L, on))
      m.setZIndexOffset(on ? 1000 : 0)
    })
  }, [selected, status])

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 900, background: '#E8E4DC', display: 'flex', flexDirection: 'column', maxWidth: 480, margin: '0 auto' }}>
      {/* Bar */}
      <div style={{ background: 'white', padding: '9px 14px', borderBottom: '0.5px solid #E2DDD6', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <button
          onClick={onClose}
          aria-label="Back to list"
          style={{ width: 30, height: 30, borderRadius: '50%', border: '1px solid #E2DDD6', background: '#F7F4EF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, fontSize: 15, color: '#2D2D2D', lineHeight: 1, padding: 0, fontFamily: 'inherit' }}
        >‹</button>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#2D2D2D' }}>Map</div>
          <div style={{ fontSize: 9, color: '#888880', marginTop: 1 }}>
            {plotted.length} on the map{missing > 0 ? ` · ${missing} without a location` : ''}
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div style={{ flex: 1, position: 'relative' }}>
        <div ref={holder} style={{ position: 'absolute', inset: 0, background: '#E8E4DC' }} />

        {status !== 'ready' && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 28, textAlign: 'center', background: '#F7F4EF', zIndex: 5 }}>
            <div>
              <div style={{ fontSize: 38, marginBottom: 12 }}>{status === 'loading' ? '🗺' : '⚠️'}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#888', marginBottom: 6 }}>
                {status === 'loading' ? 'Loading the map…' : "Map didn't load"}
              </div>
              {status === 'failed' && (
                <div style={{ fontSize: 11.5, color: '#aaa', lineHeight: 1.7 }}>
                  The map library couldn't be reached. Check the connection and try again.
                </div>
              )}
            </div>
          </div>
        )}

        {status === 'ready' && plotted.length === 0 && (
          <div style={{ position: 'absolute', left: 16, right: 16, top: 16, zIndex: 500, background: 'rgba(255,255,255,.95)', border: '0.5px solid #E2DDD6', borderRadius: 10, padding: '11px 14px', fontSize: 11.5, color: '#888880', lineHeight: 1.6 }}>
            Nothing in this filter has a location yet.
          </div>
        )}

        {/* Return to the list. Lives here rather than in App so it can stand
            down while a card is open — they share the same corner, and a
            floating pill over the card's buttons is unusable. */}
        {!selected && (
          <button
            onClick={onClose}
            style={{
              position: 'absolute', left: '50%', transform: 'translateX(-50%)', bottom: 26, zIndex: 600,
              display: 'flex', alignItems: 'center', gap: 7, background: '#2D2D2D', color: 'white',
              border: 'none', borderRadius: 50, padding: '11px 20px', fontSize: 12, fontWeight: 700,
              fontFamily: "'DM Sans', sans-serif", cursor: 'pointer', boxShadow: '0 5px 18px rgba(0,0,0,0.3)',
            }}
          >
            ☰ List
          </button>
        )}

        {/* Selected event, rendered with the real card so the map can never
            drift out of sync with the list. Bottom padding clears Leaflet's
            attribution strip, which has to stay legible. */}
        {selected && (
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 600, padding: '0 14px 22px', animation: 'fadeIn 0.22s ease' }}>
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setSelected(null)}
                aria-label="Close"
                style={{ position: 'absolute', top: -9, right: -6, zIndex: 3, width: 26, height: 26, borderRadius: '50%', background: 'white', border: '0.5px solid #E2DDD6', boxShadow: '0 2px 6px rgba(0,0,0,.16)', cursor: 'pointer', fontSize: 12, color: '#888880', lineHeight: 1, padding: 0, fontFamily: 'inherit' }}
              >✕</button>
              {/* key is load-bearing. EventImage holds the resolved image in
                  useState seeded once from props, with a mount-only effect.
                  Without a key React reuses the same instance across taps, so
                  the title and date update while the PHOTO stays on whichever
                  patch was tapped first. Keying by id forces a remount. */}
              <EventCard
                key={selected.id}
                event={selected}
                onSelect={onSelect}
                onDirections={onDirections}
                isEditorPick={selected.isEditorPick}
                isPlayground={selected.category === 'Playground'}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
