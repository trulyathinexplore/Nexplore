import { useState, useLayoutEffect, useRef } from 'react'
import { EventImage, ShareGlyph, sizedImageUrl } from './ui.jsx'
import { seasonState } from '../season.js'
import { PILLS, themeFor, badgesFor, badgeLabel, pillForEvent } from '../constants.js'

// ---------------------------------------------------------------------------
// Explore redesign (Sep 2026). One template for every list page:
//   category circles -> filter pills -> page head (title, Map, Share)
//   -> swipe row of featured cards -> compact photo rows.
// The agreed spec lives in the Truly Athi project: claude/nexplore-explore-redesign.md
// Terminology rule: reuse the app's existing words (Free admission,
// Reservation required, Dog friendly...). Never invent synonyms.
// ---------------------------------------------------------------------------

// The Halloween image everywhere (circle, home tiles, Events page tiles). It is
// the Nightfall at Filoli photo; the listing itself stays as it is.
export const HALLOWEEN_PHOTO = '/media/halloween/filoli.jpg'

// The categories shown as circles, in the order they appear left to right.
// Order set by RAG on 2026-11-05. `photo` is used when set, otherwise the
// gradient + icon stands in.
//
// The three hidden seasonal pills sit between Holiday Events and Indoor Play
// rather than at the end, so that when `hidden` is deleted from them in
// August and September they come back near the front of the row where a
// seasonal pill belongs, instead of off the end of a phone screen.
export const CATEGORY_CIRCLES = [
  { pill: 'Playground', photo: '/media/home/playgrounds-sm.jpg', bg: 'linear-gradient(150deg,#9ac27d,#4f7d3a)' },
  { pill: 'Events', photo: '/media/home/events-sm.jpg', bg: 'linear-gradient(150deg,#2f8a63,#12583a)' },
  { pill: 'Holiday Events', photo: '/media/home/holiday-events-sm.jpg', bg: 'linear-gradient(150deg,#c0504d,#7a2320)' },
  // Hidden out of season, see PILLS in constants.js.
  { pill: 'Pumpkin Patches', photo: '/media/pumpkin.jpg', bg: 'linear-gradient(150deg,#e8a15a,#b8561f)' },
  { pill: 'Halloween', photo: HALLOWEEN_PHOTO, bg: 'linear-gradient(150deg,#8b7ab8,#4b3d70)' },
  { pill: 'Fruit Picking', photo: '/media/apple.jpg', bg: 'linear-gradient(150deg,#8fb56a,#4a7a2e)' },
  { pill: 'Indoor Play', photo: '/media/home/indoor-play-sm.jpg', bg: 'linear-gradient(150deg,#f0a868,#c4622d)' },
  // Nov 5 2026: four categories added to the row, all with RAG's own photos.
  { pill: 'Train Rides', photo: '/media/home/train-rides-sm.jpg', bg: 'linear-gradient(150deg,#8a9a7b,#3f5235)' },
  { pill: 'Zoo & Aquarium', photo: '/media/home/zoo-aquarium-sm.jpg', bg: 'linear-gradient(150deg,#f0a08f,#b8543f)' },
  { pill: 'Museum', photo: '/media/home/museum-sm.jpg', bg: 'linear-gradient(150deg,#6fa3cc,#28527a)' },
  { pill: 'Amusement Parks', photo: '/media/home/amusement-parks-sm.jpg', bg: 'linear-gradient(150deg,#e8788a,#a62f4a)' },
  { pill: 'Boat Rides', photo: '/media/home/boat-rides-sm.jpg', bg: 'linear-gradient(150deg,#5c86ab,#1f3a6b)' },
]

const CAT_ICON = {
  'Events': <path d="M5 7h22v20H5zM5 13h22M11 4v5M21 4v5M16 16l1.5 3 3.2.4-2.4 2.2.7 3.2-3-1.7-3 1.7.7-3.2-2.4-2.2 3.2-.4z" />,
  'Holiday Events': <path d="M16 3l-7 10h4l-6 8h6l-5 6h16l-5-6h6l-6-8h4zM16 27v3" />,
  'Indoor Play': <path d="M4 14L16 5l12 9v13H4zM10 27v-7h12v7M13 20l-3-6h12l-3 6" />,
  'Boat Rides': <path d="M5 20h22l-3 6H8zM16 4v16M16 5l8 12h-8M3 29c3 0 3-1.5 6.5-1.5S13 29 16 29s3-1.5 6.5-1.5S26 29 29 29" />,
}

