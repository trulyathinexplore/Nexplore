// Pill config — each pill declares HOW it filters.
// type: 'all' | 'eventType' | 'category' | 'tagGroup'
// fixedAmenities (optional): a curated, always-shown sub-pill list. If absent,
// sub-pills are computed dynamically from whatever tags exist on matching events (unchanged default behavior).
export const PILLS = [
  { label: 'All',           type: 'all' },
  { label: 'Playground',    type: 'category',  value: 'Playground',
    fixedAmenities: ['free', 'parking-onsite', 'picnic-area', 'shaded', 'restrooms', 'splash-pad', 'wheelchair-accessible'] },
  { label: 'Water Play',    type: 'tagGroup',  value: 'water-feature',
    fixedAmenities: ['fountain', 'free-entry', 'splash-pad', 'waterparks'] },
  { label: 'County Fairs',  type: 'tagGroup',  value: 'county-fair' },
  { label: 'July 4th',      type: 'seasonalType', value: 'july-4th' },
  { label: 'Events',        type: 'eventType', value: 'event' },
  { label: 'Farm',          type: 'category',  value: 'Farm Experience' },
  { label: 'Museum',        type: 'category',  value: 'Museum' },
]
export const REGIONS = ['San Francisco', 'East Bay', 'South Bay', 'Peninsula', 'North Bay', 'Tri-Valley']
export const REGION_CITIES = {
  'San Francisco': ['San Francisco'],
  'East Bay':      ['Oakland', 'Berkeley', 'Hayward', 'San Leandro', 'Fremont', 'Alameda', 'Richmond'],
  'South Bay':     ['San Jose', 'Santa Clara', 'Sunnyvale', 'Mountain View', 'Palo Alto', 'Cupertino', 'Milpitas'],
  'Peninsula':     ['San Mateo', 'Redwood City', 'Burlingame', 'South San Francisco', 'Daly City', 'Millbrae'],
  'North Bay':     ['Mill Valley', 'San Rafael', 'Novato', 'Sausalito', 'Tiburon'],
  'Tri-Valley':    ['Dublin', 'Pleasanton', 'Livermore', 'San Ramon', 'Danville', 'Walnut Creek'],
}
// All cities across all regions (for location search matching)
export const ALL_CITIES = Object.values(REGION_CITIES).flat()
// Keyword → pill label mapping for search intent detection
export const KEYWORD_PILL_MAP = {
  'Water Play': [
    'splash pad', 'splashpad', 'water play', 'water park', 'water feature',
    'water fountain', 'water fountains', 'fountain', 'water fun',
    'playgrounds with water', 'water play area', 'water play areas',
    'water station', 'spray park', 'spray pad', 'spray ground',
    'kids water', 'water kids', 'wet play', 'water sprinkler',
    'interactive fountain', 'water jets', 'splash zone',
  ],
  'County Fairs': [
    'county fair', 'county fairs', 'fair', 'fairs',
    'summer fair', 'carnival', 'carnival rides',
  ],
}
// Given a search string, return the pill label it maps to (or null)
export function detectPillFromSearch(searchStr) {
  if (!searchStr) return null
  const s = searchStr.toLowerCase().trim()
  for (const [pillLabel, keywords] of Object.entries(KEYWORD_PILL_MAP)) {
    if (keywords.some((kw) => s.includes(kw))) return pillLabel
  }
  return null
}
// Given a search string, extract a city name if present
export function detectCityFromSearch(searchStr) {
  if (!searchStr) return null
  const s = searchStr.toLowerCase().trim()
  return ALL_CITIES.find((city) => s.includes(city.toLowerCase())) || null
}
export const CARD_BG = ['#E8F5EE', '#F5F0E8', '#E8F0F5', '#F5E8F0', '#F0F5E8', '#F0E8F5']
export const cardBg = (id) => CARD_BG[Math.abs(Number(id) || 0) % CARD_BG.length]
// Does an event satisfy the active pill?
export function matchesPill(ev, pill) {
  if (!pill || pill.type === 'all') return true
  if (pill.type === 'eventType') return ev.eventType === pill.value
  if (pill.type === 'category') {
    const vals = Array.isArray(pill.value) ? pill.value : [pill.value]
    return vals.includes(ev.category)
  }
  if (pill.type === 'tagGroup') return ev.tags.some((t) => t.tag_group === pill.value)
  if (pill.type === 'seasonalType') return ev.seasonalType === pill.value
  return true
}
// Sub-filter tags to always exclude from amenity pills
export const EXCLUDED_AMENITY_TAGS = ['family-friendly', 'family friendly']
