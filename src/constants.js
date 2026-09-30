
// Pill config — each pill declares HOW it filters.
// type: 'all' | 'eventType' | 'category' | 'tagGroup'
// fixedAmenities (optional): a curated, always-shown sub-pill list. If absent,
// sub-pills are computed dynamically from whatever tags exist on matching events (unchanged default behavior).
// 'All' was removed deliberately. A bare nexplore.us now means the HOME page,
// not "show me everything", so All had nothing left to do. Home is also what
// gives search its reach across every category: no pill active means search
// is unscoped, which is the one job All was still quietly doing.
export const PILLS = [
  { label: 'Playground',    type: 'category',  value: 'Playground',
    fixedAmenities: ['free', 'restrooms', 'parking-onsite', 'splash-pad', 'toddler-area', 'inclusive-playground', 'reservable-picnic', 'bbq-grills', 'dog-friendly'] },
  // expandable: Learn more opens the card in place instead of linking out.
  // Only for pills whose rows are event-shaped, meaning they have a date, a
  // ticket and a description worth reading before deciding. A playground has
  // none of those, so it keeps the link out.
  { label: 'Events',        type: 'eventType', value: 'event', expandable: true },
  // hidden: the pill stays in this list so every link ever shared with
  // ?view=Water%20Play still resolves and still filters correctly. It is only
  // dropped from the pill ROW in App.jsx. Water play season is over; delete
  // the flag to bring it back in May, no other change needed.
  { label: 'Water Play',    type: 'tagGroup',  value: 'water-feature', hidden: true,
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
    expandable: true,
    fixedAmenities: ['dog-friendly', 'wheelchair-accessible', 'free-admission', 'rides-games']
  },
  {
    label: 'Halloween',
    type: 'seasonalType',
    value: 'halloween',
    expandable: true,
    // A chosen set, replacing the scraped one that produced "Light
    // installations" and "Night event". The order is deliberate: the first two
    // are the questions a parent asks before any other, will it frighten my
    // kid and does it cost anything.
    //
    // `home-display` is the SAME tag the Holiday pill uses, on purpose. A
    // decorated private house is a decorated private house whether the lights
    // are orange or green, and several of these addresses are literally the
    // same house in both seasons: 697 Sonoma Ave in Livermore is Christmas on
    // Sonoma in December and Frightmare in October. One tag means tagging a
    // house once, and it means the label map only has to carry one word for it.
    // 'train-ride' is the Holiday Events tag, reused. Here it reads
    // "Halloween train rides" (see PAGE_AMENITY_LABELS below).
    fixedAmenities: ['no-spooks', 'free', 'family-friendly', 'haunted-maze', 'home-display', 'train-ride'],
  },
  { label: 'Fruit Picking',  type: 'category', value: 17,
    fixedAmenities: ['apple-picking'] },
  { label: 'Holiday Events', type: 'category', value: 16, expandable: true,
    // Trains is `train-ride` and Ice rink is `ice-skating`; drive-through and
    // santa-photos already exist from the holiday import. Only
    // christmas-village was new.
    //
    // Seven is on the long side for a row that scrolls sideways on a phone.
    // The first three fit without scrolling, so Free, Home display and Drive
    // through lead deliberately: they are the ones that narrow the list most.
    fixedAmenities: ['free', 'home-display', 'drive-through', 'train-ride',
                     'ice-skating', 'christmas-village', 'santa-photos'] },
  { label: 'County Fairs',  type: 'tagGroup',  value: 'county-fair', hidden: true },
  { label: 'Zoo & Aquarium', type: 'category', value: ['Zoo', 'Aquarium']},
  { label: 'Museum',        type: 'category',  value: 'Museum' },
  { label: 'Beaches',       type: 'category',  value: 'Beach',
    fixedAmenities: ['tidepool', 'parking-onsite', 'restrooms', 'wheelchair-accessible', 'free'] },
  {
    label: 'Boat Rides',
    type: 'category',
    value: 18,
    // No price anywhere on these cards. See HIDE_PRICE_PILLS below — the units
    // are not comparable, so a number on the card misleads rather than informs.
    fixedAmenities: ['dog-friendly', 'wheelchair-accessible', 'open-year-round', 'kayaks', 'ferry'],
  },
]

