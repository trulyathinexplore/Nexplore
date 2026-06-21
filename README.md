# Nexplore

Family adventure discovery for the Bay Area — React + Vite, Supabase backend, deployed on Netlify.

## Develop
```bash
npm install
npm run dev      # local dev server
npm run build    # production build -> dist/
npm run preview  # preview the build
```

## Structure
- `src/App.jsx` — main screen: header, search, pills, sub-filters, grid, picks, drawer
- `src/components/ui.jsx` — card, image loader (Microlink), picks carousel, filter drawer, icons
- `src/constants.js` — pill config (typed), region→city map, helpers
- `src/supabase.js` — REST fetch (events + embedded category & tags), event mapper, image resolver
- `src/urlState.js` — two-way sync between filters and the URL query string
- `netlify.toml` — SPA redirect so shared deep links resolve

## Filtering model
Pills are **typed**: `all`, `eventType` (Events), `category` (Farm/Park/Museum/Adventure),
and `tagGroup` (Water Play → any tag in the `water-feature` group, cross-category).
Selecting a category or Water Play reveals **amenity sub-filters** (from `amenity` + `water-feature`
tags present in the result set), which narrow with AND logic.

## Shareable URLs
Filter state serializes to query params, e.g.
`/?view=water-play&region=east-bay&free=1&amenities=restrooms,shaded`
Opening such a link restores the exact filtered view.

## Data notes
- Reads `event_type` (schema) with `content_type` fallback.
- Fetch embeds `categories(name)` and `event_tags(tags(name,tag_group))`.
- Supabase anon key is the public client key (safe to ship in the browser bundle).