// Big-card label per page. Events says Featured; trip-style pages say
// Worth the drive.
export function featureLabel(pill) {
  return ['Pumpkin Patches', 'Halloween', 'Holiday Events'].includes(pill) ? 'Worth the drive' : 'Featured'
}

export function CategoryRow({ active, onPick }) {
  return (
    <div className="nx-cats" role="navigation" aria-label="Explore categories">
      {CATEGORY_CIRCLES.filter((c) => !PILLS.find((p) => p.label === c.pill)?.hidden).map((c) => {
        const on = active === c.pill
        return (
          <button key={c.pill} className={`nx-cat${on ? ' on' : ''}`} onClick={() => onPick(c.pill)} aria-current={on ? 'page' : undefined}>
            <span className="nx-cat-img" style={{ background: c.bg }}>
              {c.photo ? (
                <img src={c.photo} alt="" loading="lazy" decoding="async" />
              ) : (
                <svg viewBox="0 0 32 32" width="26" height="26" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{CAT_ICON[c.pill]}</svg>
              )}
            </span>
            <span className="nx-cat-label">{c.pill}</span>
          </button>
        )
      })}
    </div>
  )
}

// ---- shared helpers -------------------------------------------------------
const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
const day = (s) => new Date(s + 'T12:00:00')

export function dateRangeLabel(ev) {
  if (ev.dayLabelRaw) return ev.dayLabelRaw
  if (!ev.startDate) return ev.dayLabel || ''
  const a = day(ev.startDate)
  const b = day(ev.endDate || ev.startDate)
  const A = `${MON[a.getMonth()]} ${a.getDate()}`
  if (a.getTime() === b.getTime()) return A
  if (a.getMonth() === b.getMonth()) return `${A}–${b.getDate()}`
  return `${A} – ${MON[b.getMonth()]} ${b.getDate()}`
}

export function openCloseLabel(ev) {
  if (!ev.startDate) return ''
  const a = day(ev.startDate)
  const b = day(ev.endDate || ev.startDate)
  const A = `${MON[a.getMonth()]} ${a.getDate()}`
  if (a.getTime() === b.getTime()) return A
  return `${A} – ${MON[b.getMonth()]} ${b.getDate()}`
}

// Short tag for the photo corner: the start date for something coming up,
// "TILL OCT 31" for something already running.
function shortTag(ev) {
  if (!ev.startDate) return ''
  const now = new Date(); now.setHours(0, 0, 0, 0)
  const a = day(ev.startDate)
  const b = day(ev.endDate || ev.startDate)
  if (a <= now && b > a) return `TILL ${MON[b.getMonth()]} ${b.getDate()}`
  return `${MON[a.getMonth()]} ${a.getDate()}`
}

const cleanBody = (d) => (d || '')
  .split('\n')
  .filter((line) => !/^\s*[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{267F}]/u.test(line.trim()))
  .join('\n')
  .trim()

// Badges restored from today's EventCard (Sep 29): same labels, same colors,
// same rules. Athi will pick which to keep.
// Photo corner badges: FREE / FREE ADMISSION and Top pick top-left,
// season state bottom-left. Text chips under the title: Ages, Reservation
// required, and playground amenities.
const PLAYGROUND_INFO_LINE = [
  ['inclusive-playground', '♿ Inclusive', '#EFE8F8', '#5A3593'],
  ['restrooms', '🚻 Restrooms', '#E8F5EE', '#1A6B4A'],
  ['parking-onsite', '🅿️ Lot', '#E8F5EE', '#1A6B4A'],
  ['splash-pad', '💦 Splash pad', '#E8F5EE', '#1A6B4A'],
  ['bike-track', '🚲 Bike track', '#E8F5EE', '#1A6B4A'],
]

// Pumpkin Patches and Fruit Picking always say FREE ADMISSION (walking in is
// free; food and activities may cost). Same for Halloween and Holiday Events.
// Elsewhere the price text decides, as before.
function freeLabel(ev, page) {
  if (['Pumpkin Patches', 'Fruit Picking', 'Halloween', 'Holiday Events'].includes(page)) return 'Free Admission'
  return /admission/i.test(ev.price || '') ? 'Free Admission' : 'Free'
}


