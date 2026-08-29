
Constants · JS
// Pill config - each pill declares HOW it filters.
// type: 'all' | 'category' | 'tagGroup' | 'eventType' | 'seasonalType'
// fixedAmenities (optional): a curated, always-shown sub-list. If absent,
// they're built dynamically from whatever tags exist on matching events (unchanged default behavior).
 
export const PILLS = [
  { label: 'All', type: 'all' },
  { label: 'Playground', type: 'category', value: 'Playground', fixedAmenities: ['free', 'parking-onsite', 'picnic-area', 'wheelchair-accessible'] },
  { label: 'Events', type: 'eventType', value: 'event', fixedAmenities: ['free', 'parking-onsite'] },
  { label: 'Water Play', type: 'tagGroup', value: 'water-feature', fixedAmenities: ['free', 'parking-onsite'] },
  { label: 'County Fairs', type: 'tagGroup', value: 'county-fair', fixedAmenities: ['free', 'parking-onsite'] },
  { label: 'Pumpkin Patches', type: 'category', value: 'Pumpkin Patch', fixedAmenities: ['free', 'parking-onsite'] },
  { label: 'Zoo & Aquarium', type: 'category', value: ['Zoo', 'Aquarium'], fixedAmenities: ['parking-onsite'] },
  { label: 'Museum', type: 'category', value: 'Museum', fixedAmenities: ['parking-onsite'] },
  // Commented out - keeping content for next year
  // { label: 'July 4th', type: 'seasonalType', value: 'july-4th' },
];
 
// Map user search keywords to pill labels.
// When the user types a keyword, we find the pill and select it.
export const KEYWORD_PILL_MAP = {
  Playground: [
    'playground', 'play structure', 'slide', 'swing', 'jungle gym',
    'kid-friendly', 'children play', 'tot lot'
  ],
  'Water Play': [
    'water', 'splash', 'pool', 'spray', 'fountain',
    'splashpad', 'splash pad', 'water feature', 'aquatic'
  ],
  'County Fairs': [
    'fair', 'county fair', 'carnival', 'petting zoo', 'ferris wheel',
    'rides', 'food vendors', 'live music'
  ],
  'Pumpkin Patches': [
    'pumpkin', 'pumpkin patch', 'pumpkin picking', 'halloween',
    'fall harvest', 'autumn', 'gourd'
  ],
  'Zoo & Aquarium': [
    'zoo', 'aquarium', 'animal', 'wildlife', 'marine life',
    'sea creatures', 'exhibits', 'wildlife park'
  ],
  Museum: [
    'museum', 'gallery', 'exhibit', 'art', 'science',
    'natural history', 'interactive', 'cultural'
  ],
  Beaches: [
    'tidepool', 'tide pool', 'tide pools', 'tidepooling',
    'starfish', 'beach', 'marine life', 'sea creatures',
    'intertidal', 'rocky shore', 'coastal exploration'
  ],
  Events: [
    'event', 'festival', 'concert', 'show', 'performance',
    'workshop', 'class', 'activity'
  ]
};
 
// Regions for UI display and search - each region maps to multiple cities.
// Search hits with a city in 'SF Bay Area', 'Peninsula', etc. get tagged with the region.
export const REGIONS = {
  'SF Bay Area': [
    'San Francisco', 'Oakland', 'Berkeley', 'Daly City', 'San Mateo',
    'Palo Alto', 'Mountain View', 'Sunnyvale', 'San Jose', 'Fremont',
    'Hayward', 'Walnut Creek', 'Concord', 'Livermore', 'Tracy',
    'Vallejo', 'Fairfield', 'Santa Clara', 'Los Altos', 'Los Gatos',
    'Saratoga', 'Campbell', 'Sunnyvale', 'Cupertino', 'Milpitas'
  ],
  Peninsula: [
    'Half Moon Bay', 'Moss Beach', 'San Gregorio', 'Pescadero',
    'Menlo Park', 'Redwood City', 'San Mateo', 'Burlingame', 'South San Francisco',
    'Hillsborough', 'Atherton', 'Portola Valley', 'Woodside', 'La Honda'
  ],
  'South Bay': [
    'Santa Cruz', 'Aptos', 'Capitola', 'Watsonville', 'Salinas',
    'Monterey', 'Pacific Grove', 'Carmel', 'Big Sur', 'Morgan Hill'
  ],
  'North Bay': [
    'Napa', 'Sonoma', 'Healdsburg', 'Sebastopol', 'Petaluma',
    'San Rafael', 'Marin County', 'Sausalito', 'Mill Valley', 'Novato'
  ]
};
 
