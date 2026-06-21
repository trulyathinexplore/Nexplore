// Pill config — each pill declares HOW it filters.
// type: 'all' | 'eventType' | 'category' | 'tagGroup'
// (value may be a string or an array of strings for category)
export const PILLS = [
  { label: 'All',        type: 'all' },
  { label: 'Events',     type: 'eventType', value: 'event' },
  { label: 'Farm',       type: 'category',  value: 'Farm Experience' },
  { label: 'Park',       type: 'category',  value: 'Park' },
  { label: 'Museum',     type: 'category',  value: 'Museum' },
  { label: 'Water Play', type: 'tagGroup',  value: 'water-feature' }, // cross-category theme pill
  { label: 'Adventure',  type: 'category',  value: ['State Park', 'Waterfront'] },
]

export const REGIONS = ['San Francisco', 'East Bay', 'South Bay', 'Peninsula', 'North Bay', 'Tri-Valley']

// Exact city->region mapping from the live build
export const REGION_CITIES = {
  'San Francisco': ['San Francisco'],
  'East Bay':      ['Oakland', 'Berkeley', 'Hayward', 'San Leandro', 'Fremont', 'Alameda', 'Richmond'],
  'South Bay':     ['San Jose', 'Santa Clara', 'Sunnyvale', 'Mountain View', 'Palo Alto', 'Cupertino', 'Milpitas'],
  'Peninsula':     ['San Mateo', 'Redwood City', 'Burlingame', 'South San Francisco', 'Daly City', 'Millbrae'],
  'North Bay':     ['Mill Valley', 'San Rafael', 'Novato', 'Sausalito', 'Tiburon'],
  'Tri-Valley':    ['Dublin', 'Pleasanton', 'Livermore', 'San Ramon', 'Danville', 'Walnut Creek'],
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
  return true
}
