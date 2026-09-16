 
import { BEACHES } from './beachData.js'
import { EVENT_COORDS } from './eventCoords.js'
 
const SUPABASE_URL = 'https://kgythyenzjmnrzrlxynj.supabase.co'
const SUPABASE_ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtneXRoeWVuemptbnJ6cmx4eW5qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzOTY0MzUsImV4cCI6MjA5NDk3MjQzNX0.6qtAjUDmVlOUOTbbfr-YTU3AtsJ172lnBaIL9XlJ-Ys'
const headers = {
  apikey: SUPABASE_ANON,
  Authorization: `Bearer ${SUPABASE_ANON}`,
  'Content-Type': 'application/json',
}
 
// Embed category name + tags + venue (for city/address) so pills/amenities can filter on them.
export async function fetchEvents({ freeOnly = false } = {}) {
const select = '*,categories(name),event_tags(tags(name,tag_group)),venues(name,address,city,state,latitude,longitude)'
   let url = `${SUPABASE_URL}/rest/v1/events?select=${encodeURIComponent(select)}&status=eq.published&order=start_date.asc`
  if (freeOnly) url += '&is_free=eq.true'
  const res = await fetch(url, { headers })
  if (!res.ok) throw new Error(`Supabase error: ${res.status}`)
  const events = await res.json()
 
  // Merge with local beach data
  const mappedBeaches = BEACHES.map(mapBeach)
  const filtered = freeOnly ? mappedBeaches.filter(b => b.free) : mappedBeaches
 
  return [...events, ...filtered]
}
 