// Region city mappings (for search and display)
export const REGION_CITIES = {
  'San Francisco': 'SF Bay Area',
  'Oakland': 'SF Bay Area',
  'Berkeley': 'SF Bay Area',
  'Daly City': 'SF Bay Area',
  'San Mateo': 'Peninsula',
  'Palo Alto': 'SF Bay Area',
  'Mountain View': 'SF Bay Area',
  'Sunnyvale': 'SF Bay Area',
  'San Jose': 'SF Bay Area',
  'Fremont': 'SF Bay Area',
  'Hayward': 'SF Bay Area',
  'Walnut Creek': 'SF Bay Area',
  'Concord': 'SF Bay Area',
  'Livermore': 'SF Bay Area',
  'Tracy': 'SF Bay Area',
  'Vallejo': 'SF Bay Area',
  'Fairfield': 'SF Bay Area',
  'Santa Clara': 'SF Bay Area',
  'Los Altos': 'SF Bay Area',
  'Los Gatos': 'SF Bay Area',
  'Saratoga': 'SF Bay Area',
  'Campbell': 'SF Bay Area',
  'Cupertino': 'SF Bay Area',
  'Milpitas': 'SF Bay Area',
  'Half Moon Bay': 'Peninsula',
  'Moss Beach': 'Peninsula',
  'San Gregorio': 'Peninsula',
  'Pescadero': 'Peninsula',
  'Menlo Park': 'Peninsula',
  'Redwood City': 'Peninsula',
  'Burlingame': 'Peninsula',
  'South San Francisco': 'Peninsula',
  'Hillsborough': 'Peninsula',
  'Atherton': 'Peninsula',
  'Portola Valley': 'Peninsula',
  'Woodside': 'Peninsula',
  'La Honda': 'Peninsula',
  'Santa Cruz': 'South Bay',
  'Aptos': 'South Bay',
  'Capitola': 'South Bay',
  'Watsonville': 'South Bay',
  'Salinas': 'South Bay',
  'Monterey': 'South Bay',
  'Pacific Grove': 'South Bay',
  'Carmel': 'South Bay',
  'Big Sur': 'South Bay',
  'Morgan Hill': 'South Bay',
  'Napa': 'North Bay',
  'Sonoma': 'North Bay',
  'Healdsburg': 'North Bay',
  'Sebastopol': 'North Bay',
  'Petaluma': 'North Bay',
  'San Rafael': 'North Bay',
  'Marin County': 'North Bay',
  'Sausalito': 'North Bay',
  'Mill Valley': 'North Bay',
  'Novato': 'North Bay'
};
 
// Amenity config - display name, description, icon emoji.
// Used by FilterIcon to build the sub-pill row.
export const AMENITIES = {
  free: {
    label: 'Free',
    description: 'No entry fee',
    emoji: '💸'
  },
  'parking-onsite': {
    label: 'Parking',
    description: 'Parking available',
    emoji: '🚗'
  },
  'picnic-area': {
    label: 'Picnic Area',
    description: 'Bring a picnic',
    emoji: '🧺'
  },
  'wheelchair-accessible': {
    label: 'Wheelchair Accessible',
    description: 'Wheelchair accessible',
    emoji: '♿'
  },
  'water-fountain': {
    label: 'Water Fountain',
    description: 'Drinking water available',
    emoji: '💧'
  },
  'restrooms': {
    label: 'Restrooms',
    description: 'Public restrooms',
    emoji: '🚻'
  },
  'dogs-allowed': {
    label: 'Dogs Allowed',
    description: 'Leashed dogs welcome',
    emoji: '🐕'
  },
  'tidepool': {
    label: 'Tidepool',
    description: 'Tidepool exploration',
    emoji: '🌊'
  },
  'sunset-views': {
    label: 'Sunset Views',
    description: 'Great sunset views',
    emoji: '🌅'
  }
};
 
// Card background color generator for event cards
export const cardBg = (id) => {
  const colors = ['#FFE8D6', '#E8F5EE', '#FFF4E6', '#E8F0FF', '#F5E8FF', '#FFE8F0', '#E8FFED', '#FFE8E8'];
  return colors[id % colors.length];
};
 
// Tags to exclude from amenity display
export const EXCLUDED_AMENITY_TAGS = [
  'family-friendly',
  'kid-friendly',
  'indoor',
  'outdoor'
];
 
// Detect if search text maps to a pill via KEYWORD_PILL_MAP
export const detectPillFromSearch = (search) => {
  if (!search) return null
  const lower = search.toLowerCase()
  for (const [pillLabel, keywords] of Object.entries(KEYWORD_PILL_MAP)) {
    if (keywords.some(kw => lower.includes(kw))) {
      return pillLabel
    }
  }
  return null
};
 
// Detect if search text mentions a city from REGION_CITIES
export const detectCityFromSearch = (search) => {
  if (!search) return null
  const lower = search.toLowerCase()
  for (const city of Object.keys(REGION_CITIES)) {
    if (lower.includes(city.toLowerCase())) {
      return city
    }
  }
  return null
};
 
// Check if an event matches a pill's filter criteria
export const matchesPill = (event, pill) => {
  if (pill.type === 'all') return true
  if (pill.type === 'category') {
    if (Array.isArray(pill.value)) {
      return pill.value.includes(event.category)
    }
    return event.category === pill.value
  }
  if (pill.type === 'tagGroup') {
    return event.tags && event.tags.some(tag => tag.tag_group === pill.value)
  }
  if (pill.type === 'eventType') {
    return event.event_type === pill.value
  }
  if (pill.type === 'seasonalType') {
    return event.seasonal_type === pill.value
  }
  return false
};
 

