import { useState } from 'react'
import { EventImage, ShareGlyph, sizedImageUrl } from './ui.jsx'
import { seasonState } from '../season.js'
import { themeFor } from '../constants.js'

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

// The categories shown as circles. Zoo & Aquarium, Museum and Beaches are left
// out on purpose for now; their pages still work from Home and old links.
// `photo` is used when set, otherwise the gradient + icon stands in.
export const CATEGORY_CIRCLES = [
  { pill: 'Playground', photo: '/media/home/playgrounds-sm.jpg', bg: 'linear-gradient(150deg,#9ac27d,#4f7d3a)' },
  { pill: 'Events', photo: '/media/home/events-sm.jpg', bg: 'linear-gradient(150deg,#2f8a63,#12583a)' },
  { pill: 'Pumpkin Patches', photo: '/media/pumpkin.jpg', bg: 'linear-gradient(150deg,#e8a15a,#b8561f)' },
  { pill: 'Halloween', photo: HALLOWEEN_PHOTO, bg: 'linear-gradient(150deg,#8b7ab8,#4b3d70)' },
  { pill: 'Fruit Picking', photo: '/media/apple.jpg', bg: 'linear-gradient(150deg,#8fb56a,#4a7a2e)' },
  { pill: 'Holiday Events', photo: '/media/home/holiday-events-sm.jpg', bg: 'linear-gradient(150deg,#c0504d,#7a2320)' },
  { pill: 'Boat Rides', photo: '/media/home/boat-rides-sm.jpg', bg: 'linear-gradient(150deg,#5c86ab,#1f3a6b)' },
]

const CAT_ICON = {
  'Events': <path d="M5 7h22v20H5zM5 13h22M11 4v5M21 4v5M16 16l1.5 3 3.2.4-2.4 2.2.7 3.2-3-1.7-3 1.7.7-3.2-2.4-2.2 3.2-.4z" />,
  'Holiday Events': <path d="M16 3l-7 10h4l-6 8h6l-5 6h16l-5-6h6l-6-8h4zM16 27v3" />,
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
      {CATEGORY_CIRCLES.map((c) => {
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
]

// Pumpkin Patches and Fruit Picking always say FREE ADMISSION (walking in is
// free; food and activities may cost). Same for Halloween and Holiday Events.
// Elsewhere the price text decides, as before.
function freeLabel(ev, page) {
  if (['Pumpkin Patches', 'Fruit Picking', 'Halloween', 'Holiday Events'].includes(page)) return 'Free Admission'
  return /admission/i.test(ev.price || '') ? 'Free Admission' : 'Free'
}

function PhotoBadges({ ev, hidePrice, theme, page, extraTop, extraBottom }) {
  // Playgrounds never get it: nearly all are free, so it says nothing.
  const showFree = !hidePrice && ev.free && ev.category !== 'Playground'
  // Playgrounds only: set by SQL (newly_opened), stays until it is removed.
  const showNew = ev.category === 'Playground' && ev.newlyOpened
  return (
    <>
      <div className="nx-ptop">
        {extraTop}
        {showNew && <span className="nx-ob" style={{ background: '#1A6B4A', color: '#fff', fontWeight: 800 }}>Newly opened</span>}
        {showFree && (
          <span className="nx-ob" style={{ background: '#1A6B4A', color: '#fff', fontWeight: 800 }}>{freeLabel(ev, page)}</span>
        )}
        {ev.isEditorPick && <span className="nx-ob" style={{ background: '#C94F2C', color: '#fff' }}>✦ Top pick</span>}
      </div>
      <div className="nx-pbot">
        {extraBottom}
      </div>
    </>
  )
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

// Text block shared by both card sizes.
//   Playground: name, city, amenity chips (right after the city).
//   Everything else: name, Ages / Reservation chips (right after the name),
//   city, date.
function CardText({ ev, hidePrice, onShare, Title, extraChips }) {
  // Cards show only opening to closing date ("SEP 26 – NOV 1"). The detailed
  // schedule ("Fri to Sun, through Nov 1") and times live in the sheet.
  const range = openCloseLabel(ev)
  const status = statusLine(ev)
  // City only. The free badge on the photo already says the price, and
  // playgrounds are assumed free, so no price text repeats here.
  const meta = <div className="nx-meta">{ev.city || ev.area}</div>
  return (
    <>
      <div className="nx-titlerow">
        <Title>{ev.title}</Title>
        <ShareBtn small onClick={() => onShare(ev)} />
      </div>
      {isPlayground(ev) ? (
        <>{meta}<AmenityChips ev={ev} />{status && <div className={`nx-status ${status.cls}`}>{status.text}</div>}</>
      ) : (
        <>
          <EventChips ev={ev} extra={extraChips} />
          {meta}
          {range && <div className="nx-when">{range}</div>}
          {status && <div className={`nx-status ${status.cls}`}>{status.text}</div>}
        </>
      )}
    </>
  )
}

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
  const H3 = ({ children }) => <h3>{children}</h3>
  return (
    <article className="nx-big" onClick={open}>
      <div className="nx-art">
        <EventImage event={ev} height={118} />
        <PhotoBadges ev={ev} hidePrice={hidePrice} theme={theme} page={page} />
        {ev.videoUrl && <PlayBadge big onClick={() => onLearnMore(ev, true)} />}
      </div>
      <div className="nx-bigbody">
        <CardText ev={ev} hidePrice={hidePrice} onShare={onShare} Title={H3} />
        <div className="nx-actions">
          {pg ? (
            <button className="nx-btn solid" onClick={(e) => { e.stopPropagation(); onDirections(ev) }}>📍 Directions</button>
          ) : (
            <button className="nx-btn solid" onClick={(e) => { e.stopPropagation(); onLearnMore(ev) }}>Learn more</button>
          )}
        </div>
      </div>
    </article>
  )
}

// ---- Listing card (Amazon style) -----------------------------------------
export function CompactRow({ ev, onToggle, onOfficial, onDirections, onShare, hidePrice, page, theme = themeFor(null), extraChips }) {
  const pg = isPlayground(ev)
  const open = () => (pg ? (hasOfficial(ev) ? onOfficial(ev) : onDirections(ev)) : onToggle(ev, false))
  const H4 = ({ children }) => <h4>{children}</h4>
  return (
    <article className="nx-small" onClick={open}>
      <div className="nx-thumb">
        <EventImage event={ev} height={'100%'} />
        <PhotoBadges ev={ev} hidePrice={hidePrice} theme={theme} page={page} />
        {ev.videoUrl && <PlayBadge right onClick={() => onToggle(ev, true)} />}
      </div>
      <div className="nx-smallbody">
        <CardText ev={ev} hidePrice={hidePrice} onShare={onShare} Title={H4} extraChips={extraChips} />
        <div className="nx-actions">
          {pg ? (
            <button className="nx-btn solid" onClick={(e) => { e.stopPropagation(); onDirections(ev) }}>📍 Directions</button>
          ) : (
            <button className="nx-btn solid" onClick={(e) => { e.stopPropagation(); open() }}>Learn more</button>
          )}
        </div>
      </div>
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
