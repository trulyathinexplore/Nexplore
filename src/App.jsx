import { useState, useEffect, useRef } from 'react'
import { fetchEvents, mapEvent, resolveCoords } from './supabase.js'
import { PILLS, PAGE_AMENITY_LABELS, REGION_CITIES, matchesPill, detectPillFromSearch, detectCityFromSearch, EXCLUDED_AMENITY_TAGS, AMENITY_LABELS, themeFor, countLabel, hidesPrice, hidesPriceForEvent, pinStyleFor } from './constants.js'
import { orderForPill, orderTopPicks, avoidSameFirst } from './ordering.js'
import { sortClosedLast, isClosedForSeason } from './season.js'
import {
  trackPillClick, trackEventClickThrough, trackFilterApplied, trackSearch,
  trackPageEngagement, trackJuly4thFilter, trackShare,
  trackCategoryView, trackScrollDepth, trackAmenityFilter, trackMapOpen,
  trackMapPinClick, trackShareArrival, trackSearchNoResults, trackEmptyState,
} from './analytics.js'
import { readFilters, writeFilters } from './urlState.js'
import {
  SearchIcon, FilterIcon, EventCard, EventCardSkeleton,  FilterDrawer,
  ShareSheet, EventSheet, ShareGlyph, addToCalendar,
} from './components/ui.jsx'
import { CategoryRow, FeatureCard, CompactRow, PageHead, featureLabel } from './components/Redesign.jsx'
import {
  eventUrl, viewUrl, eventShareText, viewShareText,
  targets, copyLink, canNativeShare, nativeShare,
} from './share.js'
import MapView from './components/MapView.jsx'
import {
  DayRibbon, Mosaic, SeasonCard, GROUPS, WIDE_CITIES, groupsOf, groupName, groupChips,
  collapseSeries, seasonPagesNow, onDay, dayTitle,
} from './components/EventsPage.jsx'
import Home from './components/Home.jsx'
const PILL_LABELS = PILLS.map((p) => p.label)

// The line shown when every result in a category is out of season. Kept here,
// next to nothing else, so the copy is editable in one place without hunting
// through JSX. Falls back to wording that works for any pill.
const OUT_OF_SEASON_HEADLINES = {
  'Pumpkin Patches': 'Pumpkin patches are done for the year.',
  'Halloween': 'Halloween is over for this year.',
  'Fruit Picking': 'Picking season has finished for now.',
  'Boat Rides': 'Most boat rentals have closed for the season.',
  'Water Play': 'Water play spots are closed for the season.',
  'County Fairs': 'Fair season is over for this year.',
}
const outOfSeasonHeadline = (pillLabel) =>
  OUT_OF_SEASON_HEADLINES[pillLabel] || 'These are closed for the season.'


// Which pills offer the map. 66 non-pumpkin rows (playgrounds, waterfronts,
// amusement parks) are linked to venues that already carry lat/lng, so without
// this gate the Map button turns up on almost every pill. Add a label here when
// a category is ready to be mapped.
const MAP_ENABLED_PILLS = ['Pumpkin Patches', 'Playground']
const REGION_LABELS = Object.keys(REGION_CITIES)
const prettify = (t) => t.replace(/-/g, ' ').replace(/\b\w/, (c) => c.toUpperCase())
const getAmenityLabel = (id, page) => PAGE_AMENITY_LABELS[page]?.[id] || AMENITY_LABELS[id] || prettify(id)
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

