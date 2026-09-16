// Per-event link previews.
//
// The problem: Netlify serves the same index.html for every SPA route, and
// WhatsApp, iMessage, Facebook and the rest read the HTML head without ever
// running JavaScript. So without this, every shared link previews as the same
// generic "Nexplore" card no matter which place it points at. The preview is
// the reason anyone taps, so share is close to worthless without it.
//
// This runs at the CDN edge on requests to "/". If the request is a link
// crawler AND carries ?event=<id>, it returns a small HTML stub carrying that
// event's own title, description and image. Everything else falls straight
// through to the app untouched, so real visitors never see this code path and
// pay nothing for it.
//
// Deliberately NOT a redirect rule. netlify.toml's redirect ordering is the
// documented footgun on this project (see the /fall comment) and edge
// functions run before redirects, so the redirects block needs no changes.

const SUPABASE_URL = 'https://kgythyenzjmnrzrlxynj.supabase.co'
// The same public anon key the client bundle already ships. Nothing new is
// exposed here; it is only repeated because edge functions run in Deno and
// cannot import from src/.
const SUPABASE_ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtneXRoeWVuemptbnJ6cmx4eW5qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzOTY0MzUsImV4cCI6MjA5NDk3MjQzNX0.6qtAjUDmVlOUOTbbfr-YTU3AtsJ172lnBaIL9XlJ-Ys'

const FALLBACK_IMAGE = '/og-fall.jpg'

const CRAWLER = /facebookexternalhit|facebookcatalog|WhatsApp|Twitterbot|Slackbot|Slack-ImgProxy|LinkedInBot|TelegramBot|Discordbot|Pinterest|redditbot|Applebot|SkypeUriPreview|Googlebot|bingbot|vkShare|embedly|quora link preview|outbrain|nuzzel|XING-contenttabreceiver|Iframely|Bluesky|Mastodon|developers\.google\.com\/\+\/web\/snippet/i

const escapeHtml = (s) =>
  String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

// Descriptions carry a trailing emoji badge line that is internal metadata,
// not copy. Drop it, then trim to something a preview card will actually show.
const cleanDescription = (raw) => {
  const body = String(raw || '')
    .split('\n')
    .filter((line) => !/^\s*[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(line.trim()))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (body.length <= 200) return body
  return body.slice(0, 197).replace(/\s+\S*$/, '') + '...'
}

// Category previews. Without this, tapping "Save or share" produces a link
// that previews as a bare "Nexplore" card saying nothing about the 37 pumpkin
// patches behind it, which is most of the reason nobody taps.
//
// Deliberately a small hand-kept map rather than an import of PILLS: edge
// functions run in Deno and cannot import from src/. Keep it in step with
// constants.js when a pill is added. A slug missing from here degrades to the
// generic preview, which is what happens today anyway.
// `noun` is a Title Case plural because it lands straight after a number in a
// preview card: "37 Pumpkin Patches", "16 Halloween Events". Using the pill's
// own label instead produced "37 Halloween in the Bay Area".
//
// Filtering on category_id rather than the category NAME on purpose. A name
// filter would have to reach into the embedded categories table, which needs
// an !inner join in the select and fails silently without one. Ids verified
// against live data: 2 Museum, 4 Playground, 14 Pumpkin Patch, 17 Fruit Picking.
const VIEWS = {
  'pumpkin-patches': { noun: 'Pumpkin Patches',     query: 'category_id=eq.14' },
  'halloween':       { noun: 'Halloween Events',    query: 'seasonal_type=eq.halloween' },
  'fruit-picking':   { noun: 'Fruit Picking Farms', query: 'category_id=eq.17' },
  'playground':      { noun: 'Playgrounds',         query: 'category_id=eq.4' },
  'museum':          { noun: 'Museums',             query: 'category_id=eq.2' },
  // Keep these nouns in step with COUNT_WORDS in src/constants.js, so a card
  // and the link preview of the same category say the same thing.
  'boat-rides':      { noun: 'Boat Rides',          query: 'category_id=eq.18',
    desc: 'Lake rentals, ferries and bay cruises across the Bay Area. Pedal boats and kayaks, the Sausalito and Angel Island ferries, and the ones that stay open all winter.' },
}

// Sections of the home page, shareable as ?section=. A query param rather than
// a #hash precisely so this function can see it: a hash never reaches the
// server, so a #fall link would arrive as the generic Nexplore card.
const SECTIONS = {
  fall: {
    title: 'Your complete guide to Bay Area fall | Nexplore',
    desc: 'From apple picking and pumpkin patches to the best fall colour streets and a weekend in the Sierra. All of it in one place, with the details you actually need.',
    image: '/media/pumpkin.jpg',
  },
  weekend: {
    title: 'Where are we going this weekend? | Nexplore',
    desc: 'Pumpkin patches, fruit picking, beaches, playgrounds and museums across the Bay Area. Checked for cost, ages, parking and accessibility.',
    image: '/media/spots.jpg',
  },
  about: {
    title: 'About Nexplore',
    desc: 'Built by a Bay Area mum who takes her two kids to all of it first. Family adventures in your neighborhood.',
    image: '/og-fall.jpg',
  },
}

const sbHeaders = { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` }

async function viewPreview(url, slug, isMap) {
  const view = VIEWS[slug]
  if (!view) return null

  let count = null
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/events?${view.query}&status=eq.published&select=id`,
      { headers: { ...sbHeaders, Prefer: 'count=exact', Range: '0-0' } },
    )
    // content-range comes back as "0-0/37"; the total is what we want.
    const range = res.headers.get('content-range')
    if (range && range.includes('/')) {
      const total = parseInt(range.split('/')[1], 10)
      if (Number.isFinite(total)) count = total
    }
  } catch {
    // A missing count is not worth losing the preview over.
  }

  const n = count === null ? '' : `${count} `
  const title = isMap
    ? `Map of ${n}${view.noun} in the Bay Area | Nexplore`
    : `${n}${view.noun} in the Bay Area | Nexplore`
  // Boat Rides deliberately shows no cost anywhere in the app, so promising
  // "sorted by cost" in its preview would be a promise the page does not keep.
  const desc = view.desc
    || `Every one worth going to, sorted by cost, ages, parking and accessibility. Family adventures in your neighborhood.`
  return { title, desc, image: new URL(FALLBACK_IMAGE, url.origin).href }
}

