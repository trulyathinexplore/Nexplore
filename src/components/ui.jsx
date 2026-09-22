import { useState, useEffect, useRef } from 'react'
import { cardBg, REGIONS, themeFor } from '../constants.js'
import { seasonState } from '../season.js'

export function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="6.5" cy="6.5" r="4.5" stroke="#888" strokeWidth="1.5" />
      <line x1="10" y1="10" x2="14" y2="14" stroke="#888" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function FilterIcon({ active }) {
  const c = active ? 'white' : '#2D2D2D'
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <line x1="2" y1="4.5" x2="14" y2="4.5" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="5.5" cy="4.5" r="1.8" fill="white" stroke={c} strokeWidth="1.2" />
      <line x1="2" y1="11.5" x2="14" y2="11.5" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="10.5" cy="11.5" r="1.8" fill="white" stroke={c} strokeWidth="1.2" />
    </svg>
  )
}

// Playground info line, in display order: [tag name, label, background, text].
const PLAYGROUND_INFO_LINE = [
  ['inclusive-playground', '♿ Inclusive', '#EFE8F8', '#5A3593'],
  ['restrooms', '🚻 Restrooms', '#E8F5EE', '#1A6B4A'],
  ['parking-onsite', '🅿️ Lot', '#E8F5EE', '#1A6B4A'],
  ['splash-pad', '💦 Splash pad', '#E8F5EE', '#1A6B4A'],
]

// Nine AI illustrations in public/placeholders/playground stand in for any
// playground without its own photo. The image is picked from the park's id, so
// the same park shows the same one in the list, when filtered, and on the map.
const PLAYGROUND_PLACEHOLDERS = 9
function placeholderFor(event) {
  if (event.category !== 'Playground') return null
  const n = Number(event.id)
  let k = 0
  if (Number.isFinite(n)) k = Math.abs(Math.trunc(n))
  else for (const ch of String(event.id)) k = (k * 31 + ch.charCodeAt(0)) >>> 0
  return `/placeholders/playground/playground-${String((k % PLAYGROUND_PLACEHOLDERS) + 1).padStart(2, '0')}.jpg`
}

// Photos in our own Supabase bucket are served through its resizer at 600px
// wide: sharp on a retina phone card, a fraction of the original's weight.
// Anything hosted elsewhere is left untouched, since the resizer can't reach it.
const STORAGE_OBJECT = '/storage/v1/object/public/'
export function sizedImageUrl(url, width = 600) {
  if (!url || !url.includes(STORAGE_OBJECT)) return url
  const resized = url.replace(STORAGE_OBJECT, '/storage/v1/render/image/public/')
  return `${resized}${resized.includes('?') ? '&' : '?'}width=${width}&quality=75&resize=contain`
}

// aspectRatio (e.g. "4 / 5") is used for Playground cards; height (px) everywhere else.
// Each image is tried in order: resized photo, original photo, playground
// placeholder. Only when all of those fail does the letter tile appear.
export function EventImage({ event, height, aspectRatio }) {
  const placeholder = placeholderFor(event)
  const candidates = [...new Set([sizedImageUrl(event.imageUrl), event.imageUrl, placeholder].filter(Boolean))]
  const [step, setStep] = useState(0)
  const src = candidates[step]
  const isPlaceholder = !!src && src === placeholder

  const sizeStyle = aspectRatio ? { width: '100%', aspectRatio } : { width: '100%', height }

  if (src) {
    return (
      <>
        <img
          src={src}
          alt={isPlaceholder ? '' : event.title}
          loading="lazy"
          decoding="async"
          onError={() => setStep((n) => n + 1)}
          style={{ ...sizeStyle, objectFit: 'cover', objectPosition: isPlaceholder ? 'center 35%' : 'center', display: 'block' }}
        />
        {/* Always shown on a placeholder so nobody mistakes it for a photo of
            this park. Playground cards carry a title scrim along the bottom of
            the image, so there the tag sits just above it. */}
        {isPlaceholder && (
          <div style={{
            position: 'absolute', right: 7, bottom: aspectRatio ? 46 : 7,
            background: 'rgba(20,20,20,0.72)', color: 'white',
            fontSize: 8, fontWeight: 600, padding: '2px 7px', borderRadius: 10,
            pointerEvents: 'none',
          }}>AI illustration</div>
        )}
      </>
    )
  }
  return (
    <div style={{
      ...sizeStyle, background: cardBg(event.id),
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: aspectRatio ? 40 : height * 0.35, color: '#1A6B4A', fontFamily: "'Playfair Display', serif", fontWeight: 700,
    }}>
      {event.title.charAt(0)}
    </div>
  )
}