// Ages + Reservation required (events and everything else).
function EventChips({ ev, extra = [] }) {
  const chips = [...extra]
  if (ev.ages && ev.ages.trim().toLowerCase() !== 'all ages') chips.push(['ages', `Ages ${ev.ages}`, '#E8F5EE', '#1A6B4A'])
  if (ev.needsReservation) chips.push(['res', '🎟 Reservation required', '#FEF0E6', '#C94F2C'])
  return <ChipRow chips={chips} />
}

// Playground amenities: Inclusive, Restrooms, Lot, Splash pad.
function AmenityChips({ ev }) {
  const tagNames = new Set((ev.tags || []).map((t) => t.name))
  const chips = PLAYGROUND_INFO_LINE.filter(([name]) => tagNames.has(name))
  return <ChipRow chips={chips} />
}

function ChipRow({ chips }) {
  if (!chips.length) return null
  return (
    <div className="nx-pills">
      {chips.map(([k, label, bg, fg]) => <span key={k} className="nx-pill" style={{ background: bg, color: fg }}>{label}</span>)}
    </div>
  )
}

const isPlayground = (ev) => ev.category === 'Playground'

// Season status as a text line on the card (not a photo badge).
//   "Closing soon": 7 days or fewer left, from the season end date or, for a
//   multi-day listing already running, its end date.
//   "Closed for the season · Back in May": season is over.
function statusLine(ev) {
  const season = seasonState(ev)
  if (season.state === 'closed') return { text: `Closed for the season${season.reopensMonth ? ` · Back in ${season.reopensMonth}` : ''}`, cls: 'closed' }
  if (season.state === 'closing-soon' && season.daysLeft != null && season.daysLeft <= 7) return { text: 'Closing soon', cls: 'soon' }
  if (ev.startDate && ev.endDate && ev.endDate !== ev.startDate) {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const start = day(ev.startDate); const end = day(ev.endDate)
    const left = Math.round((end - today) / 86400000)
    if (start <= today && left >= 0 && left <= 7) return { text: 'Closing soon', cls: 'soon' }
  }
  return null
}

// White outlined badges above Learn more (Oct 2026). Never more than two
// lines: whatever does not fit becomes a "+N" badge, and tapping it opens the
// detail sheet, which lists every badge. Lines are measured, not guessed,
// because badge widths depend on the phone.
function CardBadges({ ev, page, onMore }) {
  // City roll-ups (Home Haunt Tour, Trick or Treat in <city>) lead with a
  // "Self-guided tour" chip; AMENITY_LABELS in constants.js spells it.
  const ids = ev.mapKind === 'rollup' ? ['self-guided-tour', ...badgesFor(ev, page)] : badgesFor(ev, page)
  const label = pillForEvent(ev, page)
  const measureRef = useRef(null)
  const [shown, setShown] = useState(ids.length)
  const key = ids.join('|')
  useLayoutEffect(() => {
    const box = measureRef.current
    if (!box) return
    const fit = () => {
      const kids = Array.from(box.children)
      if (!kids.length) return
      const tops = [...new Set(kids.map((k) => k.offsetTop))].sort((a, b) => a - b)
      if (tops.length <= 2) { setShown(ids.length); return }
      const second = tops[1]
      const onTwo = kids.filter((k) => k.offsetTop <= second).length
      // Leave room for the "+N" badge on line two.
      setShown(Math.max(1, Math.min(ids.length, onTwo - 1)))
    }
    fit()
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(fit)
      ro.observe(box)
      return () => ro.disconnect()
    }
  }, [key])
  if (!ids.length) return null
  const hidden = ids.length - shown
  return (
    <div className="nx-badgewrap">
      <div className="nx-badges nx-badges-measure" ref={measureRef} aria-hidden="true">
        {ids.map((id) => <span key={id} className="nx-badge">{badgeLabel(id, label)}</span>)}
      </div>
      <div className="nx-badges">
        {ids.slice(0, shown).map((id) => <span key={id} className="nx-badge">{badgeLabel(id, label)}</span>)}
        {hidden > 0 && (
          <button className="nx-badge more" onClick={(e) => { e.stopPropagation(); onMore && onMore(ev) }} aria-label={`${hidden} more`}>+{hidden}</button>
        )}
      </div>
    </div>
  )
}

// Text block shared by both card sizes.
//   Playground: name, city, amenity chips (right after the city).
//   Everything else: name, Ages / Reservation chips (right after the name),
//   city, date.

