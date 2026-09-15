// File: src/analytics.js
// GA4 custom event tracking for Nexplore

export const trackEvent = (eventName, eventParams = {}) => {
  if (window.gtag) {
    window.gtag('event', eventName, eventParams);
  }
};

// Pill/Category clicked
export const trackPillClick = (pillLabel) => {
  trackEvent('pill_click', {
    pill_name: pillLabel,
  });
};

// Event card viewed
export const trackEventView = (eventTitle, eventCity, eventPrice) => {
  trackEvent('event_view', {
    event_title: eventTitle,
    event_city: eventCity,
    event_price: eventPrice || 'free',
  });
};

// Learn more / official URL clicked
export const trackEventClickThrough = (eventTitle, action) => {
  trackEvent('event_click_through', {
    event_title: eventTitle,
    action: action, // 'learn_more', 'directions', etc.
  });
};

// Filter applied
export const trackFilterApplied = (filterType, filterValue) => {
  trackEvent('filter_applied', {
    filter_type: filterType, // 'region', 'free_only', 'weekend', 'month'
    filter_value: filterValue,
  });
};

// Search query
export const trackSearch = (searchQuery) => {
  trackEvent('search', {
    search_query: searchQuery,
  });
};

// Page engagement (time spent)
export const trackPageEngagement = (timeSpentSeconds) => {
  trackEvent('page_engagement', {
    time_spent_seconds: Math.round(timeSpentSeconds),
  });
};

// July 4th specific
export const trackJuly4thFilter = () => {
  trackEvent('july_4th_clicked', {
    event_type: 'seasonal',
  });
};

// ---------------------------------------------------------------------------
// Added 2026-09-15. Parameter names below are registered as custom dimensions
// in GA4 by hand; GA collects them either way but will not let a report break
// down by them until they are registered, and it does not backfill. So do NOT
// rename a parameter here without adding the new name in Admin first.
//
// Registered: pill_name, destination, share_label, filter_type, filter_value,
// amenity, percent_scrolled, search_query.
// ---------------------------------------------------------------------------

// THE important one. Nexplore is a single page, so GA sees exactly one
// page_view per visit and every standard report treats the whole site as one
// page called "Nexplore". Sending a page_view on each pill change is what
// makes views, users, engagement time, entrances and bounce work PER CATEGORY
// with no custom reporting at all.
export const trackCategoryView = (pillLabel) => {
  const path = '/' + String(pillLabel).toLowerCase().replace(/\s+/g, '-');
  trackEvent('page_view', {
    page_title: `${pillLabel} | Nexplore`,
    page_location: window.location.origin + path,
    page_path: path,
    pill_name: pillLabel,
  });
};

// GA's built-in scroll event fires once, at 90%, per page LOAD. With one load
// per visit that is at most one data point for a whole session, credited to
// whatever loaded first. This fires per category view instead.
export const trackScrollDepth = (percent, pillLabel) => {
  trackEvent('scroll_depth', {
    percent_scrolled: percent,
    pill_name: pillLabel,
  });
};

// Which amenity filters actually earn their place, which is what tells us
// whether to collect amenities for other categories.
export const trackAmenityFilter = (amenity, on, pillLabel) => {
  trackEvent('amenity_filter', {
    amenity: amenity,
    filter_type: 'amenity',
    filter_value: on ? 'on' : 'off',
    pill_name: pillLabel,
  });
};

export const trackMapOpen = (source, pillLabel, pinCount) => {
  trackEvent('map_open', {
    filter_type: 'map_source',
    filter_value: source, // 'floating_button' | 'header_toggle' | 'shared_link'
    pill_name: pillLabel,
    pin_count: pinCount,
  });
};

export const trackMapPinClick = (eventTitle, pillLabel) => {
  trackEvent('map_pin_click', {
    share_label: eventTitle,
    pill_name: pillLabel,
  });
};

// Share opened or sent. `destination` is 'whatsapp', 'sms', 'email',
// 'copy_link' or 'native'; `label` is the event title, or "view:<pill>" when
// a whole filtered view is shared.
export const trackShare = (destination, label) => {
  trackEvent('share', {
    destination: destination,
    share_label: label,
  });
};

// Someone ARRIVED through a shared link. This is what closes the loop and
// answers whether share is doing anything for retention, which is the whole
// reason it was built.
//
// No tracking parameter needed for an event link: ?event= is produced by
// nothing on the site except share, so its presence on arrival IS the signal.
export const trackShareArrival = (kind, label) => {
  trackEvent('share_arrival', {
    filter_type: 'arrival',
    filter_value: kind, // 'event' | 'view' | 'map'
    share_label: label,
  });
};

// What people wanted and we did not have. Free product research.
export const trackSearchNoResults = (query, pillLabel) => {
  trackEvent('search_no_results', {
    search_query: query,
    pill_name: pillLabel,
  });
};

// Which filter combinations come up empty, i.e. look broken to a user.
export const trackEmptyState = (kind, pillLabel) => {
  trackEvent('empty_state', {
    filter_type: 'empty_state',
    filter_value: kind, // 'coming_soon' | 'no_results'
    pill_name: pillLabel,
  });
};
