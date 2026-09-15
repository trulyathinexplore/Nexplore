import { useState, useEffect } from 'react'
import { fetchEvents, mapEvent, resolveCoords } from './supabase.js'
import { PILLS, REGION_CITIES, matchesPill, detectPillFromSearch, detectCityFromSearch, EXCLUDED_AMENITY_TAGS, AMENITY_LABELS, themeFor } from './constants.js'
import { trackPillClick, trackEventClickThrough, trackFilterApplied, trackSearch, trackPageEngagement, trackJuly4thFilter, trackShare } from './analytics.js'
import { readFilters, writeFilters } from './urlState.js'
import {
  SearchIcon, FilterIcon, EventCard, EventCardSkeleton,  FilterDrawer,
  ShareSheet, EventSheet, ShareGlyph,
} from './components/ui.jsx'
import {
  eventUrl, currentViewUrl, eventShareText, viewShareText,
  targets, copyLink, canNativeShare, nativeShare,
} from './share.js'
import MapView from './components/MapView.jsx'
const PILL_LABELS = PILLS.map((p) => p.label)

// Which pills offer the map. 66 non-pumpkin rows (playgrounds, waterfronts,
// amusement parks) are linked to venues that already carry lat/lng, so without
// this gate the Map button turns up on almost every pill. Add a label here when
// a category is ready to be mapped.
const MAP_ENABLED_PILLS = ['Pumpkin Patches']
const REGION_LABELS = Object.keys(REGION_CITIES)
const prettify = (t) => t.replace(/-/g, ' ').replace(/\b\w/, (c) => c.toUpperCase())
const getAmenityLabel = (id) => AMENITY_LABELS[id] || prettify(id)
  const NOW = new Date()
const CURRENT_MONTH = NOW.getMonth()
const CURRENT_YEAR = NOW.getFullYear()
const CURRENT_MONTH_NAME = NOW.toLocaleString('en-US', { month: 'long' })

// True when the event overlaps the current calendar month at all, so a run that
// starts in July and ends in August still shows under the August chip.
function isInCurrentMonth(startStr, endStr) {
  const [startYear, startMonth, startDay] = startStr.split('-').map(Number)
  const start = new Date(Date.UTC(startYear, startMonth - 1, startDay))
  
  const monthStart = new Date(Date.UTC(CURRENT_YEAR, CURRENT_MONTH, 1, 0, 0, 0, 0))
  const monthEnd = new Date(Date.UTC(CURRENT_YEAR, CURRENT_MONTH + 1, 0, 23, 59, 59, 999))
  
  const parsedEnd = endStr ? (() => {
    const [endYear, endMonth, endDay] = endStr.split('-').map(Number)
    return new Date(Date.UTC(endYear, endMonth - 1, endDay))
  })() : start
  
  const end = Number.isNaN(parsedEnd.getTime()) ? start : parsedEnd
  return start <= monthEnd && end >= monthStart
}

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

// Check if an event falls in a specific month, keyed as "YYYY-M" so that
// the Jan chip shown in November means Jan of NEXT year, not this one.
function monthKey(year, month) {
  return `${year}-${month}`
}