// Supabase returns numeric columns as numbers, but a hand-edited row can carry
// a string, and Number('') is 0 — which would drop a pin in the Atlantic.
function numOrNull(v) {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export function mapEvent(e) {
  // Beaches arrive already in app shape (see mapBeach) — passing them through
  // mapEvent a second time would strip category/tags, so short-circuit here.
  if (e && e.__isBeach) return e
 
  // Prefer venue city over event-level city field
  const venueCity = e.venues?.city || ''
  const venueAddress = e.venues?.address || ''
  const venueState = e.venues?.state || ''
  const city = venueCity || e.city || ''
 
  // Full address for Google Maps directions. Falling straight through to the
  // bare city sent "Directions" to a town centre rather than the venue, so the
  // event's own address column and eventCoords.js are both tried first.
  const coords = EVENT_COORDS[e.id]
  const fullAddress =
    (venueAddress && venueCity && `${venueAddress}, ${venueCity}, ${venueState || 'CA'}`) ||
    (e.address && e.address.trim() && /\d/.test(e.address)
      ? `${e.address}${city ? `, ${city}` : ''}, CA`
      : null) ||
    coords?.address ||
    city ||
    'Bay Area, CA'
 
  // Coordinates for the map. A linked venue wins, because that's editable in
  // the admin tool; eventCoords.js is the fallback for rows that have no venue
  // yet. Once every patch has a venue row, the fallback can simply be deleted.
  // Precedence: linked venue, then the event's own columns, then the static
  // file. The file is the legacy path — once every row carries coordinates in
  // the database, eventCoords.js and its two imports here can be deleted.
  const lat = numOrNull(e.venues?.latitude) ?? numOrNull(e.latitude) ?? numOrNull(coords?.lat) ?? null
  const lng = numOrNull(e.venues?.longitude) ?? numOrNull(e.longitude) ?? numOrNull(coords?.lng) ?? null

  // A street-level address, or null. Distinct from fullAddress, which falls
  // back to a bare city so the Directions button always has something to send.
  // resolveCoords() needs to know the difference: geocoding "Half Moon Bay"
  // would pin four different farms to the same spot.
  const eventStreet = e.address && /\d/.test(e.address) ? e.address.trim() : null
  const addressLine =
    (venueAddress && venueCity && `${venueAddress}, ${venueCity}`) ||
    (eventStreet && `${eventStreet}${city ? `, ${city}` : ''}`) ||
    coords?.address ||
    null

  let dayLabel = e.day_label || ''
  if (!dayLabel && e.start_date) {
    dayLabel = new Date(e.start_date + 'T12:00:00')
      .toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      .toUpperCase()
  }
 
  return {
    id: e.id,
    title: e.title,
    description: e.description || '',
    imageUrl: e.image_url || null,
    officialUrl: e.official_url || e.website_url || e.registration_url || '#',
    free: e.is_free || e.price_type === 'free' || false,
    price: e.price_label || (e.price_amount ? `$${e.price_amount}` : null),
    // No default. An empty string means "no age chip" (same as mapBeach).
    // "All ages" carries no information and rendered literally as
    // "Ages All ages" on every row that had no age_range set.
    ages: e.age_range || e.ages || '',
    needsReservation: e.registration_required || false,
    // Seasonal window, as MM-DD strings. Both null means year-round, which is
    // every row that predates this, so nothing changes until they are set.
    // See season.js for how they are read. Stored without a year because a
    // season recurs: a full date would need editing every January.
    seasonStart: e.season_start || null,
    seasonEnd: e.season_end || null,
    city,
    fullAddress,
    addressLine,
    lat,
    lng,
    area: e.area || city || 'Bay Area',
    startDate: e.start_date,
    endDate: e.end_date,
    dayLabel,
    dayLabelRaw: e.day_label || null,
    timeLabel: e.time_label || '',
    isEditorPick: e.is_editor_pick || e.featured || false,
    eventType: e.event_type || e.content_type || 'event',
    contentType: e.content_type || '',
    seriesName: e.series_name || '',
    seasonalType: e.seasonal_type || null,
    categoryId: e.category_id || null,
    category: e.categories?.name || null,
    tags: (e.event_tags || []).map((et) => et.tags).filter(Boolean),
  }
}
 
// Map beach data to event format
export function mapBeach(beach) {
  return {
    __isBeach: true,
    id: beach.id,
    title: beach.title,
    description: beach.description || '',
    imageUrl: beach.image || null,
    officialUrl: beach.officialUrl || '#',
    free: beach.free || false,
    price: beach.free ? null : 'Day-use fee',
    ages: '', // beaches show no age chip
    needsReservation: false,
    // Same shape as mapEvent, per the codebase notes: a key present in one and
    // absent in the other becomes undefined on half the array. Beaches are
    // year-round, so both are null and seasonState() says nothing about them.
    seasonStart: null,
    seasonEnd: null,
    city: beach.city,
    fullAddress: beach.fullAddress,
    addressLine: beach.fullAddress || null,
    // Shape parity with mapEvent — a key present in one and absent in the other
    // becomes undefined on half the array and breaks filters downstream.
    lat: numOrNull(beach.lat),
    lng: numOrNull(beach.lng),
    area: beach.city || 'Bay Area',
    startDate: null,
    endDate: null,
    dayLabel: '',
    dayLabelRaw: null,
    timeLabel: '',
    isEditorPick: beach.isEditorPick || false,
    eventType: beach.eventType || 'beach',
    contentType: '',
    seriesName: '',
    seasonalType: null,
    categoryId: null, // beaches have no Supabase category row
    category: beach.category || 'Beach',
    tags: beach.tags || [],
  }
}
 
// Coordinates for an event that has a street address but no lat/lng yet.
//
// Same shape as resolveImage below: look it up once, write it straight back to
// Supabase, and never look it up again. So an address typed into the admin tool
// turns into a pin by itself, and the row is only ever geocoded one time in its
// life no matter how many people view it.
//
// Nominatim is free and needs no key, but it is donation-funded and its usage
// policy asks for at most one request a second and no bulk work. Hence the
// budget below and the delay in the caller. If Nexplore ever needs to geocode
// in volume, move to a keyed service (Google, MapTiler, LocationIQ) by swapping
// the fetch in this one function.
const BAY = { latMin: 36.9, latMax: 39.0, lngMin: -123.5, lngMax: -121.2 }
const coordCache = {}
let geocodeBudget = 6 // per page load, deliberately small

export async function resolveCoords(addressLine, id) {
  if (!addressLine || geocodeBudget <= 0) return null
  if (coordCache[addressLine] !== undefined) return coordCache[addressLine]
  geocodeBudget -= 1
  try {
    const url =
      'https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us&q=' +
      encodeURIComponent(`${addressLine}, CA, USA`)
    const j = await (await fetch(url)).json()
    const hit = j && j[0]
    if (!hit) { coordCache[addressLine] = null; return null }

    const lat = Number(hit.lat)
    const lng = Number(hit.lon)
    // Refuse anything outside the Bay Area rather than drop a pin in the wrong
    // state. A geocoder handed a partial address will happily return the
    // geographic centre of the country.
    if (!Number.isFinite(lat) || !Number.isFinite(lng) ||
        lat < BAY.latMin || lat > BAY.latMax || lng < BAY.lngMin || lng > BAY.lngMax) {
      coordCache[addressLine] = null
      return null
    }

    const pair = { lat, lng }
    coordCache[addressLine] = pair
    fetch(`${SUPABASE_URL}/rest/v1/events?id=eq.${id}`, {
      method: 'PATCH',
      headers: { ...headers, Prefer: 'return=minimal' },
      body: JSON.stringify({ latitude: lat, longitude: lng }),
    }).catch(() => {})
    return pair
  } catch {
    coordCache[addressLine] = null
    return null
  }
}

// Microlink image resolution with in-memory cache + write-back to Supabase
const imgCache = {}
export async function resolveImage(officialUrl, id) {
  if (!officialUrl || officialUrl === '#') return null
  if (imgCache[officialUrl]) return imgCache[officialUrl]
  try {
    const r = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(officialUrl)}&meta=false`)
    const j = await r.json()
    const src = j?.data?.image?.url || j?.data?.logo?.url || null
    if (src) {
      imgCache[officialUrl] = src
      fetch(`${SUPABASE_URL}/rest/v1/events?id=eq.${id}`, {
        method: 'PATCH',
        headers: { ...headers, Prefer: 'return=minimal' },
        body: JSON.stringify({ image_url: src }),
      }).catch(() => {})
    }
    return src
  } catch {
    return null
  }
}