const hasOfficial = (ev) => {
  const u = ev.officialUrl || ''
  return !!u && u !== '#' && !/(^|\.)google\.[a-z.]+\/maps|maps\.google\.|maps\.app\.goo\.gl|goo\.gl\/maps/i.test(u)
}

function ShareBtn({ onClick, small }) {
  return (
    <button className={small ? 'nx-sshare' : 'nx-cshare'} onClick={(e) => { e.stopPropagation(); onClick() }} aria-label="Share">
      <ShareGlyph size={small ? 14 : 16} color="#2D2D2D" />
    </button>
  )
}

// Round play button over a photo, only when the listing has a video.
// Opens the Learn more sheet with the video already playing.
function PlayBadge({ onClick, big, right }) {
  return (
    <button className={`nx-play${big || right ? ' big' : ''}`} onClick={(e) => { e.stopPropagation(); onClick() }} aria-label="Watch video">
      <span className="nx-play-dot"><svg viewBox="0 0 24 24" width={big ? 20 : 18} height={big ? 20 : 18}><path d="M8 5v14l11-7z" fill="currentColor" /></svg></span>
      <span className="nx-play-txt">Watch</span>
    </button>
  )
}

// ---- Featured / Worth the drive card (swipe row) --------------------------
export function FeatureCard({ ev, onLearnMore, onOfficial, onDirections, onShare, hidePrice, page, theme = themeFor(null) }) {
  const pg = isPlayground(ev)
  // Playgrounds: the card opens the official page (or directions when there
  // is none) and the button is Directions. Everything else opens the sheet.
  const open = () => (pg ? (hasOfficial(ev) ? onOfficial(ev) : onDirections(ev)) : onLearnMore(ev))
  // Nov 5 2026: brought in line with the F list card below it. Status badges
  // sit above the title instead of floating on the photo, and the text runs
  // title, date, city, chips in the same order, so Top picks and the list no
  // longer read as two different products.
  const range = openCloseLabel(ev)
  const where = ev.city || ev.area
  const closed = seasonState(ev).state === 'closed'
  return (
    <article className={`nx-big${closed ? ' closed' : ''}`} onClick={open}>
      <div className="nx-art">
        {/* 4:3 rather than a fixed 118px (RAG, 2026-11-05). At this card
            width 118px was just under 2:1, a letterbox that kept barely a
            third of a portrait reel frame and cut the top off night shots.
            A ratio also scales with the card instead of fighting it. */}
        <EventImage event={ev} aspectRatio="4 / 3" width={900} />
        {ev.videoUrl && <PlayBadge big onClick={() => onLearnMore(ev, true)} />}
      </div>
      <div className="nx-bigbody">
        <StatusRow ev={ev} hidePrice={hidePrice} page={page} />
        <div className="nx-titlerow">
          <h3>{ev.title}</h3>
          <ShareBtn small onClick={() => onShare(ev)} />
        </div>
        {range && <div className="nx-when">{range}</div>}
        {where && <div className="nx-meta">{where}</div>}
        {pg ? <AmenityChips ev={ev} /> : <EventChips ev={ev} />}
        {!pg && <CardBadges ev={ev} page={page} onMore={(x) => onLearnMore(x)} />}
        <div className="nx-actions">
          {pg ? (
            <button className="nx-btn solid" onClick={(e) => { e.stopPropagation(); onDirections(ev) }}>📍 Directions</button>
          ) : (
            // A city roll-up ("Palo Alto Home Haunt Tour") is itself a map;
            // App.jsx routes it straight to that city's map from the same call.
            <button className={`nx-btn${closed ? ' more' : ' solid'}`} onClick={(e) => { e.stopPropagation(); onLearnMore(ev) }}>Learn more</button>
          )}
        </div>
      </div>
    </article>
  )
}

// ---- Listing card (Amazon style) -----------------------------------------
// Status badges as a row above the title (Nov 3, 2026, RAG's call): Free /
// Free admission, Top pick, Newly opened, then the season state. Same slot on
// every card whether or not it has a photo, so titles line up down the list.
function StatusRow({ ev, hidePrice, page }) {
  const showFree = !hidePrice && ev.free && ev.category !== 'Playground'
  const showNew = ev.category === 'Playground' && ev.newlyOpened
  const status = statusLine(ev)
  const items = []
  if (showNew) items.push(['new', 'Newly opened', '#1A6B4A'])
  if (showFree) items.push(['free', freeLabel(ev, page), '#1A6B4A'])
  if (ev.isEditorPick) items.push(['pick', '✦ Top pick', '#C94F2C'])
  if (status) items.push(['status', status.text, status.cls === 'closed' ? '#2D2D2D' : '#C94F2C'])
  if (!items.length) return null
  return (
    <div className="nx-statusrow">
      {items.map(([k, label, bg]) => <span key={k} className="nx-ob" style={{ background: bg, color: '#fff' }}>{label}</span>)}
    </div>
  )
}