export default async (request, context) => {
  const url = new URL(request.url)
  const ua = request.headers.get('user-agent') || ''
  if (!CRAWLER.test(ua)) return

  const id = url.searchParams.get('event')

  // No single event, so this may still be a shared section, category or map.
  if (!id) {
    const sec = url.searchParams.get('section')
    if (sec) {
      const meta = SECTIONS[sec]
      if (!meta) return
      return html(meta.title, meta.desc, new URL(meta.image, url.origin).href, url.origin + url.search)
    }

    const slug = url.searchParams.get('view')
    if (!slug || !/^[a-z0-9-]{1,40}$/.test(slug)) return
    const p = await viewPreview(url, slug, url.searchParams.get('map') === '1')
    if (!p) return
    return html(p.title, p.desc, p.image, url.origin + url.search)
  }

  // A weird id should never become a Supabase query.
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) return

  let ev = null
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/events?id=eq.${encodeURIComponent(id)}&status=eq.published` +
        `&select=id,title,description,image_url,city,price_label,is_free&limit=1`,
      { headers: sbHeaders },
    )
    if (res.ok) ev = (await res.json())[0] || null
  } catch {
    // Fall through to the app. A generic preview beats a broken link.
  }
  if (!ev) return

  const where = ev.city ? `, ${ev.city}` : ''
  const title = `${ev.title}${where} | Nexplore`
  const desc =
    cleanDescription(ev.description) ||
    `${ev.title}${where}. Family adventures in your neighborhood.`
  const image = ev.image_url || new URL(FALLBACK_IMAGE, url.origin).href

  // Keep the sharer's full query string, so the pill on the link survives into
  // the canonical URL rather than being flattened back to a bare ?event=.
  return html(title, desc, image, url.origin + url.search)
}

function html(title, desc, image, canonical) {
  const body = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<link rel="canonical" href="${escapeHtml(canonical)}">
<meta name="description" content="${escapeHtml(desc)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Nexplore">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(desc)}">
<meta property="og:image" content="${escapeHtml(image)}">
<meta property="og:url" content="${escapeHtml(canonical)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(desc)}">
<meta name="twitter:image" content="${escapeHtml(image)}">
</head>
<body>
<h1>${escapeHtml(title)}</h1>
<p>${escapeHtml(desc)}</p>
<p><a href="${escapeHtml(canonical)}">Open on Nexplore</a></p>
</body>
</html>`

  return new Response(body, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      // Previews are cached hard by the chat apps anyway; a short edge cache
      // keeps repeated shares of the same link off Supabase.
      'cache-control': 'public, max-age=300',
    },
  })
}
