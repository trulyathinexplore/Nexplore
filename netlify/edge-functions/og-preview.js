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

export default async (request, context) => {
  const url = new URL(request.url)
  const id = url.searchParams.get('event')
  if (!id) return

  const ua = request.headers.get('user-agent') || ''
  if (!CRAWLER.test(ua)) return

  // A weird id should never become a Supabase query.
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) return

  let ev = null
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/events?id=eq.${encodeURIComponent(id)}&status=eq.published` +
        `&select=id,title,description,image_url,city,price_label,is_free&limit=1`,
      { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` } },
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
  const canonical = `${url.origin}/?event=${encodeURIComponent(ev.id)}`

  const html = `<!doctype html>
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
<h1>${escapeHtml(ev.title)}</h1>
<p>${escapeHtml(desc)}</p>
<p><a href="${escapeHtml(canonical)}">Open on Nexplore</a></p>
</body>
</html>`

  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      // Previews are cached hard by the chat apps anyway; a short edge cache
      // keeps repeated shares of the same place off Supabase.
      'cache-control': 'public, max-age=300',
    },
  })
}