// The list card (Nov 3, 2026 redesign, "option F"). Text first: status
// badges, title, date, city, chips, then Learn more at the foot of the text
// column. The photo (or reel) fills the right side edge to edge when there is
// one; without one the text takes the full width and nothing stands in for the
// picture. No price on the card: the Free badge says what matters and the
// sheet has the rest. Reels: the play dot sits on the photo and opens the
// sheet with the video playing; the rest of the card opens the sheet as usual.
export function CompactRow({ ev, onToggle, onOfficial, onDirections, onShare, hidePrice, page, theme = themeFor(null), extraChips }) {
  const pg = isPlayground(ev)
  const open = () => (pg ? (hasOfficial(ev) ? onOfficial(ev) : onDirections(ev)) : onToggle(ev, false))
  const hasPhoto = !!ev.imageUrl || pg // playgrounds always have a placeholder photo
  const range = openCloseLabel(ev)
  const season = seasonState(ev)
  const closed = season.state === 'closed'
  const where = ev.city || ev.area
  return (
    <article className={`nx-row${hasPhoto ? ' has-photo' : ''}${closed ? ' closed' : ''}`} onClick={open}>
      <div className="nx-rowbody">
        <StatusRow ev={ev} hidePrice={hidePrice} page={page} />
        <div className="nx-titlerow">
          <h4>{ev.title}</h4>
          <ShareBtn small onClick={() => onShare(ev)} />
        </div>
        {/* With a photo the card is tall anyway, so date and place get a line
            each. Without one, they share a line and the card loses a row. */}
        {hasPhoto ? (
          <>
            {range && <div className="nx-when">{range}</div>}
            {where && <div className="nx-meta">{where}</div>}
          </>
        ) : (
          (range || where) && (
            <div className="nx-when">
              {range}
              {where && <span className="nx-where">{range ? ` · ${where}` : where}</span>}
            </div>
          )
        )}
        {pg ? <AmenityChips ev={ev} /> : <EventChips ev={ev} extra={extraChips} />}
        {!pg && <CardBadges ev={ev} page={page} onMore={(x) => onToggle(x, false)} />}
        <div className="nx-rowactions">
          {pg ? (
            <button className="nx-btn solid" onClick={(e) => { e.stopPropagation(); onDirections(ev) }}>📍 Directions</button>
          ) : (
            <button className={`nx-btn${closed ? ' more' : ' solid'}`} onClick={(e) => { e.stopPropagation(); open() }}>Learn more</button>
          )}
        </div>
      </div>
      {hasPhoto && (
        <div className="nx-rowphoto">
          <EventImage event={ev} height={'100%'} />
          {ev.videoUrl && (
            <button className="nx-rowplay" onClick={(e) => { e.stopPropagation(); onToggle(ev, true) }} aria-label="Watch video">
              <svg viewBox="0 0 24 24" width="22" height="22"><path d="M8 5v14l11-7z" fill="currentColor" /></svg>
            </button>
          )}
        </div>
      )}
    </article>
  )
}

// ---- Page head ------------------------------------------------------------
export function PageHead({ title, subtitle, showMap, mapOn, onMap, onShare, onBack }) {
  return (
    <div className="nx-head">
      {onBack && <button className="nx-back" onClick={onBack} aria-label="Back to Events">‹ Events</button>}
      <div style={{ minWidth: 0, flex: 1 }}>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <div className="nx-headbtns">
        {showMap && (
          <button className={`nx-hbtn${mapOn ? ' on' : ''}`} onClick={onMap}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z" /><path d="M9 4v14M15 6v14" /></svg>
            {mapOn ? 'List' : 'Map'}
          </button>
        )}
        {onShare && (
          <button className="nx-hbtn" onClick={onShare} aria-label="Share this page">
            <ShareGlyph size={14} color="#2D2D2D" />
          </button>
        )}
      </div>
    </div>
  )
}

export { sizedImageUrl }
