

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
 
// Extract amenities from description text
export function extractAmenitiesFromDescription(description) {
  if (!description) return [];
 
  const amenities = [];
 
  // Check for each amenity indicator
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
 
// Check if event has specific amenity
export function hasAmenity(event, amenityId) {
  const amenities = extractAmenitiesFromDescription(event.description);
  return amenities.includes(amenityId);
}
 
// Filter events by amenities
export function filterByAmenities(events, selectedAmenities) {
  if (!selectedAmenities || selectedAmenities.length === 0) {
    return events;
  }
 
  return events.filter(event => {
    const eventAmenities = extractAmenitiesFromDescription(event.description);
    // All selected amenities must be present (AND logic)
    return selectedAmenities.every(amenity => eventAmenities.includes(amenity));
  });
}
 
// Get all unique amenities from a list of events
export function getAvailableAmenities(events) {
  const amenitySet = new Set();
 
  events.forEach(event => {
    const amenities = extractAmenitiesFromDescription(event.description);
    amenities.forEach(amenity => amenitySet.add(amenity));
  });
 
  return Array.from(amenitySet);
}
 
// Get amenity badges for display in event card
export function getAmenityBadges(event) {
  const amenities = extractAmenitiesFromDescription(event.description);
  return amenities.map(amenityId => ({
    id: amenityId,
    emoji: AMENITY_EMOJIS[amenityId],
    label: AMENITY_LABELS[amenityId]
  }));
}
 

Downloaded pumpkin-patches-description-update.sql Show in Finder
