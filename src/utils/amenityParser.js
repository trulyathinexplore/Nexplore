// amenityParser.js - Parse amenities from event descriptions

export const AMENITY_EMOJIS = {
  'dog-friendly': '🐕',
  'wheelchair-accessible': '♿',
  'free': '💚',
  'rides-games': '🎡'
};

export const AMENITY_LABELS = {
  'dog-friendly': 'Dog Friendly',
  'wheelchair-accessible': 'Accessible',
  'free': 'Free Admission',
  'rides-games': 'Rides & Games'
};

export function extractAmenitiesFromDescription(description) {
  if (!description) return [];

  const amenities = [];
  
  if (description.includes('🐕') || description.includes('Dog Friendly')) {
    amenities.push('dog-friendly');
  }
  if (description.includes('♿') || description.includes('Accessible')) {
    amenities.push('wheelchair-accessible');
  }
  if (description.includes('💚') || description.includes('Free Admission')) {
    amenities.push('free');
  }
  if (description.includes('🎡') || description.includes('Rides & Games')) {
    amenities.push('rides-games');
  }

  return amenities;
}

export function hasAmenity(event, amenityId) {
  const amenities = extractAmenitiesFromDescription(event.description);
  return amenities.includes(amenityId);
}

export function filterByAmenities(events, selectedAmenities) {
  if (!selectedAmenities || selectedAmenities.length === 0) {
    return events;
  }

  return events.filter(event => {
    const eventAmenities = extractAmenitiesFromDescription(event.description);
    return selectedAmenities.every(amenity => eventAmenities.includes(amenity));
  });
}

export function getAvailableAmenities(events) {
  const amenitySet = new Set();
  
  events.forEach(event => {
    const amenities = extractAmenitiesFromDescription(event.description);
    amenities.forEach(amenity => amenitySet.add(amenity));
  });

  return Array.from(amenitySet);
}

export function getAmenityBadges(event) {
  const amenities = extractAmenitiesFromDescription(event.description);
  return amenities.map(amenityId => ({
    id: amenityId,
    emoji: AMENITY_EMOJIS[amenityId],
    label: AMENITY_LABELS[amenityId]
  }));
}
