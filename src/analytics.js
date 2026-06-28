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