// The count line above a list: "37 pumpkin patches to visit" rather than
// "37 things to do". Generic wording tells a parent nothing; the category's
// own noun tells them exactly what they are looking at.
//
// A noun alone is not enough, because the verb does not carry: "16 boat rides
// to visit" is wrong. So both live here, per pill, in one place to edit.
//
// The nouns deliberately match the `noun` field in the edge function's VIEWS
// map (netlify/edge-functions/og-preview.js), so a card and the link preview
// of that same category agree with each other. Change one, change the other.
//
// `one` is the singular. "1 pumpkin patches to visit" is exactly the kind of
// thing that ships and then irritates you for a month.
const COUNT_WORDS = {
  'Playground':      { one: 'playground',      many: 'playgrounds',      verb: 'to explore' },
  'Events':          { one: 'event',           many: 'events',           verb: 'to check out' },
  'Water Play':      { one: 'water play spot', many: 'water play spots', verb: 'to splash at' },
  'Pumpkin Patches': { one: 'pumpkin patch',   many: 'pumpkin patches',  verb: 'to visit' },
  'Halloween':       { one: 'Halloween event', many: 'Halloween events', verb: 'to check out' },
  'Fruit Picking':   { one: 'farm',            many: 'farms',            verb: 'to visit' },
  'Holiday Events':  { one: 'holiday event',   many: 'holiday events',   verb: 'to check out' },
  'County Fairs':    { one: 'county fair',     many: 'county fairs',     verb: 'to visit' },
  'Zoo & Aquarium':  { one: 'zoo & aquarium',  many: 'zoos & aquariums', verb: 'to explore' },
  'Museum':          { one: 'museum',          many: 'museums',          verb: 'to explore' },
  'Beaches':         { one: 'beach',           many: 'beaches',          verb: 'to visit' },
  'Boat Rides':      { one: 'boat ride',       many: 'boat rides',       verb: 'to take' },
}

// Falls back to the old wording when a pill has no entry, so adding a pill
// without touching this map degrades to "N things to do" rather than breaking.
export function countLabel(pillLabel, n) {
  const w = COUNT_WORDS[pillLabel]
  if (!w) return `${n} thing${n !== 1 ? 's' : ''} to do`
  return `${n} ${n === 1 ? w.one : w.many} ${w.verb}`
}

// Pills where a price on the card would mislead rather than inform.
//
// Boat Rides is the case that forced this. Its prices are not merely different
// numbers, they are different UNITS: the Oakland ferry is $5.10 per person,
// Edgewater's Whaly is $99 an hour for up to five people, and Boat Sausalito is
// $399 for two hours for twelve. Rendering "$5" and "$99" side by side invites
// a comparison that is simply false.
//
// It also keeps the site off stale fares. Ferry prices changed in July 2026 and
// the Angel Island schedule changed in September; linking out to the operator
// means Nexplore is never the thing quoting a wrong number.
//
// Pumpkin patch admission genuinely IS comparable, so it keeps its prices.
export const HIDE_PRICE_PILLS = ['Boat Rides']
export const hidesPrice = (pillLabel) => HIDE_PRICE_PILLS.includes(pillLabel)

// The same question answered from an EVENT rather than the active pill.
//
// Needed because price suppression cannot be a property of the current view: a
// search, or a shared ?event= link, renders a mixed list with no pill active at
// all, and a Boat Rides card has to stay priceless wherever it appears.
//
// Derived from PILLS rather than hand-listed, so adding a pill to
// HIDE_PRICE_PILLS is the only edit needed.
const HIDE_PRICE_CATEGORY_VALUES = PILLS
  .filter((p) => HIDE_PRICE_PILLS.includes(p.label) && p.type === 'category')
  .flatMap((p) => (Array.isArray(p.value) ? p.value : [p.value]))

export const hidesPriceForEvent = (ev) =>
  !!ev && HIDE_PRICE_CATEGORY_VALUES.some((v) => v === ev.categoryId || v === ev.category)
 
export const REGIONS = ['San Francisco', 'East Bay', 'South Bay', 'Peninsula', 'North Bay', 'Tri-Valley']
 
