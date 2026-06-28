import { useState, useEffect } from 'react'
import { fetchEvents, mapEvent } from './supabase.js'
import { PILLS, REGION_CITIES, matchesPill, detectPillFromSearch, detectCityFromSearch, EXCLUDED_AMENITY_TAGS } from './constants.js'
import { trackPillClick, trackEventClickThrough, trackFilterApplied, trackSearch, trackPageEngagement, trackJuly4thFilter } from './analytics.js'
import { readFilters, writeFilters } from './urlState.js'
import {
  SearchIcon, FilterIcon, EventCard, EventCardSkeleton, PicksRow, FilterDrawer,
} from './components/ui.jsx'

const PILL_LABELS = PILLS.map((p) => p.label)
const REGION_LABELS = Object.keys(REGION_CITIES)
const prettify = (t) => t.replace(/-/g, ' ').replace(/\b\w/, (c) => c.toUpperCase())

function isThisWeekend(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  const now = new Date(); now.setHours(0, 0, 0, 0)
  const day = now.getDay()
  const sat = new Date(now)
  if (day === 0) sat.setDate(now.getDate() - 1)
  else sat.setDate(now.getDate() + ((6 - day + 7) % 7))
  sat.setHours(0, 0, 0, 0)
  const sun = new Date(sat); sun.setDate(sat.getDate() + 1); sun.setHours(23, 59, 59, 999)
  return d >= sat && d <= sun
}

