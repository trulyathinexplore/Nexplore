import { useState, useEffect } from 'react'
import { resolveImage } from '../supabase.js'
import { cardBg, REGIONS } from '../constants.js'

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

export function EventImage({ event, height, aspectRatio }) {
  const [src, setSrc] = useState(event.imageUrl)
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!src && !loading && !failed && event.officialUrl && event.officialUrl !== '#') {
      setLoading(true)
      resolveImage(event.officialUrl, event.id)
        .then((s) => (s ? setSrc(s) : setFailed(true)))
        .catch(() => setFailed(true))
        .finally(() => setLoading(false))
    }
  }, [])

  // aspectRatio (e.g. "4 / 5") is used for Playground cards; height (px) is used everywhere else, unchanged
  const sizeStyle = aspectRatio ? { width: '100%', aspectRatio } : { width: '100%', height }

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={event.title}
        onError={() => { setSrc(null); setFailed(true) }}
        style={{ ...sizeStyle, objectFit: 'cover', display: 'block' }}
      />
    )
  }
  if (loading) {
    return (
      <div style={{
        ...sizeStyle,
        background: 'linear-gradient(90deg,#e8f5ee 25%,#d4e8da 50%,#e8f5ee 75%)',
        backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite',
      }} />
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

export function EventCard({ event, onSelect, onDirections, isEditorPick, isPlayground }) {
  // Show city name if available, otherwise fall back to area
  const locationLabel = event.city || event.area || 'Bay Area'

  // Format date range for multi-day events
  const formatDateRange = () => {
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

  const displayPrice = extractPrice()
  const dateRange = formatDateRange()

  return (
    <div
      style={{
        borderRadius: 14, overflow: 'hidden', background: 'white', border: '0.5px solid #E2DDD6',
        boxShadow: '0 2px 8px rgba(26,107,74,0.08)', animation: 'fadeIn 0.3s ease',
        transition: 'transform 0.15s, box-shadow 0.15s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(26,107,74,0.15)' }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(26,107,74,0.08)' }}
    >
      {/* Image — clicking image opens official URL */}
      <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => onSelect(event)}>
        {isPlayground ? (
          <EventImage event={event} aspectRatio="4 / 5" />
        ) : (
          <EventImage event={event} height={150} />
        )}
        {event.free ? (
          <div style={{ position: 'absolute', top: 7, left: 7, background: '#1A6B4A', color: 'white', fontSize: 8, fontWeight: 800, padding: '2px 6px', borderRadius: 5 }}>FREE</div>
        ) : displayPrice ? (
          <div style={{ position: 'absolute', top: 7, left: 7, background: '#2D2D2D', color: 'white', fontSize: 8, fontWeight: 700, padding: '2px 6px', borderRadius: 5 }}>{displayPrice}</div>
        ) : null}
        {isEditorPick && (
          <div style={{ position: 'absolute', top: 7, right: 7, background: '#C94F2C', color: 'white', fontSize: 7, fontWeight: 700, padding: '2px 6px', borderRadius: 5 }}>✦ Pick</div>
        )}
        {isPlayground && (
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.55)', padding: '6px 8px' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {event.title}
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.8)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {locationLabel}{displayPrice ? ` · ${displayPrice}` : ''}
            </div>
          </div>
        )}
      </div>

      <div style={{ padding: isPlayground ? '8px 10px' : '8px 10px 10px' }}>
        {isPlayground ? (
          /* Playground: title/location live on the scrim above, age tag removed, buttons unchanged */
          <div style={{ display: 'flex', gap: 5 }}>
            <div
              onClick={(e) => { e.stopPropagation(); onDirections && onDirections(event) }}
              style={{ flex: 1, padding: '6px 0', borderRadius: 8, border: '0.5px solid #1A6B4A', background: 'white', textAlign: 'center', fontSize: 9, fontWeight: 600, color: '#1A6B4A', cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              📍 Directions
            </div>
            <div
              onClick={(e) => { e.stopPropagation(); onSelect(event) }}
              style={{ flex: 1, padding: '6px 0', borderRadius: 8, border: '0.5px solid #E2DDD6', background: '#F7F4EF', textAlign: 'center', fontSize: 9, fontWeight: 600, color: '#1A6B4A', cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              Learn more →
            </div>
          </div>
        ) : (
          /* All other cards: unchanged from before */
          <>
            {dateRange && (
              <div style={{ fontSize: 9, fontWeight: 700, color: '#C94F2C', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: 3 }}>{dateRange}</div>
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

            {event.ages && (
              <div style={{ display: 'inline-block', background: '#E8F5EE', color: '#1A6B4A', fontSize: 8, fontWeight: 600, padding: '2px 7px', borderRadius: 10, marginBottom: 7 }}>Ages {event.ages}</div>
            )}

            <div
              onClick={() => onSelect(event)}
              style={{ display: 'block', width: '100%', padding: '6px 0', borderRadius: 8, border: '0.5px solid #E2DDD6', background: '#F7F4EF', textAlign: 'center', fontSize: 10, fontWeight: 600, color: '#1A6B4A', cursor: 'pointer' }}
            >
              Learn more →
            </div>
          </>
        )}
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