// A city missing from this map is not merely unsorted: it is INVISIBLE to
// region filtering, silently. Twenty-six cities had venues and no region,
// including Tracy with 69 and Brentwood with 34, so a parent in Tracy filtering
// to their own area got nothing and had no way to tell why.
//
// Anything added here must also exist in the region chips, or it sorts into a
// region nobody can select.
//
// Judgment calls worth knowing about, since none of these have one right answer:
//   Tracy and Mountain House are San Joaquin County, not the Bay Area at all.
//   They are in Tri-Valley because that is the region a Tracy family drives
//   into, and 75 venues is too many to leave unreachable.
//   Capitola sits with Santa Cruz and Aptos in South Bay, which is
//   geographically generous but matches how people search.
//   Vallejo is North Bay; it is Solano County and reads that way to locals.
//   Brentwood, Antioch, Byron and Clayton are far East Bay, kept in East Bay
//   rather than given a region of their own until the counts justify one.
export const REGION_CITIES = {
  'San Francisco': ['San Francisco'],
  'East Bay':      ['Oakland', 'Berkeley', 'Hayward', 'San Leandro', 'Fremont', 'Alameda', 'Richmond',
                    'Union City', 'Newark', 'Castro Valley', 'San Lorenzo', 'San Pablo', 'Concord',
                    'Pleasant Hill', 'Moraga', 'Brentwood', 'Antioch', 'Byron', 'Clayton'],
  'South Bay':     ['San Jose', 'Santa Clara', 'Sunnyvale', 'Mountain View', 'Palo Alto', 'Cupertino',
                    'Milpitas', 'Aptos', 'Santa Cruz', 'Los Gatos', 'Saratoga', 'Campbell',
                    'Los Altos', 'Morgan Hill', 'Gilroy', 'Capitola'],
  'Peninsula':     ['San Mateo', 'Redwood City', 'Burlingame', 'South San Francisco', 'Daly City',
                    'Millbrae', 'Half Moon Bay', 'Moss Beach', 'San Gregorio', 'Pescadero',
                    'San Carlos', 'Woodside'],
  'North Bay':     ['Mill Valley', 'San Rafael', 'Novato', 'Sausalito', 'Tiburon', 'Pacific Grove',
                    'Vallejo'],
  'Tri-Valley':    ['Dublin', 'Pleasanton', 'Livermore', 'San Ramon', 'Danville', 'Walnut Creek',
                    'Sunol', 'Tracy', 'Mountain House'],
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
  'free': '💚 Free',
  'restrooms': '🚻 Restrooms',
  'parking-onsite': '🅿️ Parking lot',
  'splash-pad': '💦 Splash pad',
  'toddler-area': '🧸 Toddler area',
  'inclusive-playground': '♿ Inclusive',
  'reservable-picnic': '🎉 Reservable picnic',
  'bbq-grills': '🔥 BBQ grills',
  'dog-friendly': '🐕 Dog friendly',
  'picnic-area': '🧺 Picnic area',
  'wheelchair-accessible': '♿ Accessible',
  'rides-games': '🎡 Rides & Games',
  // Halloween and Holiday sub-pills. The label is what people read; the key is
  // the tag in the database, and several keys deliberately predate the label so
  // existing tagging keeps working.
  'no-spooks': '🧸 No spooks',
  'family-friendly': '👪 Family friendly',
  'haunted-maze': '🕸 Haunted maze',
  'home-display': '🏠 Yard displays',
  'drive-through': '🚙 Drive through',
  'santa-photos': '🎅 Santa photos',
  'train-ride': '🚂 Trains',
  'ice-skating': '⛸ Ice rink',
  'christmas-village': '🎄 Christmas village'
}
 
// The same tag can read differently on one page. Checked before AMENITY_LABELS.
export const PAGE_AMENITY_LABELS = {
  'Halloween': { 'train-ride': '🚂 Halloween train rides' },
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
  // CTAs stay GREEN on every pill. Orange is the pumpkin pill's accent, not a
  // button colour, and black buttons were the other half of the same problem.
  // The pill chip, the date line and the amenity chips still carry the season.
  dirBg: 'white',
  dirBorder: '0.5px solid #1A6B4A',
  dirFg: '#1A6B4A',
  learnBg: '#1A6B4A',
  learnBorder: '0.5px solid #1A6B4A',
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

// ---------------------------------------------------------------------------
// Map pin per category. Defined for every pill so maps stay consistent as more
// categories get one, but only the pills in MAP_ENABLED_PILLS (App.jsx) show a
// map today. Fruit Picking is deliberately left on the default until decided.
// ---------------------------------------------------------------------------
const DEFAULT_PIN = { color: '#1A6B4A', selected: '#124D35', icon: '📍' }
const PIN_STYLES = {
  'Playground':      { color: '#7A4BB5', selected: '#553286', icon: '🛝' },
  'Pumpkin Patches': { color: '#C94F2C', selected: '#963A20', icon: '🎃' },
  'Halloween':       { color: '#2D2D2D', selected: '#000000', icon: '👻' },
  'Water Play':      { color: '#2A7BC0', selected: '#1B5A8F', icon: '💦' },
  'Beaches':         { color: '#1E9A9A', selected: '#136F6F', icon: '🏖' },
  'Boat Rides':      { color: '#1F3A6B', selected: '#12254A', icon: '⛵' },
  'Zoo & Aquarium':  { color: '#8A5A2B', selected: '#633F1C', icon: '🦁' },
  'Museum':          { color: '#6B6B6B', selected: '#4A4A4A', icon: '🏛' },
  'County Fairs':    { color: '#D0487A', selected: '#A03259', icon: '🎡' },
  'Events':          { color: '#1A6B4A', selected: '#124D35', icon: '📅' },
}

export function pinStyleFor(pillLabel) {
  return PIN_STYLES[pillLabel] || DEFAULT_PIN
}