export function EventCardSkeleton() {
  const sh = {
    background: 'linear-gradient(90deg,#ede9e1 25%,#e2ddd6 50%,#ede9e1 75%)',
    backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite', borderRadius: 6,
  }
  return (
    <div style={{ borderRadius: 14, overflow: 'hidden', background: 'white', border: '0.5px solid #E2DDD6', boxShadow: '0 2px 8px rgba(26,107,74,0.08)' }}>
      <div style={{ ...sh, height: 150, borderRadius: 0 }} />
      <div style={{ padding: '8px 10px 10px', display: 'flex', flexDirection: 'column', gap: 7 }}>
        <div style={{ ...sh, height: 8, width: '50%' }} />
        <div style={{ ...sh, height: 11, width: '90%' }} />
        <div style={{ ...sh, height: 8, width: '60%' }} />
        <div style={{ ...sh, height: 8, width: '35%' }} />
        <div style={{ ...sh, height: 26, borderRadius: 8 }} />
      </div>
    </div>
  )
}

export function EventCard({ event, onSelect, onDirections, onShare, isEditorPick, theme = themeFor(null), hidePrice = false }) {
  // Show city name if available, otherwise fall back to area
  const locationLabel = event.city || event.area || 'Bay Area'

  // Format date range for multi-day events.
  // An explicit "Day display label" from the admin ("Sep 1, 5, 10", "Every
  // Saturday") always wins — it exists for dates a start/end range can't express.
  const formatDateRange = () => {
    if (event.dayLabelRaw) return event.dayLabelRaw
    if (!event.startDate) return event.dayLabel || ''
    const start = new Date(event.startDate + 'T12:00:00')
    const end = new Date(event.endDate + 'T12:00:00')

    const startMonth = start.toLocaleString('en-US', { month: 'short' }).toUpperCase()
    const startDay = start.getDate()
    const endMonth = end.toLocaleString('en-US', { month: 'short' }).toUpperCase()
    const endDay = end.getDate()

    if (start.getTime() === end.getTime()) {
      return `${startMonth} ${startDay}`
    }

    if (start.getMonth() === end.getMonth()) {
      return `${startMonth} ${startDay}–${endDay}`
    }

    return `${startMonth} ${startDay} – ${endMonth} ${endDay}`
  }

  // Extract pricing from description (e.g., "Adults $10-14 | Kids 5& under FREE | Parking $10")
 const extractPrice = () => {
  if (event.price) return event.price
  if (event.description) {
    const priceMatch = event.description.match(/\$\d+/)
    if (priceMatch) return `From ${priceMatch[0]}`
  }
  return null
}

  // hidePrice short-circuits BOTH the price_label column and the regex above
  // that scrapes a "$12" out of the description. Clearing price_label alone
  // would not be enough: any Boat Rides description mentioning a dollar figure
  // would quietly reappear as "From $12" on the card.
  const displayPrice = hidePrice ? null : extractPrice()
  const dateRange = formatDateRange()

  // Seasonal state drives two badges, site-wide. Year-round rows (both season
  // columns null, which is everything that predates this) return 'year-round'
  // and render nothing at all.
  const season = seasonState(event)
  const isClosedSeason = season.state === 'closed'
  const isClosingSoon = season.state === 'closing-soon'

  // Only show the age chip for a real range like "5–12" or "4+".
  // "All ages" says nothing and used to render literally as "Ages All ages".
  const showAges = !!event.ages && event.ages.trim().toLowerCase() !== 'all ages'

  // The info line under the title. Ages and reservations for every card; for
  // playgrounds also the few amenities that decide a trip, only when present.
  const tagNames = new Set((event.tags || []).map((t) => t.name))
  const chips = []
  if (showAges) chips.push({ key: 'ages', label: `Ages ${event.ages}`, bg: '#E8F5EE', fg: '#1A6B4A' })
  if (event.needsReservation) chips.push({ key: 'res', label: '🎟 Reservation required', bg: '#FEF0E6', fg: '#C94F2C' })
  if (event.category === 'Playground') {
    for (const [name, label, bg, fg] of PLAYGROUND_INFO_LINE) {
      if (tagNames.has(name)) chips.push({ key: name, label, bg, fg })
    }
  }

  return (
    <div
      style={{
        borderRadius: 14, overflow: 'hidden', background: 'white', border: theme.cardBorder,
        boxShadow: '0 2px 8px rgba(26,107,74,0.08)', animation: 'fadeIn 0.3s ease',
        transition: 'transform 0.15s, box-shadow 0.15s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(26,107,74,0.15)' }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(26,107,74,0.08)' }}
    >
      {/* Image — clicking image opens official URL */}
      <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => onSelect(event)}>
        <EventImage event={event} height={150} />
        {/* hidePrice takes the FREE badge with it. On a pill where cost is
            deliberately not shown, a FREE badge on one card and silence on the
            rest reads as an inconsistency rather than as information. */}
        {!hidePrice && event.free ? (
          <div style={{ position: 'absolute', top: 7, left: 7, background: theme.freeBadgeBg, color: theme.freeBadgeFg, fontSize: 8, fontWeight: 800, padding: '2px 6px', borderRadius: 5, boxShadow: theme.freeBadgeBg === 'white' ? '0 1px 4px rgba(0,0,0,0.2)' : 'none' }}>FREE</div>
        ) : displayPrice ? (
          <div style={{ position: 'absolute', top: 7, left: 7, background: '#2D2D2D', color: 'white', fontSize: 8, fontWeight: 700, padding: '2px 6px', borderRadius: 5 }}>{displayPrice}</div>
        ) : null}
        {/* Seasonal badge. Sits bottom-left rather than top-left so it never
            fights the price or Pick badges, and is legible over any photo
            because it carries its own solid background. */}
        {(isClosedSeason || isClosingSoon) && (
          <div style={{
            position: 'absolute', bottom: 7, left: 7,
            background: isClosedSeason ? 'rgba(45,45,45,0.92)' : '#C94F2C',
            color: 'white', fontSize: 8, fontWeight: 700,
            padding: '3px 7px', borderRadius: 5,
            boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
          }}>
            {isClosedSeason
              ? `CLOSED FOR THE SEASON${season.reopensMonth ? ` · BACK IN ${season.reopensMonth.toUpperCase()}` : ''}`
              : `CLOSING SOON${season.closesMonth ? ` · ENDS ${season.closesMonth.toUpperCase()}` : ''}`}
          </div>
        )}
        {/* Pick moved to the left column. The top-right corner now belongs to
            Share, and the two used to sit on top of each other. */}
        {isEditorPick && (
          <div style={{ position: 'absolute', top: (event.free || displayPrice) ? 25 : 7, left: 7, background: '#C94F2C', color: 'white', fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 5 }}>✦ Top pick</div>
        )}
        {/* 34px circle sitting inside a 44px tap area. 44 is the accepted floor
            for a touch target and the old 26px one was genuinely hard to hit.
            The padding is transparent, so it costs nothing visually while
            giving thumbs the room they need. */}
        {onShare && (
          <div
            onClick={(e) => { e.stopPropagation(); onShare(event) }}
            title="Share"
            style={{
              position: 'absolute', top: 0, right: 0, width: 44, height: 44,
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}
          >
            <div style={{
              width: 34, height: 34, borderRadius: '50%',
              background: 'rgba(255,255,255,0.95)', boxShadow: '0 1px 6px rgba(0,0,0,0.24)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <ShareGlyph size={16} color="#2D2D2D" />
            </div>
          </div>
        )}
      </div>

      <div style={{ padding: '8px 10px 10px' }}>
            {dateRange && (
              <div style={{ fontSize: 9, fontWeight: 700, color: theme.dateFg, textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: 3 }}>{dateRange}</div>
            )}
            <div
              onClick={() => onSelect(event)}
              style={{ fontSize: 12, fontWeight: 600, color: '#2D2D2D', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: 3, cursor: 'pointer' }}
            >
              {event.title}
            </div>

            <div style={{ fontSize: 10, color: '#888880', marginBottom: 6 }}>
              {locationLabel}{displayPrice ? ` · ${displayPrice}` : ''}
            </div>

            {chips.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 7 }}>
                {chips.map((c) => (
                  <div key={c.key} style={{ background: c.bg, color: c.fg, fontSize: 8, fontWeight: 600, padding: '2px 7px', borderRadius: 10 }}>{c.label}</div>
                ))}
              </div>
            )}

            {/* Same two-button row the Playground cards use. Directions is
                especially worth having here now that pumpkin patches carry real
                street addresses — before, openDirections could only send Google
                Maps a city name. */}
            <div style={{ display: 'flex', gap: 5 }}>
              <div
                onClick={(e) => { e.stopPropagation(); onDirections && onDirections(event) }}
                style={{ flex: 1, padding: '6px 0', borderRadius: 8, border: theme.dirBorder, background: theme.dirBg, textAlign: 'center', fontSize: 9, fontWeight: 600, color: theme.dirFg, cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                📍 Directions
              </div>
              <div
                onClick={(e) => { e.stopPropagation(); onSelect(event) }}
                style={{ flex: 1, padding: '6px 0', borderRadius: 8, border: theme.learnBorder, background: theme.learnBg, textAlign: 'center', fontSize: 9, fontWeight: 600, color: theme.learnFg, cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                Learn more →
              </div>
            </div>
      </div>
    </div>
  )
}

export function PicksRow({ picks, onSelect }) {
  if (!picks.length) return null
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '4px 16px 8px' }}>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, color: '#2D2D2D' }}>✦ Picked for you</div>
      </div>
      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', padding: '0 16px 14px' }}>
        {picks.map((p) => (
          <div key={p.id} onClick={() => onSelect(p)} style={{ flexShrink: 0, width: 150, borderRadius: 12, overflow: 'hidden', border: '0.5px solid #E2DDD6', cursor: 'pointer', background: 'white', boxShadow: '0 2px 8px rgba(26,107,74,0.08)' }}>
            <div style={{ position: 'relative' }}>
              <EventImage event={p} height={100} />
              {p.free && <div style={{ position: 'absolute', top: 6, left: 6, background: '#1A6B4A', color: 'white', fontSize: 8, fontWeight: 700, padding: '2px 6px', borderRadius: 5 }}>FREE</div>}
            </div>
            <div style={{ padding: '7px 9px 9px' }}>
              <div style={{ fontSize: 8, fontWeight: 700, color: '#C94F2C', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{p.dayLabel}</div>
              <div style={{ fontSize: 11, fontWeight: 600, lineHeight: 1.3, margin: '3px 0 2px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.title}</div>
              <div style={{ fontSize: 9, color: '#888880' }}>{p.city || p.area}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

export function FilterDrawer({ open, onClose, region, setRegion, freeOnly, setFreeOnly }) {
  if (!open) return null
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ background: '#F7F4EF', borderRadius: '20px 20px 0 0', padding: '0 20px 40px', width: '100%', maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ width: 40, height: 4, borderRadius: 4, background: '#E2DDD6', margin: '12px auto 20px' }} />
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, marginBottom: 20, color: '#2D2D2D' }}>Filters</div>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#888880', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 10 }}>Neighborhood</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 20 }}>
          {REGIONS.map((r) => (
            <div key={r} onClick={() => setRegion(region === r ? null : r)} style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500, border: `0.5px solid ${region === r ? '#1A6B4A' : '#E2DDD6'}`, color: region === r ? '#1A6B4A' : '#888880', background: region === r ? '#E8F5EE' : 'white', cursor: 'pointer' }}>{r}</div>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderTop: '0.5px solid #E2DDD6' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#2D2D2D' }}>Free only</div>
            <div style={{ fontSize: 11, color: '#888880', marginTop: 2 }}>Show only free events and attractions</div>
          </div>
          <div onClick={() => setFreeOnly((v) => !v)} style={{ width: 44, height: 26, borderRadius: 13, background: freeOnly ? '#1A6B4A' : '#E2DDD6', position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 }}>
            <div style={{ position: 'absolute', top: 3, left: freeOnly ? 21 : 3, width: 20, height: 20, borderRadius: '50%', background: 'white', boxShadow: '0 1px 4px rgba(0,0,0,0.2)', transition: 'left 0.2s' }} />
          </div>
        </div>
        <div onClick={onClose} style={{ marginTop: 20, background: '#1A6B4A', color: 'white', padding: 14, borderRadius: 12, textAlign: 'center', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Show results</div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sharing
// ---------------------------------------------------------------------------

export function ShareGlyph({ size = 14, color = '#2D2D2D' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
         strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
      <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="14" />
    </svg>
  )
}

function Tile({ label, bg, ring, children, onClick }) {
  return (
    <div onClick={onClick} style={{ width: 58, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
      <div style={{ width: 46, height: 46, borderRadius: '50%', background: bg, border: ring || 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </div>
      <div style={{ fontSize: 9, color: '#666', textAlign: 'center', lineHeight: 1.2 }}>{label}</div>
    </div>
  )
}

// The destinations are built by src/share.js; this component only lays them
// out. `tiles` arrives as [{ key, label, bg, ring, icon, run }].
export function ShareSheet({ open, onClose, heading, subheading, url, tiles, copied }) {
  // Scrolling the list behind the sheet dismisses it. Tapping the backdrop
  // already did, but a sheet that hangs around while the page moves under it
  // reads as stuck.
  //
  // onClose is an inline arrow in App.jsx, so it is a new function every
  // render. Holding it in a ref keeps the effect from re-subscribing (and
  // resetting `start`) on renders that happen while the sheet is open.
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    if (!open) return
    const start = window.scrollY
    // A threshold, because iOS fires a scroll event for rubber-band overscroll
    // and for the address bar collapsing, neither of which is the user
    // scrolling away.
    const onScroll = () => {
      if (Math.abs(window.scrollY - start) > 12) closeRef.current()
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [open])

  if (!open) return null
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ background: 'white', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, paddingBottom: 26 }}>
        <div style={{ width: 40, height: 4, borderRadius: 4, background: '#E2DDD6', margin: '10px auto 0' }} />

        <div style={{ padding: '12px 18px 12px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#2D2D2D' }}>{heading}</div>
          {subheading && <div style={{ fontSize: 10, color: '#888880', marginTop: 2 }}>{subheading}</div>}
        </div>

        <div style={{ height: '0.5px', background: '#E2DDD6', margin: '0 18px' }} />

        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', padding: '16px 18px 4px' }}>
          {tiles.map((t) => (
            <Tile key={t.key} label={t.label} bg={t.bg} ring={t.ring} onClick={t.run}>{t.icon}</Tile>
          ))}
        </div>

        <div style={{ padding: '8px 18px 0', fontSize: 10, color: '#A8A29E', lineHeight: 1.5 }}>
          {copied ? 'Link copied.' : 'Sending it to yourself is the easiest way to keep it for later.'}
        </div>
      </div>
    </div>
  )
}

// What a shared link opens onto. Deliberately a sheet over the list rather than
// a separate page: the recipient sees the one place their friend meant, and
// closing it leaves them browsing everything else.
export function EventSheet({ event, onClose, onSelect, onDirections, onShare, theme = themeFor(null), hidePrice = false }) {
  if (!event) return null

  // The emoji badge line at the end of a description is internal metadata that
  // now lives in tags. Strip it so it is not shown twice.
  const body = (event.description || '')
    .split('\n')
    .filter((line) => !/^\s*[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{267F}]/u.test(line.trim()))
    .join('\n')
    .trim()

  const amenityTags = (event.tags || []).filter((t) => t.tag_group === 'amenity')
  const pretty = (s) => s.replace(/-/g, ' ').replace(/\b\w/, (c) => c.toUpperCase())

  const endsAt = event.endDate ? new Date(event.endDate + 'T23:59:59') : null
  const hasEnded = !!endsAt && !Number.isNaN(endsAt.getTime()) && endsAt < new Date()
  const endedLabel = hasEnded
    ? endsAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : ''

  // Declared here, ABOVE the return, deliberately. A value referenced in JSX
  // but declared below it is the "Cannot access before initialization" white
  // screen this codebase has hit before, and vite build compiles it silently.
  const sheetSeason = seasonState(event)

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 990, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: 'white', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, maxHeight: '92vh', overflowY: 'auto', paddingBottom: 26 }}
      >
        <div style={{ position: 'relative' }}>
          <EventImage event={event} height={190} />
          <div
            onClick={onClose}
            style={{ position: 'absolute', top: 10, left: 10, width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.94)', boxShadow: '0 1px 5px rgba(0,0,0,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 15, lineHeight: 1, color: '#2D2D2D' }}
          >
            ×
          </div>
          <div
            onClick={() => onShare(event)}
            style={{ position: 'absolute', top: 4, right: 4, width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.95)', boxShadow: '0 1px 6px rgba(0,0,0,0.24)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShareGlyph size={16} color="#2D2D2D" />
            </div>
          </div>
        </div>

        <div style={{ padding: '14px 18px 0' }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 19, fontWeight: 700, color: '#2D2D2D', lineHeight: 1.25 }}>{event.title}</div>
          <div style={{ fontSize: 11, color: '#888880', marginTop: 4 }}>
            {event.city || event.area}{hidePrice ? '' : event.price ? ` · ${event.price}` : event.free ? ' · Free' : ''}
          </div>

          {/* A link shared in October gets opened in December. Say so plainly
              rather than letting someone drive to a closed pumpkin patch. */}
          {hasEnded && (
            <div style={{ display: 'inline-block', marginTop: 9, background: '#F2EFEA', color: '#7a746d', fontSize: 10, fontWeight: 600, padding: '4px 10px', borderRadius: 10 }}>
              This ran until {endedLabel}
            </div>
          )}

          {/* Same reasoning as hasEnded above, for seasonal venues rather than
              dated events. A link shared in September gets opened in March, and
              a sheet that says nothing implies the place is open today. */}
          {sheetSeason.state === 'closed' && (
            <div style={{ display: 'inline-block', marginTop: 9, background: '#F2EFEA', color: '#7a746d', fontSize: 10, fontWeight: 600, padding: '4px 10px', borderRadius: 10 }}>
              Closed for the season{sheetSeason.reopensMonth ? ` · back in ${sheetSeason.reopensMonth}` : ''}
            </div>
          )}
          {sheetSeason.state === 'closing-soon' && (
            <div style={{ display: 'inline-block', marginTop: 9, background: '#FEF0E6', color: '#C94F2C', fontSize: 10, fontWeight: 600, padding: '4px 10px', borderRadius: 10 }}>
              Closing soon{sheetSeason.closesMonth ? ` · season ends in ${sheetSeason.closesMonth}` : ''}
            </div>
          )}

          {amenityTags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 10 }}>
              {amenityTags.map((t) => (
                <div key={t.name} style={{ background: theme.accentSoft, color: theme.accent, fontSize: 9, fontWeight: 600, padding: '3px 8px', borderRadius: 10 }}>{pretty(t.name)}</div>
              ))}
            </div>
          )}

          {body && (
            <div style={{ fontSize: 11.5, color: '#5C5C56', lineHeight: 1.65, marginTop: 12, whiteSpace: 'pre-line' }}>{body}</div>
          )}

          <div style={{ display: 'flex', gap: 7, marginTop: 16 }}>
            <div
              onClick={() => onDirections(event)}
              style={{ flex: 1, padding: '11px 0', borderRadius: 10, border: theme.dirBorder, background: theme.dirBg, textAlign: 'center', fontSize: 12, fontWeight: 600, color: theme.dirFg, cursor: 'pointer' }}
            >
              📍 Directions
            </div>
            <div
              onClick={() => onSelect(event)}
              style={{ flex: 1, padding: '11px 0', borderRadius: 10, border: theme.learnBorder, background: theme.learnBg, textAlign: 'center', fontSize: 12, fontWeight: 600, color: theme.learnFg, cursor: 'pointer' }}
            >
              Learn more →
            </div>
          </div>

          <div
            onClick={onClose}
            style={{ marginTop: 10, textAlign: 'center', fontSize: 11, color: '#888880', cursor: 'pointer', padding: '8px 0' }}
          >
            See everything else nearby
          </div>
        </div>
      </div>
    </div>
  )
}