// The weekend after this one. Same shape as isThisWeekend, one week on.
function isNextWeekend(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  const now = new Date(); now.setHours(0, 0, 0, 0)
  const day = now.getDay()
  const sat = new Date(now)
  if (day === 0) sat.setDate(now.getDate() - 1)
  else sat.setDate(now.getDate() + ((6 - day + 7) % 7))
  sat.setDate(sat.getDate() + 7)
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

// Off for this release. See the search bar block below for why, and flip this
// to true to bring it back.
const SHOW_SEARCH = false

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
  // Which card is open. One at a time on purpose: two open cards in a two
  // column grid push each other around and nobody can follow what moved.
  const [expandedId, setExpandedId] = useState(null)
  const [amenities, setAmenities] = useState(init.amenities)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedMonthFilter, setSelectedMonthFilter] = useState(null)
  const [showMap, setShowMap] = useState(init.map)
  // Sharing. `shareTarget` is null, or { kind: 'event', event } / { kind: 'view' }.
  const [shareTarget, setShareTarget] = useState(null)
  const [copied, setCopied] = useState(false)
  // The id from ?event= on a shared link, held until the sheet is closed.
  const [openEventId, setOpenEventId] = useState(init.event)
  const [sheetAutoPlay, setSheetAutoPlay] = useState(false)
  // The pinned filter/title block sits right under the sticky header; keep its
  // offset equal to the header's real height.
  useEffect(() => {
    const el = document.querySelector('.nx-top')
    if (!el || typeof ResizeObserver === 'undefined') return
    const set = () => document.documentElement.style.setProperty('--nx-top-h', `${el.offsetHeight}px`)
    set()
    const ro = new ResizeObserver(set)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  // Held in state rather than re-read from the URL each render, because
  // writeFilters rewrites the address bar and anything not carried there is
  // gone by the second render.
  const [section] = useState(init.section)
  // Redesign: Near [city] picker and the Next weekend chip.
  const [city, setCity] = useState(init.city)
  const [nextWeekend, setNextWeekend] = useState(false)
  // Events page (Oct 2026): the picked day on the ribbon (YYYY-MM-DD or null),
  // the mosaic group whose list is open, and whether Halloween / Pumpkin
  // Patches was reached from an Events tile (shows the "‹ Events" button).
  const [dayPick, setDayPick] = useState(null)
  const [openGroup, setOpenGroup] = useState(null)
  const [backToEvents, setBackToEvents] = useState(false)
  const groupListRef = useRef(null)

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
    writeFilters({ pill, region, free: freeOnly, weekend, month, amenities, q: search, event: openEventId, map: showMap, section, city })
    // A card left open on one filter has no business being open on the next.
    setExpandedId(null)
  }, [pill, region, freeOnly, weekend, month, amenities, search, openEventId, showMap, section, city, nextWeekend, dayPick])

  // A tapped mosaic tile opens its list below; bring it into view.
  useEffect(() => {
    if (openGroup && groupListRef.current) groupListRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [openGroup])

  // A real page_view per category. Without this GA sees one page_view for the
  // whole visit and every standard report collapses the site into a single
  // page, which is why per-category visits were not measurable at all.
  useEffect(() => { trackCategoryView(pill || 'Home') }, [pill])

  // Someone arrived through a shared link. ?event= is produced by nothing but
  // share, so it needs no tracking parameter to be recognisable.
  useEffect(() => {
    if (init.event) trackShareArrival('event', String(init.event))
    else if (init.map) trackShareArrival('map', init.pill)
    else if (window.location.search.includes('view=')) trackShareArrival('view', init.pill)
  }, [])

  // Scroll depth per category. GA's own scroll event fires once at 90% per
  // page LOAD, which in a single page app is once per visit. Reset on every
  // pill change so the numbers mean "how far down this category" rather than
  // "how far down today".
  useEffect(() => {
    const hit = new Set()
    const onScroll = () => {
      const doc = document.documentElement
      const scrollable = doc.scrollHeight - window.innerHeight
      if (scrollable < 200) return // short list, nothing to measure
      const pct = Math.round(((window.scrollY || 0) / scrollable) * 100)
      for (const mark of [25, 50, 75, 100]) {
        if (pct >= mark && !hit.has(mark)) {
          hit.add(mark)
          trackScrollDepth(mark, pill)
        }
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [pill])

  // Body must not scroll behind the full-screen map on iOS.
  // (The map used to be full screen and locked body scroll here. In the
  // redesign it sits inside the page, so the page keeps scrolling.)

  // Track page engagement (time spent on page)
  useEffect(() => {
    const startTime = Date.now()
    return () => {
      const timeSpent = (Date.now() - startTime) / 1000
      trackPageEngagement(timeSpent)
    }
  }, [])

  // null when no pill is chosen, which is the HOME state. matchesPill treats a
  // null pill as "everything", which is what makes search from home reach
  // across every category — the one job the All pill was still doing.
  const activePill = pill ? (PILLS.find((p) => p.label === pill) || null) : null

  // Home is showing unless a pill is chosen OR the user has typed a search.
  // Typing into the search box from home drops you into unscoped results,
  // rather than leaving you staring at the marketing page.
  // openEventId excluded deliberately: a bare ?event= link should open its
  // sheet over a list of things, not over the marketing page.
  const isHome = !pill && !search.trim() && !openEventId

  // Resolves to the shared default for every pill except Pumpkin Patches.
  const theme = themeFor(activePill?.label)

  // A shared link pointing at a row that has since been unpublished or deleted
  // lands on home rather than on a listless list. Only after loading finishes,
  // so a valid link never flickers through the home page on its way in.
  useEffect(() => {
    if (loading || !openEventId) return
    if (!events.some((ev) => String(ev.id) === String(openEventId))) setOpenEventId(null)
  }, [loading, openEventId, events.length])

  // ?section= deep links. Waits for the home page to exist before scrolling,
  // which is the whole reason this is not a #hash: the browser resolves a hash
  // before React has rendered, finds nothing and silently gives up.
  //
  // MUST stay below `isHome`. A dependency array is evaluated during render, so
  // an effect declared above it throws "Cannot access 'isHome' before
  // initialization" and white-screens the app. vite build compiles it happily;
  // smoke.mjs is what catches it.
  useEffect(() => {
    if (!section || !isHome || loading) return
    const el = document.getElementById(`section-${section}`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [isHome, loading])
  // noAmenities opts a pill out of the sub-filter row entirely. Without it a
  // pill with no fixedAmenities list gets whatever tags happen to exist on its
  // rows, which is how Halloween ended up offering "Light installations" and
  // "Night event": nobody chose those, they were a side effect of tagging.
  const showAmenities = !activePill?.noAmenities
    && (activePill?.type === 'category' || activePill?.type === 'tagGroup' || activePill?.type === 'seasonalType')
  // Only show date/time chips when Events pill is active
  const isEventsPage = activePill?.label === 'Events'

  // Every filter starts fresh on every page change (Near, sub-pills, Free,
  // dates). Shared links still arrive with their filters, because those are
  // read from the URL on load, not set here.
  function resetFilters() {
    setRegion(null)
    setCity(null)
    setAmenities([])
    setFreeOnly(false)
    setWeekend(false)
    setNextWeekend(false)
    setSelectedMonthFilter(null)
    setDayPick(null)
    setOpenGroup(null)
  }

  function choosePill(label, opts = {}) {
    setPill(label)
    resetFilters()
    setBackToEvents(!!opts.fromEvents)
    if (opts.scroll !== false) window.scrollTo(0, 0)
    // Track pill clicks (July 4th gets its own event)
    if (label === 'July 4th') {
      trackJuly4thFilter()
    } else {
      trackPillClick(label)
    }
    setShowMap(false)
  }

  // Back to the front door, from the home pill or the wordmark. Clears every
  // bit of view state, because arriving home with someone's old amenity chips
  // still applied is the kind of thing that looks like a bug.
  function goHome() {
    setPill(null)
    setSearch('')
    resetFilters()
    setBackToEvents(false)
    setShowMap(false)
    setOpenEventId(null)
    window.scrollTo(0, 0)
  }

  const toggleAmenity = (name) =>
    setAmenities((cur) => {
      const on = !cur.includes(name)
      trackAmenityFilter(name, on, pill)
      return on ? [...cur, name] : cur.filter((a) => a !== name)
    })

  // One place for opening the map, so every entry point is tracked and the
  // URL always reflects what is on screen.
  const openMap = (source) => {
    setShowMap(true)
    trackMapOpen(source, pill, mappable.length)
  }

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
    if (searchDetectedPill && activePill && !matchesPill(ev, activePill)) return false
    if (region && REGION_CITIES[region] && !REGION_CITIES[region].includes(ev.city)) return false

    // On Events, chain-store listings ("Bay Area") show under every city.
    if (city && (ev.city || '') !== city && !(isEventsPage && WIDE_CITIES.includes(ev.city))) return false
    if (weekend && ev.startDate && !isThisWeekend(ev.startDate)) return false
    if (nextWeekend && ev.startDate && !isNextWeekend(ev.startDate)) return false
    // NEW: Month filter based on selectedMonthFilter
    if (selectedMonthFilter && ev.startDate && !isInMonth(ev.startDate, selectedMonthFilter)) return false
    return true
  }

  const base = events.filter(passesBase)

  // Amenity sub-pills: use a fixed curated list if the active pill declares one (Playground, Water Play),
  // otherwise fall back to the original dynamic computation (Farm, Museum, County Fairs, etc. — unchanged)
  // A fixed pill list hides any amenity no card in view has, so a tap never
  // leads to an empty list. A pill the user already selected always stays.
  const hasAmenity = (ev, a) => (a === 'free' ? ev.free === true : ev.tags.some((t) => t.name === a))
  const amenityOptions = activePill?.fixedAmenities
    ? activePill.fixedAmenities.filter((a) => amenities.includes(a) || base.some((ev) => hasAmenity(ev, a)))
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
  const upcomingUnsorted = filtered.filter((ev) => !ev.endDate || new Date(ev.endDate + 'T23:59:59') >= now)
  const past = filtered.filter((ev) => ev.endDate && new Date(ev.endDate + 'T23:59:59') < now)

  // Out-of-season venues drop to the bottom but stay visible, so a parent
  // planning a spring trip still finds Vasona in March. Year-round rows are
  // untouched, which today is everything outside Boat Rides.
  // Pumpkin Patches and Halloween have their own order (src/ordering.js).
  const upcoming = orderForPill(pill, sortClosedLast(upcomingUnsorted, now), now)

  // Every single result is out of season: the season itself is over, and the
  // list needs to say so rather than looking like a normal browsable page.
  // Guarded on length so an empty list falls through to the existing empty
  // state instead of claiming a season ended.
  const allOutOfSeason =
    upcoming.length > 0 && upcoming.every((ev) => isClosedForSeason(ev, now))

  // No price and no FREE badge on pills where the units are not comparable.
  // See HIDE_PRICE_PILLS in constants.js for why Boat Rides is on that list.
  const hidePrice = hidesPrice(pill)

  // Which combinations come up empty, and what people searched for that we do
  // not have. Both fire on the rendered result rather than on keystrokes, so a
  // half-typed word never counts as a failed search.
  useEffect(() => {
    if (loading || error) return
    if (upcoming.length > 0) return
    if (search.trim().length > 2) trackSearchNoResults(search.trim(), pill)
    trackEmptyState(base.length === 0 ? 'coming_soon' : 'no_results', pill)
  }, [loading, error, upcoming.length, base.length, search, pill])

  // The Map button only earns its place when something can actually be plotted.
  // As coordinates land on other categories, it starts appearing there too,
  // with no further changes here.
  const mapEnabled = MAP_ENABLED_PILLS.includes(activePill?.label)
  const mappable = mapEnabled
    ? upcoming.filter((ev) => typeof ev.lat === 'number' && typeof ev.lng === 'number')
    : []

  // Back-fill coordinates for anything that has a street address but no
  // lat/lng, looked up once and written back. The
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
  // Driven by the pill's own `expandable` flag rather than a list of names
  // here. Events, Halloween, Holiday Events and Pumpkin Patches carry it;
  // everything else keeps Learn more as a link out, which is right for a
  // playground, since there is nothing to expand into.
  const canExpand = !!activePill?.expandable

  // ---------------------------------------------------------------------
  // Grid packing.
  //
  // Two kinds of card take the full width: a featured pick, and an expanded
  // card. CSS grid on its own handles that badly. A full-width item that meets
  // a half-filled row cannot fit, so it drops to the next row and leaves a hole
  // behind it. grid-auto-flow: dense would backfill that hole, but then the
  // browser owns the order and the code no longer knows which column any card
  // is in, which is exactly the thing the expansion needs to know.
  //
  // So the packing is done here instead, in one pass, and the DOM order is the
  // visual order. Nothing relies on CSS `order` any more.
  //
  //   - a featured card takes a whole row
  //   - when a featured card would leave the right half of a row empty, the
  //     next ordinary card is pulled up to fill it, the same thing dense would
  //     do, except we know about it
  //   - every entry knows its column, which is what makes the rule below work
  //
  // Then the expansion rule: if the card being opened sits in the RIGHT column,
  // it swaps with its left neighbour so it keeps the row it was already in.
  // Without that it would drop a row to find the width, and the card under
  // someone's thumb would run away from them.
  // ---------------------------------------------------------------------
  const packCards = (list) => {
    const queue = list.slice()
    const out = []
    let col = 0

    while (queue.length) {
      if (col === 1) {
        const i = queue.findIndex((e) => !e.isEditorPick)
        if (i === -1) { col = 0; continue }        // only wide ones left, let the row end
        out.push({ ev: queue.splice(i, 1)[0], col: 1, wide: false })
        col = 0
        continue
      }
      const ev = queue.shift()
      if (ev.isEditorPick) { out.push({ ev, col: 0, wide: true }); col = 0 }
      else { out.push({ ev, col: 0, wide: false }); col = 1 }
    }

    if (canExpand && expandedId != null) {
      const i = out.findIndex((s) => s.ev.id === expandedId)
      if (i > 0 && out[i].col === 1) {
        const [me] = out.splice(i, 1)
        out.splice(i - 1, 0, me)
      }
    }
    return out
  }

  const toggleExpand = (ev) => {
    setExpandedId((cur) => {
      const next = cur === ev.id ? null : ev.id
      if (next) trackEventClickThrough(ev.title, 'expand')
      return next
    })
  }

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

  // How many upcoming things sit behind a pill. Computed from the rows already
  // in memory, so the home page needs no extra request and can never drift
  // from what the list actually shows.
  const countFor = (label) => {
    const p = PILLS.find((x) => x.label === label)
    if (!p) return 0
    const today = new Date()
    return events.filter((ev) =>
      matchesPill(ev, p) && (!ev.endDate || new Date(ev.endDate + 'T23:59:59') >= today),
    ).length
  }

  // ---- Sharing ------------------------------------------------------------
  // A shared link can point at a row the current filters exclude, so look in
  // the full loaded set rather than in `upcoming`.
  const openEvent = openEventId
    ? events.find((ev) => String(ev.id) === String(openEventId)) || null
    : null

  const shareEvent = (ev) => { setCopied(false); setShareTarget({ kind: 'event', event: ev }) }
  const shareView = () => { setCopied(false); setShareTarget({ kind: 'view' }) }
  const shareMap = () => { setCopied(false); setShareTarget({ kind: 'map' }) }

  const sharePayload = !shareTarget ? null : shareTarget.kind === 'event'
    ? (() => {
        const ev = shareTarget.event
        return {
          heading: ev.title,
          subheading: [ev.city || ev.area, ev.price || (ev.free ? 'Free' : null)].filter(Boolean).join(' · '),
          // The sharer's pill rides along so the recipient lands on that
          // category rather than on everything.
          url: eventUrl(ev, pill),
          text: eventShareText(ev),
          subject: `Nexplore: ${ev.title}`,
          label: ev.title,
        }
      })()
    : (() => {
        const isMap = shareTarget.kind === 'map'
        const n = isMap ? mappable.length : upcoming.length
        return {
          heading: pill || 'Things to do in the Bay Area',
          subheading: isMap
            ? `${n} on the map · nexplore.us`
            : `${n} place${n !== 1 ? 's' : ''} · nexplore.us`,
          // Rebuilt from the pill, NOT copied from the address bar. Region,
          // amenity chips and search stay behind: a recipient opening a list
          // cut down to four cards assumes that is the whole catalogue.
          url: viewUrl(pill, isMap),
          text: viewShareText(pill, n, isMap),
          subject: `Nexplore: ${pill || 'things to do'}`,
          label: `${isMap ? 'map' : 'view'}:${pill}`,
        }
      })()

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

  // ---- Redesign view model -------------------------------------------------
  // Cities for the Near picker: every city that has something upcoming on the
  // current page (or anywhere, on Home), so the list never offers an empty one.
  const cityOptions = [...new Set(
    events
      .filter((ev) => (activePill ? matchesPill(ev, activePill) : true))
      .filter((ev) => !ev.endDate || new Date(ev.endDate + 'T23:59:59') >= now)
      .map((ev) => ev.city)
      .filter(Boolean)
      .filter((c) => !(isEventsPage && WIDE_CITIES.includes(c))),
  )].sort()

  // Big swipe cards are the editor picks (the existing `featured` flag), in
  // your Top pick ranking (top_pick_rank). Since Oct 2026 they also stay in
  // the main list, which never opens with the same place as the Top picks row.
  const featured = orderTopPicks(upcoming.filter((ev) => ev.isEditorPick))
  const rest = avoidSameFirst(upcoming, featured[0])
  const bigLabel = featureLabel(pill)
  const restWords = countLabel(pill, 2).replace(/^\d+\s+/, '').replace(/\s+to\s.*$/, '')

  const openSheet = (ev, play = false) => { trackEventClickThrough(ev.title, play ? 'watch_video' : 'expand'); setSheetAutoPlay(!!play); setOpenEventId(ev.id) }

  // "Clear all": first pill whenever at least one filter is on. Clears Near too.
  const activeFilterCount = [freeOnly, !!city, !!region, weekend, nextWeekend, !!selectedMonthFilter, !!dayPick]
    .filter(Boolean).length + amenities.length
  const clearAll = () => { resetFilters(); trackFilterApplied('clear_all', 'enabled') }

  // ---- Events page view model ------------------------------------------------
  const eventsListMode = isEventsPage && (!!dayPick || !!city)
  const dayList = isEventsPage && dayPick ? upcoming.filter((ev) => onDay(ev, dayPick)) : []
  const listForEvents = dayPick ? dayList : upcoming
  const groupNames = Object.fromEntries(Object.keys(GROUPS).map((k) => [k, groupName(k, events)]))
  const mosaicGroups = isEventsPage && !eventsListMode
    ? Object.fromEntries(Object.keys(GROUPS).map((k) => [k, { name: groupNames[k], list: collapseSeries(upcoming.filter((ev) => groupsOf(ev).includes(k))) }]))
    : {}
  const specials = isEventsPage ? upcoming.filter((ev) => ev.dontMiss).sort((a, b) => (a.startDate || '').localeCompare(b.startDate || '')) : []
  const seasons = isEventsPage ? seasonPagesNow(countFor).map((s) => ({ s, count: countFor(s.pill) })) : []
  const openSeasonPage = (label) => choosePill(label, { fromEvents: true })

  const pageSubtitle = loading ? 'Loading...' : (() => {
    const t = countLabel(pill, isEventsPage && dayPick ? dayList.length : upcoming.length)
    return t.charAt(0).toUpperCase() + t.slice(1) + (city ? ` in ${city}` : '')
  })()

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#F7F4EF' }}>
      {/* Header: wordmark (home) and the Near [city] picker. */}
      <div className="nx-top">
        <button className="nx-brand" onClick={goHome} aria-label="Nexplore home">
          <span style={{ color: '#1A6B4A' }}>Ne</span><span style={{ color: '#C94F2C' }}>x</span><span style={{ color: '#1A6B4A' }}>plore</span>
        </button>
        <label className="nx-near" htmlFor="nx-city">Near
          {/* Old shared links may carry ?region=South Bay etc. Keep honoring
              them and show the region here, so it can be seen and cleared. */}
          <select id="nx-city" value={region && !city ? `region:${region}` : (city || '')} onChange={(e) => { const v = e.target.value; setRegion(v.startsWith('region:') ? v.slice(7) : null); setCity(v && !v.startsWith('region:') ? v : null) }}>
            <option value="">All Bay Area</option>
            {region && <option value={`region:${region}`}>{region}</option>}
            {cityOptions.map((c) => <option key={c} value={c}>{c}</option>)}
            {city && !cityOptions.includes(city) && <option value={city}>{city}</option>}
          </select>
        </label>
      </div>

      {/* Category circles replace the old pill row on every page. */}
      <CategoryRow active={pill} onPick={choosePill} />

      {isHome ? (
        <Home countFor={countFor} onPick={choosePill} />
      ) : (
        <>
          {/* Filter pills + page title stay pinned under the header while scrolling. */}
          <div className="nx-stick">
          {/* Filter pills: the page's own amenity list, or date chips on Events. */}
          {!isEventsPage && (activeFilterCount > 0 || (showAmenities && amenityOptions.length > 0)) && (
            <div className="nx-subpills">
              {activeFilterCount > 0 && (
                <button className="nx-sub clear" onClick={clearAll}>✕ Clear all</button>
              )}
              {showAmenities && amenityOptions.map((name) => {
                const on = amenities.includes(name)
                return (
                  <button key={name} className={`nx-sub${on ? ' on' : ''}`} onClick={() => toggleAmenity(name)}>
                    {getAmenityLabel(name, pill)}
                  </button>
                )
              })}
            </div>
          )}
          {isEventsPage && (
            <DayRibbon
              pick={dayPick}
              onPick={(d) => { setDayPick(d); setOpenGroup(null); if (d) trackFilterApplied('day', d) }}
              hasEvents={(d) => upcoming.some((ev) => onDay(ev, d))}
              lead={(
                <>
                  {activeFilterCount > 0 && <button className="nx-sub clear nx-rbpill" onClick={clearAll}>✕ Clear all</button>}
                  <button className={`nx-sub nx-rbpill${freeOnly ? ' on' : ''}`} onClick={toggleFreeOnly}>{getAmenityLabel('free')}</button>
                </>
              )}
            />
          )}

          <PageHead
            onBack={backToEvents && (pill === 'Halloween' || pill === 'Pumpkin Patches') ? () => choosePill('Events') : null}
            title={isEventsPage && dayPick ? dayTitle(dayPick) : (pill || 'Search results')}
            subtitle={pageSubtitle}
            showMap={!loading && mappable.length > 0}
            mapOn={showMap}
            onMap={() => (showMap ? setShowMap(false) : openMap('header_toggle'))}
            onShare={!loading && upcoming.length > 0 ? (showMap ? shareMap : shareView) : null}
          />
          </div>

          {error && (
            <div style={{ margin: '0 16px 10px', padding: '10px 14px', borderRadius: 10, background: '#FEF0E6', border: '0.5px solid #C94F2C', fontSize: 12, color: '#C94F2C' }}>⚠️ {error}</div>
          )}

          {!loading && allOutOfSeason && (
            <div style={{ margin: '0 16px 10px', padding: '10px 14px', borderRadius: 10, background: '#FEF0E6', border: '0.5px solid #EFCFB6' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#2D2D2D', marginBottom: 2 }}>{outOfSeasonHeadline(pill)}</div>
              <div style={{ fontSize: 11, color: '#7A6A5C', lineHeight: 1.5 }}>Here's where to go when they're back. Each one shows the month it reopens.</div>
            </div>
          )}

          {showMap ? (
            // The map sits inside the page: everything above stays put and
            // only the listing area swaps out.
            <div className="nx-mapbox">
              <MapView
                contained
                events={mappable}
                theme={theme}
                pin={pinStyleFor(activePill?.label)}
                onSelect={openOfficial}
                onDirections={openDirections}
                onShare={shareEvent}
                onShareView={shareMap}
                onPinClick={(ev) => trackMapPinClick(ev.title, pill)}
                onClose={() => setShowMap(false)}
                hidePrice={hidePrice}
              />
            </div>
          ) : loading ? (
            <div className="nx-section"><div className="nx-list">{[1, 2, 3, 4].map((i) => <div key={i} style={{ padding: 12 }}><EventCardSkeleton /></div>)}</div></div>
          ) : isEventsPage ? (
            eventsListMode ? (
              // A picked day, or a Near city: one plain list, each card with its group chip.
              <div className="nx-section">
                <div className="nx-list">
                  {listForEvents.map((ev) => (
                    <CompactRow theme={theme} page={pill} key={ev.id} ev={ev} canExpand expanded={false}
                      extraChips={groupChips(ev, groupNames)}
                      onToggle={openSheet} onOfficial={openOfficial} onDirections={openDirections} onShare={shareEvent}
                      onCalendar={addToCalendar} hidePrice={hidePrice || hidesPriceForEvent(ev)} />
                  ))}
                </div>
                {listForEvents.length === 0 && !error && (
                  <div style={{ textAlign: 'center', padding: '40px 24px' }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#888', marginBottom: 6 }}>No events found</div>
                    <div style={{ fontSize: 12, color: '#aaa', lineHeight: 1.7 }}>Try another day, or tap Clear all.</div>
                  </div>
                )}
              </div>
            ) : (
              <>
                {(featured.length > 0 || seasons.length > 0) && (
                  <>
                    <h2 className="nx-secth">Top picks</h2>
                    <div className="nx-bigrow">
                      {featured.map((ev) => (
                        <FeatureCard theme={theme} key={ev.id} ev={ev} page={pill}
                          onLearnMore={openSheet} onOfficial={openOfficial} onDirections={openDirections} onShare={shareEvent}
                          hidePrice={hidePrice || hidesPriceForEvent(ev)} />
                      ))}
                      {seasons.map(({ s, count }) => (
                        <SeasonCard key={s.pill} s={s} count={count} onOpen={() => openSeasonPage(s.pill)} />
                      ))}
                    </div>
                  </>
                )}
                <h2 className="nx-secth">Browse by interest</h2>
                <Mosaic
                  groups={mosaicGroups}
                  seasons={seasons}
                  specials={specials}
                  openKey={openGroup}
                  onGroup={(k) => { setOpenGroup((cur) => (cur === k ? null : k)); trackFilterApplied('event_group', k) }}
                  onSeason={openSeasonPage}
                  onSpecial={(ev) => openSheet(ev)}
                />
                {openGroup && mosaicGroups[openGroup] && (
                  <div className="nx-glist" ref={groupListRef}>
                    <h3 style={{ color: GROUPS[openGroup].c2 }}>{mosaicGroups[openGroup].name}</h3>
                    <div className="nx-list">
                      {mosaicGroups[openGroup].list.map((ev) => (
                        <CompactRow theme={theme} page={pill} key={ev.id} ev={ev} canExpand expanded={false}
                          onToggle={openSheet} onOfficial={openOfficial} onDirections={openDirections} onShare={shareEvent}
                          onCalendar={addToCalendar} hidePrice={hidePrice || hidesPriceForEvent(ev)} />
                      ))}
                    </div>
                    <button className="nx-less" onClick={() => { setOpenGroup(null); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>Close ▲</button>
                  </div>
                )}
              </>
            )
          ) : (
            <>
              {featured.length > 0 && (
                <div className="nx-bigrow">
                  {featured.map((ev) => (
                    <FeatureCard theme={theme}
                      key={ev.id}
                      ev={ev}
                      page={pill}
                      onLearnMore={openSheet}
                      onOfficial={openOfficial}
                      onDirections={openDirections}
                      onShare={shareEvent}
                      hidePrice={hidePrice || hidesPriceForEvent(ev)}
                    />
                  ))}
                </div>
              )}

              {rest.length > 0 && (
                <div className="nx-section">
                  {featured.length > 0 && <h2>More {restWords}<span>{rest.length}</span></h2>}
                  <div className="nx-list">
                    {rest.map((ev) => (
                      <CompactRow theme={theme} page={pill}
                        key={ev.id}
                        ev={ev}
                        canExpand
                        expanded={false}
                        onToggle={openSheet}
                        onOfficial={openOfficial}
                        onDirections={openDirections}
                        onShare={shareEvent}
                        onCalendar={addToCalendar}
                        hidePrice={hidePrice || hidesPriceForEvent(ev)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {past.length > 0 && (
                <div className="nx-section" style={{ opacity: 0.55, marginTop: 14 }}>
                  <h2>Past events<span>{past.length}</span></h2>
                  <div className="nx-list">
                    {past.map((ev) => (
                      <CompactRow theme={theme} page={pill} key={ev.id} ev={ev} canExpand expanded={false} onToggle={openSheet} onOfficial={openOfficial} onDirections={openDirections} onShare={shareEvent} onCalendar={addToCalendar} hidePrice={hidePrice || hidesPriceForEvent(ev)} />
                    ))}
                  </div>
                </div>
              )}

              {upcoming.length === 0 && !error && (
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
                    <div style={{ fontSize: 12, color: '#aaa', lineHeight: 1.7 }}>Try removing a filter or choosing a different city.</div>
                  </div>
                )
              )}
            </>
          )}
          <div style={{ height: 80 }} />

          {/* Floating map button, bottom middle, same as today. */}
          {!loading && mappable.length > 0 && !showMap && !openEvent && !shareTarget && (
            <button
              onClick={() => { openMap('floating_button'); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
              style={{
                position: 'fixed', left: '50%', transform: 'translateX(-50%)', bottom: 22, zIndex: 950,
                display: 'flex', alignItems: 'center', gap: 8, background: '#2D2D2D', color: 'white',
                border: '2.5px solid white', borderRadius: 50, padding: '13px 24px', fontSize: 14, fontWeight: 700,
                fontFamily: "'DM Sans', sans-serif", cursor: 'pointer', boxShadow: '0 8px 24px rgba(0,0,0,0.34)',
              }}
            >
              🗺 Show map · {mappable.length}
            </button>
          )}
        </>
      )}

      {/* Learn more on a big card, and every shared ?event= link, open here. */}
      <EventSheet
        event={openEvent}
        theme={theme}
        autoPlay={sheetAutoPlay}
        onClose={() => { setOpenEventId(null); setSheetAutoPlay(false) }}
        onSelect={openOfficial}
        onDirections={openDirections}
        onShare={shareEvent}
        hidePrice={hidePrice || hidesPriceForEvent(openEvent)}
        page={pill}
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