function isInMonth(startStr, key) {
  if (!startStr) return false
  const [year, month, day] = startStr.split('-').map(Number)
  const start = new Date(Date.UTC(year, month - 1, day))
  if (Number.isNaN(start.getTime())) return false
  return monthKey(start.getUTCFullYear(), start.getUTCMonth() + 1) === key
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
  const [selectedMonthFilter, setSelectedMonthFilter] = useState(null)
  const [showMap, setShowMap] = useState(false)
  // Sharing. `shareTarget` is null, or { kind: 'event', event } / { kind: 'view' }.
  const [shareTarget, setShareTarget] = useState(null)
  const [copied, setCopied] = useState(false)
  // The id from ?event= on a shared link, held until the sheet is closed.
  const [openEventId, setOpenEventId] = useState(init.event)

  // Calculate current and next 2 months dynamically
  const getCurrentAndNextMonths = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const months = [];
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'];

    for (let i = 0; i < 3; i++) {
      const monthIndex = (currentMonth + i) % 12;
      const year = currentYear + Math.floor((currentMonth + i) / 12);
      months.push({
        label: monthNames[monthIndex],
        key: monthKey(year, monthIndex + 1),
      });
    }
    return months;
  };

  const monthFilters = getCurrentAndNextMonths();

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
    writeFilters({ pill, region, free: freeOnly, weekend, month, amenities, q: search, event: openEventId })
  }, [pill, region, freeOnly, weekend, month, amenities, search, openEventId])

  // Body must not scroll behind the full-screen map on iOS.
  useEffect(() => {
    if (!showMap) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [showMap])

  // Track page engagement (time spent on page)
  useEffect(() => {
    const startTime = Date.now()
    return () => {
      const timeSpent = (Date.now() - startTime) / 1000
      trackPageEngagement(timeSpent)
    }
  }, [])

  const activePill = PILLS.find((p) => p.label === pill) || PILLS[0]
  // Resolves to the shared default for every pill except Pumpkin Patches.
  const theme = themeFor(activePill.label)
  const showAmenities = activePill.type === 'category' || activePill.type === 'tagGroup' || activePill.type === 'seasonalType'
  // Only show date/time chips when Events pill is active
  const showDateChips = activePill.type === 'eventType'

  function choosePill(label) {
    setPill(label)
    // Track pill clicks (July 4th gets its own event)
    if (label === 'July 4th') {
      trackJuly4thFilter()
    } else {
      trackPillClick(label)
    }
    const ap = PILLS.find((p) => p.label === label)
    if (!(ap.type === 'category' || ap.type === 'tagGroup' || ap.type === 'seasonalType')) setAmenities([])
    // Auto-deactivate month filter when leaving Events pill
    if (ap.type !== 'eventType') setSelectedMonthFilter(null)
  }

  const toggleAmenity = (name) =>
    setAmenities((cur) => (cur.includes(name) ? cur.filter((a) => a !== name) : [...cur, name]))

  // Search handler with tracking
  const handleSearchChange = (newSearch) => {
    setSearch(newSearch)
    if (newSearch.length > 2) trackSearch(newSearch)
  }

  // Filter toggles with tracking
  const toggleFreeOnly = () => {
    setFreeOnly((v) => !v)
    trackFilterApplied('free_only', !freeOnly ? 'enabled' : 'disabled')
  }

  const toggleWeekend = () => {
    setWeekend((v) => !v)
    setSelectedMonthFilter(null)
    trackFilterApplied('weekend', !weekend ? 'enabled' : 'disabled')
  }

  const toggleMonth = () => {
    setMonth((v) => !v)
    trackFilterApplied('month', !month ? 'enabled' : 'disabled')
  }

  // Detect intent from search: city and/or keyword to pill mapping
  const searchDetectedPill = detectPillFromSearch(search)
  const searchDetectedCity = detectCityFromSearch(search)

  const passesBase = (ev) => {
    if (search) {
      const s = search.toLowerCase()
      // If search maps to a pill (e.g. "splash pad" to Water Play), use that pill logic
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

    if (weekend && ev.startDate && !isThisWeekend(ev.startDate)) return false
    // NEW: Month filter based on selectedMonthFilter
    if (selectedMonthFilter && ev.startDate && !isInMonth(ev.startDate, selectedMonthFilter)) return false
    return true
  }

  const base = events.filter(passesBase)

  // Amenity sub-pills: use a fixed curated list if the active pill declares one (Playground, Water Play),
  // otherwise fall back to the original dynamic computation (Farm, Museum, County Fairs, etc. — unchanged)
  const amenityOptions = activePill.fixedAmenities
    ? activePill.fixedAmenities
    : [...new Set(
        base.flatMap((ev) => {
          // Every pill reads amenities from tags. Pumpkin patches used to parse
          // them out of the description text instead; that path was removed once
          // the pill stopped being a seasonalType and the tags were backfilled.
          return ev.tags
            .filter((t) => {
              if (t.tag_group !== 'amenity' && t.tag_group !== 'water-feature') return false
              if (EXCLUDED_AMENITY_TAGS.includes(t.name.toLowerCase())) return false
              return true
            })
            .map((t) => t.name)
        }),
      )].sort()

  // 'free' is a special case — it maps to price_type ('ev.free'), not a tag, so it can't be matched via ev.tags
const filtered = base.filter((ev) => {
    return amenities.every((a) => {
      if (a === 'free') return ev.free === true
      return ev.tags.some((t) => t.name === a)
    })
  })

  const now = new Date()
  const upcoming = filtered.filter((ev) => !ev.endDate || new Date(ev.endDate + 'T23:59:59') >= now)
  const past = filtered.filter((ev) => ev.endDate && new Date(ev.endDate + 'T23:59:59') < now)

  // The Map button only earns its place when something can actually be plotted.
  // As coordinates land on other categories, it starts appearing there too,
  // with no further changes here.
  const mapEnabled = MAP_ENABLED_PILLS.includes(activePill.label)
  const mappable = mapEnabled
    ? upcoming.filter((ev) => typeof ev.lat === 'number' && typeof ev.lng === 'number')
    : []

  // Back-fill coordinates for anything that has a street address but no
  // lat/lng, the same way resolveImage back-fills a missing cover photo. The
  // result is written to Supabase, so each row is geocoded once ever and an
  // address added in the admin tool becomes a pin on its own.
  //
  // Like the effect below, this MUST stay under `upcoming` and `mapEnabled`:
  // a dependency array is evaluated during render, and referencing either from
  // higher up throws "Cannot access before initialization" and white-screens
  // the app.
  useEffect(() => {
    if (!mapEnabled || loading) return
    const todo = upcoming.filter((ev) => ev.lat == null && ev.addressLine).slice(0, 6)
    if (todo.length === 0) return

    let cancelled = false
    ;(async () => {
      for (const ev of todo) {
        if (cancelled) return
        const pair = await resolveCoords(ev.addressLine, ev.id)
        if (cancelled) return
        if (pair) {
          setEvents((prev) =>
            prev.map((r) => (r.id === ev.id ? { ...r, lat: pair.lat, lng: pair.lng } : r)),
          )
        }
        // Nominatim's usage policy asks for no more than one request a second.
        await new Promise((r) => setTimeout(r, 1200))
      }
    })()
    return () => { cancelled = true }
  }, [mapEnabled, loading, upcoming.length])

  // A filter change can empty the map out from under an open map view; drop
  // back to the list rather than show a blank map.
  //
  // This MUST stay below `mappable`. A dependency array is evaluated during
  // render, so referencing `mappable.length` from an effect declared earlier in
  // the component throws "Cannot access 'mappable' before initialization" and
  // white-screens the whole app. `vite build` does not catch it — see
  // .smoke/render-test.jsx, which does.
  useEffect(() => {
    if (showMap && !loading && mappable.length === 0) setShowMap(false)
  }, [showMap, loading, mappable.length])

 const filterCount = [weekend, freeOnly, !!region, !!selectedMonthFilter].filter(Boolean).length + amenities.length

  // Click-through handlers with tracking
  const openOfficial = (ev) => {
    trackEventClickThrough(ev.title, 'learn_more')
    if (ev.officialUrl && ev.officialUrl !== '#') window.open(ev.officialUrl, '_blank')
  }

  const openDirections = (ev) => {
    trackEventClickThrough(ev.title, 'directions')
    // Send the NAME as well as the address. Given an address alone Google drops
    // a pin on the mailing point, which for a farm is often a field edge rather
    // than the entrance — searching "Lemos Farm, 12320 San Mateo Rd…" resolves
    // to the actual business listing instead, the same result as Googling it.
    // The address stays in the query so a name Google doesn't recognise (the
    // pool events, say) still lands in the right place.
    const q = encodeURIComponent(
      ev.fullAddress ? `${ev.title}, ${ev.fullAddress}` : ev.title,
    )
    window.open(`https://maps.google.com/?q=${q}`, '_blank')
  }

  const chips = [
    { label: `🗓 ${CURRENT_MONTH_NAME}`, active: month, toggle: toggleMonth },
    { label: '📅 This weekend', active: weekend, toggle: toggleWeekend },
    { label: '🏷 Free only', active: freeOnly, toggle: toggleFreeOnly },
  ]

  // ---- Sharing ------------------------------------------------------------
  // A shared link can point at a row the current filters exclude, so look in
  // the full loaded set rather than in `upcoming`.
  const openEvent = openEventId
    ? events.find((ev) => String(ev.id) === String(openEventId)) || null
    : null

  const shareEvent = (ev) => { setCopied(false); setShareTarget({ kind: 'event', event: ev }) }
  const shareView = () => { setCopied(false); setShareTarget({ kind: 'view' }) }

  const sharePayload = !shareTarget ? null : shareTarget.kind === 'event'
    ? (() => {
        const ev = shareTarget.event
        return {
          heading: ev.title,
          subheading: [ev.city || ev.area, ev.price || (ev.free ? 'Free' : null)].filter(Boolean).join(' · '),
          url: eventUrl(ev),
          text: eventShareText(ev),
          subject: `Nexplore: ${ev.title}`,
          label: ev.title,
        }
      })()
    : {
        heading: pill === 'All' ? 'Things to do in the Bay Area' : pill,
        subheading: `${upcoming.length} place${upcoming.length !== 1 ? 's' : ''} · nexplore.us`,
        url: currentViewUrl(),
        text: viewShareText(pill, upcoming.length),
        subject: `Nexplore: ${pill === 'All' ? 'things to do' : pill}`,
        label: `view:${pill}`,
      }

  // sms: and mailto: are handed to location.href rather than window.open —
  // a popup-blocked window.open silently does nothing on iOS Safari.
  const shareTiles = !sharePayload ? [] : [
    {
      key: 'whatsapp', label: 'WhatsApp', bg: '#25D366',
      icon: (
        <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 11.5a8.5 8.5 0 0 1-12.3 7.6L3.5 20.5l1.4-5.1A8.5 8.5 0 1 1 21 11.5z" />
        </svg>
      ),
      run: () => { trackShare('whatsapp', sharePayload.label); window.open(targets.whatsapp(sharePayload.text, sharePayload.url), '_blank') },
    },
    {
      key: 'sms', label: 'Messages', bg: '#34C759',
      icon: (
        <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 14.5a2.5 2.5 0 0 1-2.5 2.5H8l-4 3.5V5.5A2.5 2.5 0 0 1 6.5 3h12A2.5 2.5 0 0 1 21 5.5z" />
        </svg>
      ),
      run: () => { trackShare('sms', sharePayload.label); window.location.href = targets.sms(sharePayload.text, sharePayload.url) },
    },
    {
      key: 'email', label: 'Email', bg: '#F0EDE8',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#44403c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2.5" y="4.5" width="19" height="15" rx="2.5" />
          <path d="m3.5 7 8.5 5.5L20.5 7" />
        </svg>
      ),
      run: () => { trackShare('email', sharePayload.label); window.location.href = targets.email(sharePayload.text, sharePayload.url, sharePayload.subject) },
    },
    {
      key: 'copy', label: copied ? 'Copied' : 'Copy link', bg: '#F0EDE8',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#44403c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 13.5a4.5 4.5 0 0 0 6.8.5l2.7-2.7a4.5 4.5 0 0 0-6.4-6.4l-1.5 1.6" />
          <path d="M14 10.5a4.5 4.5 0 0 0-6.8-.5l-2.7 2.7a4.5 4.5 0 0 0 6.4 6.4l1.5-1.6" />
        </svg>
      ),
      run: async () => { const ok = await copyLink(sharePayload.url); setCopied(ok); trackShare('copy_link', sharePayload.label) },
    },
    ...(canNativeShare() ? [{
      key: 'more', label: 'More', bg: '#F0EDE8',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#44403c" strokeWidth="2">
          <circle cx="5.5" cy="12" r="1.6" fill="#44403c" />
          <circle cx="12" cy="12" r="1.6" fill="#44403c" />
          <circle cx="18.5" cy="12" r="1.6" fill="#44403c" />
        </svg>
      ),
      run: () => { trackShare('native', sharePayload.label); nativeShare(sharePayload.heading, sharePayload.text, sharePayload.url) },
    }] : []),
  ]

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
            type="text" value={search} onChange={(e) => handleSearchChange(e.target.value)}
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
          <div key={p.label} onClick={() => choosePill(p.label)} style={{ flexShrink: 0, fontSize: 10, fontWeight: 500, padding: '4px 12px', borderRadius: 20, border: `0.5px solid ${pill === p.label ? themeFor(p.label).pillActiveBorder : '#E2DDD6'}`, color: pill === p.label ? 'white' : '#888880', background: pill === p.label ? themeFor(p.label).pillActiveBg : 'white', cursor: 'pointer' }}>{p.label}</div>
        ))}
      </div>

      {/* Amenity sub-filters — only when category or Water Play active, excluding family-friendly */}
      {showAmenities && amenityOptions.length > 0 && (
        <div style={{ display: 'flex', gap: 6, padding: '8px 0 0 16px', overflowX: 'auto' }}>
        {amenityOptions.map((name) => {
  const on = amenities.includes(name)
  const label = prettify(name)
  return (
    <div key={name} onClick={() => toggleAmenity(name)} style={{ flexShrink: 0, fontSize: 10, fontWeight: on ? 600 : 500, padding: '4px 11px', borderRadius: 20, border: `0.5px solid ${on ? theme.chipOnBorder : '#E2DDD6'}`, color: on ? theme.chipOnFg : '#888880', background: on ? theme.chipOnBg : 'white', cursor: 'pointer' }}>{label}</div>
  )
})}
        </div>
      )}

      {/* Month Filters - Dynamic Current + Next 2 Months (UPDATED) */}
      {showDateChips && (
        <div style={{ display: 'flex', gap: 6, padding: '7px 16px 9px', borderBottom: '0.5px solid #E2DDD6', overflowX: 'auto' }}>
          {monthFilters.map((monthFilter, idx) => (
            <div
              key={monthFilter.key}
              onClick={() => {
                setSelectedMonthFilter(
                  selectedMonthFilter === monthFilter.key ? null : monthFilter.key
                )
                setWeekend(false)
              }}
              style={{
                flexShrink: 0,
                fontSize: 10,
                fontWeight: selectedMonthFilter === monthFilter.key ? 600 : 500,
                padding: '3px 10px',
                borderRadius: 20,
                border: `0.5px solid ${selectedMonthFilter === monthFilter.key ? '#1A6B4A' : '#E2DDD6'}`,
                color: selectedMonthFilter === monthFilter.key ? '#1A6B4A' : '#888880',
                background: selectedMonthFilter === monthFilter.key ? '#E8F5EE' : 'white',
                cursor: 'pointer'
              }}
            >
              📅 {monthFilter.label}
            </div>
          ))}
          {/* Keep This weekend and Free only chips */}
          {chips.slice(1).map(({ label, active, toggle }) => (
            <div key={label} onClick={toggle} style={{ flexShrink: 0, fontSize: 10, fontWeight: active ? 600 : 500, padding: '3px 10px', borderRadius: 20, border: `0.5px solid ${active ? '#1A6B4A' : '#E2DDD6'}`, color: active ? '#1A6B4A' : '#888880', background: active ? '#E8F5EE' : 'white', cursor: 'pointer' }}>{label}</div>
          ))}
        </div>
      )}

      {/* Divider when no date chips showing */}
      {!showDateChips && (
        <div style={{ borderBottom: '0.5px solid #E2DDD6', margin: '7px 0 0' }} />
      )}

      {/* Count, with the view toggle and Save or share alongside it.
          The floating map button tested as easy to miss, and on its own it
          never told anyone they were currently looking at a list. */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '9px 16px 6px' }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: '#888880', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
          {loading ? 'Loading...' : `${upcoming.length} thing${upcoming.length !== 1 ? 's' : ''} to do`}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {!loading && mappable.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 2, background: 'white', border: '0.5px solid #E2DDD6', borderRadius: 20, padding: 2 }}>
              <div
                onClick={() => setShowMap(false)}
                style={{ padding: '4px 10px', borderRadius: 20, fontSize: 9, fontWeight: showMap ? 500 : 700, background: showMap ? 'transparent' : '#2D2D2D', color: showMap ? '#888880' : 'white', cursor: 'pointer' }}
              >
                List
              </div>
              <div
                onClick={() => setShowMap(true)}
                style={{ padding: '4px 10px', borderRadius: 20, fontSize: 9, fontWeight: showMap ? 700 : 500, background: showMap ? '#2D2D2D' : 'transparent', color: showMap ? 'white' : '#888880', cursor: 'pointer' }}
              >
                Map
              </div>
            </div>
          )}

          {!loading && upcoming.length > 0 && (
            <div
              onClick={shareView}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px', background: theme.accentSoft, border: `0.5px solid ${theme.accent}33`, borderRadius: 20, cursor: 'pointer' }}
            >
              <ShareGlyph size={11} color={theme.accent} />
              <span style={{ fontSize: 9, fontWeight: 700, color: theme.accent, whiteSpace: 'nowrap' }}>Save or share</span>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div style={{ margin: '0 16px 10px', padding: '10px 14px', borderRadius: 10, background: '#FEF0E6', border: '0.5px solid #C94F2C', fontSize: 12, color: '#C94F2C' }}>⚠️ {error}</div>
      )}

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, padding: '0 16px 20px' }}>
        {loading
          ? [1, 2, 3, 4].map((i) => <EventCardSkeleton key={i} />)
          : upcoming.map((ev) => (
              <EventCard
                key={ev.id}
                event={ev}
                theme={theme}
                onSelect={openOfficial}
                onDirections={openDirections}
                onShare={shareEvent}
                isEditorPick={ev.isEditorPick}
                isPlayground={ev.category === 'Playground'}
              />
            ))}
      </div>

      {/* Past events */}
      {!loading && past.length > 0 && (
        <>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.6px', padding: '8px 16px 6px', borderTop: '0.5px solid #E2DDD6' }}>Past events</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, padding: '0 16px 20px', opacity: 0.5 }}>
            {past.map((ev) => <EventCard key={ev.id} event={ev} theme={theme} onSelect={openOfficial} onDirections={openDirections} onShare={shareEvent} />)}
          </div>
        </>
      )}

      {/* Empty state — pill-level "Coming soon" (zero matches before any sub-pill filter)
          vs. the existing "no results" message (a sub-pill/amenity combo emptied out an otherwise populated pill) */}
      {!loading && upcoming.length === 0 && !error && (
        base.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 24px' }}>
            <div style={{ fontSize: 44, marginBottom: 14 }}>🚧</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#888', marginBottom: 6 }}>Coming soon</div>
            <div style={{ fontSize: 12, color: '#aaa', lineHeight: 1.7 }}>We're still adding things to do here — check back soon.</div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '50px 24px' }}>
            <div style={{ fontSize: 44, marginBottom: 14 }}>🌿</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#888', marginBottom: 6 }}>No events found</div>
            <div style={{ fontSize: 12, color: '#aaa', lineHeight: 1.7 }}>Try removing a filter or selecting a different neighborhood.</div>
          </div>
        )
      )}
      <div style={{ height: 72 }} />

      {/* Floating list/map toggle. An add-on to the list, never a replacement —
          the list stays the default view on every load. */}
      {!loading && mappable.length > 0 && !drawerOpen && !showMap && !openEvent && !shareTarget && (
        <button
          onClick={() => setShowMap(true)}
          style={{
            position: 'fixed', left: '50%', transform: 'translateX(-50%)', bottom: 22, zIndex: 950,
            display: 'flex', alignItems: 'center', gap: 8, background: '#2D2D2D', color: 'white',
            border: '2.5px solid white', borderRadius: 50, padding: '13px 24px', fontSize: 14, fontWeight: 700,
            fontFamily: "'DM Sans', sans-serif", cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(0,0,0,0.34)',
          }}
        >
          🗺 Show map · {mappable.length}
        </button>
      )}

      {showMap && (
        <MapView
          events={mappable}
          onSelect={openOfficial}
          onDirections={openDirections}
          onClose={() => setShowMap(false)}
        />
      )}

      <FilterDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} region={region} setRegion={setRegion} freeOnly={freeOnly} setFreeOnly={setFreeOnly} />

      {/* What a shared link lands on. Only mounts once the row it names has
          actually loaded, so a bad or stale id just shows the normal list. */}
      <EventSheet
        event={openEvent}
        theme={theme}
        onClose={() => setOpenEventId(null)}
        onSelect={openOfficial}
        onDirections={openDirections}
        onShare={shareEvent}
      />

      <ShareSheet
        open={!!shareTarget}
        onClose={() => { setShareTarget(null); setCopied(false) }}
        heading={sharePayload?.heading}
        subheading={sharePayload?.subheading}
        url={sharePayload?.url}
        tiles={shareTiles}
        copied={copied}
      />
    </div>
  )
}
