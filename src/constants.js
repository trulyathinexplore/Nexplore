
// Pill config — each pill declares HOW it filters.
// type: 'all' | 'eventType' | 'category' | 'tagGroup'
// fixedAmenities (optional): a curated, always-shown sub-pill list. If absent,
// sub-pills are computed dynamically from whatever tags exist on matching events (unchanged default behavior).
export const PILLS = [
  { label: 'All',           type: 'all' },
  { label: 'Playground',    type: 'category',  value: 'Playground',
    fixedAmenities: ['free', 'parking-onsite', 'picnic-area', 'shaded', 'restrooms', 'splash-pad', 'wheelchair-accessible'] },
  { label: 'Events',        type: 'eventType', value: 'event' },
  { label: 'Water Play',    type: 'tagGroup',  value: 'water-feature',
    fixedAmenities: ['free', 'waterparks', 'splash-pad', 'swim-lakes', 'fountain'] },
  {
    label: 'Pumpkin Patches',
    type: 'category',
    value: 14,
    // 'free-admission' rather than 'free', and only on this pill. A patch can be
    // free to walk into while its hayrides, corn maze and rides all cost money,
    // so 'free' overpromises here. 'free' stays the special case in App.jsx that
    // reads the is_free column; 'free-admission' is an ordinary tag, so it needs
    // no code change. Every other pill keeps 'free' and is untouched.
    fixedAmenities: ['dog-friendly', 'wheelchair-accessible', 'free-admission', 'rides-games']
  },
  {
    label: 'Halloween',
    type: 'seasonalType',
    value: 'halloween'
  },
  { label: 'Fruit Picking',  type: 'category', value: 17,
    fixedAmenities: ['apple-picking'] },
  { label: 'Holiday Events', type: 'category', value: 16 },
  { label: 'County Fairs',  type: 'tagGroup',  value: 'county-fair' },
  { label: 'Zoo & Aquarium', type: 'category', value: ['Zoo', 'Aquarium']},
  { label: 'Museum',        type: 'category',  value: 'Museum' },
  { label: 'Beaches',       type: 'category',  value: 'Beach',
    fixedAmenities: ['tidepool', 'parking-onsite', 'restrooms', 'wheelchair-accessible', 'free'] },
]
 
export const REGIONS = ['San Francisco', 'East Bay', 'South Bay', 'Peninsula', 'North Bay', 'Tri-Valley']
 
export const REGION_CITIES = {
  'San Francisco': ['San Francisco'],
  'East Bay':      ['Oakland', 'Berkeley', 'Hayward', 'San Leandro', 'Fremont', 'Alameda', 'Richmond'],
  'South Bay':     ['San Jose', 'Santa Clara', 'Sunnyvale', 'Mountain View', 'Palo Alto', 'Cupertino', 'Milpitas', 'Aptos', 'Santa Cruz'],
  'Peninsula':     ['San Mateo', 'Redwood City', 'Burlingame', 'South San Francisco', 'Daly City', 'Millbrae', 'Half Moon Bay', 'Moss Beach', 'San Gregorio', 'Pescadero'],
  'North Bay':     ['Mill Valley', 'San Rafael', 'Novato', 'Sausalito', 'Tiburon', 'Pacific Grove'],
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
  'Pumpkin Patches': [
    'pumpkin', 'pumpkins', 'pumpkin patch', 'pumpkin patches',
    'pumpkin picking', 'corn maze', 'hay ride', 'hayride',
    'fall harvest', 'harvest festival',
  ],
  'Beaches': [
    'tidepool', 'tide pool', 'tide pools', 'tidepooling', 'tide pooling',
    'starfish', 'beach', 'beaches', 'marine life', 'sea creatures',
    'intertidal', 'rocky shore', 'coastal exploration',
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
    return vals.includes(ev.categoryId) || vals.includes(ev.category)
  }
  if (pill.type === 'tagGroup') return ev.tags.some((t) => t.tag_group === pill.value)
  if (pill.type === 'seasonalType') return ev.seasonalType === pill.value
  return true
}
 
// Sub-filter tags to always exclude from amenity pills
export const EXCLUDED_AMENITY_TAGS = ['family-friendly', 'family friendly']
 
// Amenity emoji and label mapping for pumpkin patches
export const AMENITY_LABELS = {
  'dog-friendly': '🐕 Dog Friendly',
  'wheelchair-accessible': '♿ Accessible',
  'free': '💚 Free Admission',
  'rides-games': '🎡 Rides & Games'
}
 
// Extract amenities from description field (for pumpkin patches with emoji badges)
export function extractAmenitiesFromDescription(description) {
  if (!description) return []
  const amenities = []
  if (description.includes('🐕') || description.includes('Dog Friendly')) {
    amenities.push('dog-friendly')
  }
  if (description.includes('♿') || description.includes('Accessible')) {
    amenities.push('wheelchair-accessible')
  }
  if (description.includes('💚') || description.includes('Free Admission')) {
    amenities.push('free')
  }
  if (description.includes('🎡') || description.includes('Rides & Games')) {
    amenities.push('rides-games')
  }
  return amenities
}

// ---------------------------------------------------------------------------
// Per-pill theming.
//
// Only Pumpkin Patches deviates. Every other pill resolves to DEFAULT, whose
// values are copied verbatim from what the components hardcoded before, so
// nothing outside that one pill changes appearance.
//
// The split in the pumpkin theme is deliberate: BLACK carries every action
// (Directions, Learn more) so it stays legible against the orange pumpkin
// photography, and ORANGE carries identity (card outline, active pill, active
// amenity chip). The FREE badge is the one element that sits on top of a photo,
// which is why it inverts to a white pill rather than a coloured one.
// ---------------------------------------------------------------------------
const DEFAULT_THEME = {
  cardBorder: '0.5px solid #E2DDD6',
  freeBadgeBg: '#1A6B4A',
  freeBadgeFg: 'white',
  dateFg: '#C94F2C',
  dirBg: 'white',
  dirBorder: '0.5px solid #1A6B4A',
  dirFg: '#1A6B4A',
  learnBg: '#F7F4EF',
  learnBorder: '0.5px solid #E2DDD6',
  learnFg: '#1A6B4A',
  pillActiveBg: '#2D2D2D',
  pillActiveBorder: '#2D2D2D',
  chipOnBg: '#1A6B4A',
  chipOnBorder: '#1A6B4A',
  chipOnFg: 'white',
  accent: '#1A6B4A',
  accentSoft: '#E8F5EE',
}

const PUMPKIN_THEME = {
  ...DEFAULT_THEME,
  cardBorder: '1px solid #EFCFB6',
  freeBadgeBg: 'white',
  freeBadgeFg: '#2D2D2D',
  dirBg: 'white',
  dirBorder: '0.5px solid #2D2D2D',
  dirFg: '#2D2D2D',
  learnBg: '#2D2D2D',
  learnBorder: '0.5px solid #2D2D2D',
  learnFg: 'white',
  pillActiveBg: '#C94F2C',
  pillActiveBorder: '#C94F2C',
  chipOnBg: '#C94F2C',
  chipOnBorder: '#C94F2C',
  chipOnFg: 'white',
  accent: '#C94F2C',
  accentSoft: '#FEF0E6',
}

const PILL_THEMES = { 'Pumpkin Patches': PUMPKIN_THEME }

export function themeFor(pillLabel) {
  return PILL_THEMES[pillLabel] || DEFAULT_THEME
}