export default function App() {
  const init = readFilters(window.location.search, PILL_LABELS, REGION_LABELS)

  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [pill, setPill] = useState(init.pill)
  const [region, setRegion] = useState(init.region)
  const [freeOnly, setFreeOnly] = useState(init.free)
  const [weekend, setWeekend] = useState(init.weekend)
  const [month, setMonth] = useState(init.month)
  const [search, setSearch] = useState(init.q)
  const [amenities, setAmenities] = useState(init.amenities)
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true); setError(null)
    fetchEvents({ freeOnly })
      .then((raw) => { if (!cancelled) setEvents(raw.map(mapEvent)) })
      .catch((e) => { if (!cancelled) setError(e.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [freeOnly])

  useEffect(() => {
    writeFilters({ pill, region, free: freeOnly, weekend, month, amenities, q: search })
  }, [pill, region, freeOnly, weekend, month, amenities, search])

  const activePill = PILLS.find((p) => p.label === pill) || PILLS[0]
  const showAmenities = activePill.type === 'category' || activePill.type === 'tagGroup'

  // Only show date/time chips when Events pill is active
  const showDateChips = activePill.type === 'eventType'
unction choosePill(label) {
  setPill(label)
  
  // ADD THIS LINE:
  if (label === 'July 4th') {
    trackJuly4thFilter();
  } else {
    trackPillClick(label);
  }
  
  const ap = PILLS.find((p) => p.label === label)
  if (!(ap.type === 'category' || ap.type === 'tagGroup')) setAmenities([])
  if (ap.type !== 'eventType') setMonth(false)
}
 function choosePill(label) {
  setPill(label)
  const ap = PILLS.find((p) => p.label === label)
  if (!(ap.type === 'category' || ap.type === 'tagGroup')) setAmenities([])
  // Auto-deactivate month filter when leaving Events pill
  if (ap.type !== 'eventType') setMonth(false)
}

  const toggleAmenity = (name) =>
    setAmenities((cur) => (cur.includes(name) ? cur.filter((a) => a !== name) : [...cur, name]))

  // Detect intent from search: city and/or keyword→pill mapping
  const searchDetectedPill = detectPillFromSearch(search)
  const searchDetectedCity = detectCityFromSearch(search)

  const passesBase = (ev) => {
    if (search) {
      const s = search.toLowerCase()

      // If search maps to a pill (e.g. "splash pad" → Water Play), use that pill logic
      if (searchDetectedPill) {
        const mappedPill = PILLS.find((p) => p.label === searchDetectedPill)
        if (mappedPill && !matchesPill(ev, mappedPill)) return false
      } else {
        // Normal text search: title, description
        if (
          !ev.title.toLowerCase().includes(s) &&
          !(ev.description || '').toLowerCase().includes(s)
        ) return false
      }

      // Location filter: if city detected in search, filter by city
      if (searchDetectedCity) {
        if ((ev.city || '').toLowerCase() !== searchDetectedCity.toLowerCase()) return false
      }
    }

    // If no search keyword mapping, apply active pill normally
    if (!searchDetectedPill && !matchesPill(ev, activePill)) return false
    // If keyword mapped to a pill but user also has a pill selected (not All), still apply it
    if (searchDetectedPill && activePill.type !== 'all' && !matchesPill(ev, activePill)) return false

    if (region && REGION_CITIES[region] && !REGION_CITIES[region].includes(ev.city)) return false
    if (month && ev.startDate && new Date(ev.startDate + 'T12:00:00').getMonth() !== 5) return false
    if (weekend && ev.startDate && !isThisWeekend(ev.startDate)) return false
    return true
  }

  const base = events.filter(passesBase)

  // Amenity options: exclude family-friendly and water-feature tags from sub-pills
  const amenityOptions = [...new Set(
    base.flatMap((ev) =>
      ev.tags
        .filter((t) => {
          if (t.tag_group !== 'amenity' && t.tag_group !== 'water-feature') return false
          if (EXCLUDED_AMENITY_TAGS.includes(t.name.toLowerCase())) return false
          return true
        })
        .map((t) => t.name)
    ),
  )].sort()

  const filtered = base.filter((ev) => amenities.every((a) => ev.tags.some((t) => t.name === a)))
  const now = new Date()
  const upcoming = filtered.filter((ev) => !ev.endDate || new Date(ev.endDate + 'T23:59:59') >= now)
const past = filtered.filter((ev) => ev.endDate && new Date(ev.endDate + 'T23:59:59') < now)
  const picks = upcoming.filter((ev) => ev.isEditorPick)
  const filterCount = [month, weekend, freeOnly, !!region].filter(Boolean).length + amenities.length
  const openOfficial = (ev) => { if (ev.officialUrl && ev.officialUrl !== '#') window.open(ev.officialUrl, '_blank') }
  const openDirections = (ev) => {
    const q = encodeURIComponent(ev.fullAddress || ev.title)
    window.open(`https://maps.google.com/?q=${q}`, '_blank')
  }

  const chips = [
    { label: '🗓 June', active: month, toggle: () => setMonth((v) => !v) },
    { label: '📅 This weekend', active: weekend, toggle: () => setWeekend((v) => !v) },
    { label: '🏷 Free only', active: freeOnly, toggle: () => setFreeOnly((v) => !v) },
  ]
<input
  type="text" 
  value={search} 
  onChange={(e) => {
    const newSearch = e.target.value;
    setSearch(newSearch);
    // ADD THIS:
    if (newSearch.length > 2) {
      trackSearch(newSearch);
    }
  }}
  placeholder="Search events, parks, farms..."
  ...
/>
    // Step 4: Track filter toggles (region, free only, weekend, month)
// For region filter (in FilterDrawer component or where region is set):
const handleRegionSelect = (region) => {
  setRegion(region);
  // ADD THIS:
  trackFilterApplied('region', region);
};

// For free only toggle (around line 138):
const toggleFreeOnly = () => {
  setFreeOnly((v) => !v);
  // ADD THIS:
  trackFilterApplied('free_only', !freeOnly ? 'enabled' : 'disabled');
};

// For weekend toggle:
const toggleWeekend = () => {
  setWeekend((v) => !v);
  // ADD THIS:
  trackFilterApplied('weekend', !weekend ? 'enabled' : 'disabled');
};

// For month toggle:
const toggleMonth = () => {
  setMonth((v) => !v);
  // ADD THIS:
  trackFilterApplied('month', !month ? 'enabled' : 'disabled');
};

// Step 5: Track "Learn more" and "Directions" clicks (around line 129-132)
const openOfficial = (ev) => {
  // ADD THIS:
  trackEventClickThrough(ev.title, 'learn_more');
  if (ev.officialUrl && ev.officialUrl !== '#') window.open(ev.officialUrl, '_blank')
}

const openDirections = (ev) => {
  // ADD THIS:
  trackEventClickThrough(ev.title, 'directions');
  const q = encodeURIComponent(ev.fullAddress || ev.title)
  window.open(`https://maps.google.com/?q=${q}`, '_blank')
}

// Step 6: Track page engagement time (useEffect at component start)
useEffect(() => {
  const startTime = Date.now();
  return () => {
    const timeSpent = (Date.now() - startTime) / 1000; // convert to seconds
    trackPageEngagement(timeSpent);
  };
}, []);

// Step 7: Track when user views an event card (in EventCard component or render)
// When rendering EventCard:
upcoming.map((ev) => (
  <EventCard
    key={ev.id}
    event={ev}
    onSelect={(event) => {
      trackEventClickThrough(event.title, 'card_click');
      openOfficial(event);
    }}
    onDirections={(event) => {
      trackEventClickThrough(event.title, 'directions_card');
      openDirections(event);
    }}
    isEditorPick={ev.isEditorPick}
    isPlayground={ev.contentType === 'playground'}
  />
))
  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#F7F4EF' }}>
      {/* Header */}
      <div style={{ background: 'white', padding: '16px 16px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', borderBottom: '0.5px solid #E2DDD6' }}>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 800, letterSpacing: -0.5 }}>
          <span style={{ color: '#1A6B4A' }}>Ne</span><span style={{ color: '#C94F2C' }}>x</span><span style={{ color: '#1A6B4A' }}>plore</span>
        </div>
        <div style={{ fontSize: 10, color: '#888880', marginTop: 2, fontStyle: 'italic' }}>Family adventures in your neighborhood</div>
      </div>

      {/* Search bar */}
      <div style={{ padding: '10px 16px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', background: 'white', borderRadius: 50, border: '1px solid #E2DDD6', padding: '0 6px 0 14px', height: 44, boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
          <SearchIcon />
          <input
            type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search events, parks, farms..."
            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 12, color: '#2D2D2D', padding: '0 10px', fontFamily: "'DM Sans', sans-serif" }}
          />
          <div onClick={() => setDrawerOpen(true)} style={{ width: 34, height: 34, borderRadius: '50%', background: filterCount > 0 ? '#1A6B4A' : '#F7F4EF', border: `1px solid ${filterCount > 0 ? '#1A6B4A' : '#E2DDD6'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, position: 'relative' }}>
            <FilterIcon active={filterCount > 0} />
            {filterCount > 0 && <div style={{ position: 'absolute', top: -3, right: -3, width: 14, height: 14, borderRadius: '50%', background: '#C94F2C', color: 'white', fontSize: 8, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{filterCount}</div>}
          </div>
        </div>
      </div>

      {/* Category / theme pills */}
      <div style={{ display: 'flex', gap: 6, padding: '10px 0 0 16px', overflowX: 'auto' }}>
        {PILLS.map((p) => (
          <div key={p.label} onClick={() => choosePill(p.label)} style={{ flexShrink: 0, fontSize: 10, fontWeight: 500, padding: '4px 12px', borderRadius: 20, border: `0.5px solid ${pill === p.label ? '#2D2D2D' : '#E2DDD6'}`, color: pill === p.label ? 'white' : '#888880', background: pill === p.label ? '#2D2D2D' : 'white', cursor: 'pointer' }}>{p.label}</div>
        ))}
      </div>

      {/* Amenity sub-filters — only when category or Water Play active, excluding family-friendly */}
      {showAmenities && amenityOptions.length > 0 && (
        <div style={{ display: 'flex', gap: 6, padding: '8px 0 0 16px', overflowX: 'auto' }}>
          {amenityOptions.map((name) => {
            const on = amenities.includes(name)
            return (
              <div key={name} onClick={() => toggleAmenity(name)} style={{ flexShrink: 0, fontSize: 10, fontWeight: on ? 600 : 500, padding: '4px 11px', borderRadius: 20, border: `0.5px solid ${on ? '#1A6B4A' : '#E2DDD6'}`, color: on ? 'white' : '#888880', background: on ? '#1A6B4A' : 'white', cursor: 'pointer' }}>{prettify(name)}</div>
            )
          })}
        </div>
      )}

      {/* Date/time chips — ONLY when Events pill is active */}
      {showDateChips && (
        <div style={{ display: 'flex', gap: 6, padding: '7px 16px 9px', borderBottom: '0.5px solid #E2DDD6', overflowX: 'auto' }}>
          {chips.map(({ label, active, toggle }) => (
            <div key={label} onClick={toggle} style={{ flexShrink: 0, fontSize: 10, fontWeight: active ? 600 : 500, padding: '3px 10px', borderRadius: 20, border: `0.5px solid ${active ? '#1A6B4A' : '#E2DDD6'}`, color: active ? '#1A6B4A' : '#888880', background: active ? '#E8F5EE' : 'white', cursor: 'pointer' }}>{label}</div>
          ))}
        </div>
      )}

      {/* Divider when no date chips showing */}
      {!showDateChips && (
        <div style={{ borderBottom: '0.5px solid #E2DDD6', margin: '7px 0 0' }} />
      )}

      {/* Count */}
      <div style={{ fontSize: 9, fontWeight: 700, color: '#888880', textTransform: 'uppercase', letterSpacing: '0.6px', padding: '9px 16px 6px' }}>
        {loading ? 'Loading...' : `${upcoming.length} thing${upcoming.length !== 1 ? 's' : ''} to do${month ? ' in June' : ''}`}
      </div>

      {error && (
        <div style={{ margin: '0 16px 10px', padding: '10px 14px', borderRadius: 10, background: '#FEF0E6', border: '0.5px solid #C94F2C', fontSize: 12, color: '#C94F2C' }}>⚠️ {error}</div>
      )}

      {!loading && <PicksRow picks={picks} onSelect={openOfficial} />}

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, padding: '0 16px 20px' }}>
        {loading
          ? [1, 2, 3, 4].map((i) => <EventCardSkeleton key={i} />)
          : upcoming.map((ev) => (
              <EventCard
                key={ev.id}
                event={ev}
                onSelect={openOfficial}
                onDirections={openDirections}
                isEditorPick={ev.isEditorPick}
                isPlayground={ev.contentType === 'playground'}
              />
            ))}
      </div>

      {/* Past events */}
      {!loading && past.length > 0 && (
        <>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.6px', padding: '8px 16px 6px', borderTop: '0.5px solid #E2DDD6' }}>Past events</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, padding: '0 16px 20px', opacity: 0.5 }}>
            {past.map((ev) => <EventCard key={ev.id} event={ev} onSelect={openOfficial} onDirections={openDirections} />)}
          </div>
        </>
      )}

      {/* Empty state */}
      {!loading && upcoming.length === 0 && !error && (
        <div style={{ textAlign: 'center', padding: '50px 24px' }}>
          <div style={{ fontSize: 44, marginBottom: 14 }}>🌿</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#888', marginBottom: 6 }}>No events found</div>
          <div style={{ fontSize: 12, color: '#aaa', lineHeight: 1.7 }}>Try removing a filter or selecting a different neighborhood.</div>
        </div>
      )}

      <div style={{ height: 32 }} />

      <FilterDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} region={region} setRegion={setRegion} freeOnly={freeOnly} setFreeOnly={setFreeOnly} />
    </div>
  )
}
