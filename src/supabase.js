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
const select = '*,categories(name),event_tags(tags(name,tag_group)),venues(name,address,city,state)'
  let url = `${SUPABASE_URL}/rest/v1/events?select=${encodeURIComponent(select)}&order=start_date.asc`
  if (freeOnly) url += '&is_free=eq.true'
  const res = await fetch(url, { headers })
  if (!res.ok) throw new Error(`Supabase error: ${res.status}`)
  return res.json()
}

export function mapEvent(e) {
  // Prefer venue city over event-level city field
  const venueCity = e.venues?.city || ''
  const venueAddress = e.venues?.address || ''
  const venueState = e.venues?.state || ''
  const city = venueCity || e.city || ''

  // Full address for Google Maps directions
  const fullAddress = venueAddress && venueCity
    ? `${venueAddress}, ${venueCity}, ${venueState || 'CA'}`
    : city || 'Bay Area, CA'

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
    ages: e.age_range || e.ages || 'All ages',
    city,
    fullAddress,
    area: e.area || city || 'Bay Area',
    startDate: e.start_date,
    endDate: e.end_date,
    dayLabel,
    timeLabel: e.time_label || '',
    isEditorPick: e.is_editor_pick || e.featured || false,
    eventType: e.event_type || e.content_type || 'event',
    contentType: e.content_type || '',
    seriesName: e.series_name || '',
    seasonalType: e.seasonal_type || null,
    category: e.categories?.name || null,
    tags: (e.event_tags || []).map((et) => et.tags).filter(Boolean),
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
