import { useEffect, useLayoutEffect, useRef, useState } from 'react'

import { HALLOWEEN_PHOTO } from './Redesign.jsx'

// ---------------------------------------------------------------------------
// Events page (Oct 2026 release). Built from the locked prototype
// "Nexplore Event Groups" v20. Spec: claude/nexplore-explore-redesign.md in the
// Truly Athi project.
//
//   day ribbon -> Top picks (featured + in-season pages last)
//   -> "Browse by interest" mosaic -> tapped group's list below it.
//
// Groups come from tags with tag_group = 'event-group'. The keys below are
// fixed; the NAME shown can be changed in Supabase by setting tags.label.
// ---------------------------------------------------------------------------

export const GROUPS = {
  'festivals-fairs':  { key: 'fest',     name: 'Festivals & fairs',  c1: '#F4E4B8', c2: '#9A6A12', art: '/media/groups/fest.svg' },
  'crafts-workshops': { key: 'crafts',   name: 'Crafts & workshops', c1: '#F2D9C9', c2: '#C94F2C', art: '/media/groups/crafts.svg' },
  'stem-coding':      { key: 'stem',     name: 'STEM & coding',      c1: '#D8E6F2', c2: '#2E5E8C', art: '/media/groups/stem.svg' },
  'outdoors-animals': { key: 'outdoors', name: 'Outdoors & animals', c1: '#DCEBD6', c2: '#3F7A34', art: '/media/groups/outdoors.svg' },
  'family-events':    { key: 'family',   name: 'Fun family events',  c1: '#E9DDF3', c2: '#6B4A93', art: '/media/groups/family.svg' },
}
const HALLOWEEN_CHIP = { name: 'Halloween', c1: '#F6D9BF', c2: '#B8561F' }
const FALLBACK_GROUP = 'family-events'

// Short keyword pills on the bigger tiles. One line only; extras are dropped.
const HINTS = {
  'festivals-fairs': ['Oktoberfest', 'Harvest'],
  'crafts-workshops': ['Michaels', 'Lowe’s', 'Home Depot'],
  'stem-coding': ['Apple', 'Science'],
  'outdoors-animals': ['Off the Grid', 'Farms'],
  'family-events': ['Sensory play', 'Yoga'],
  'Halloween': ['Trunk-or-treat', 'Parades'],
  'Pumpkin Patches': ['Corn mazes', 'Hayrides'],
  'Holiday Events': ['Lights', 'Santa photos'],
}

// Art for the "Don't miss" tiles, by exact listing title. Anything else flagged
// dont_miss uses its own photo.
const DONT_MISS_ART = {
  'San Francisco Fleet Week': { label: 'Fleet Week', art: '/media/events/fleet-week.svg' },
  'The Big Bounce America': { label: 'The Big Bounce America', art: '/media/events/big-bounce.jpg' },
}

// Pages that show as photo tiles and as the last Top picks, while in season.
// months are 0-based (8 = Sep).
export const SEASON_PAGES = [
  { pill: 'Halloween', slot: 'season2', months: [8, 9], photo: HALLOWEEN_PHOTO, noun: 'events', window: 'SEP – OCT' },
  { pill: 'Pumpkin Patches', slot: 'season1', months: [8, 9], photo: '/media/pumpkin.jpg', noun: 'patches', window: 'SEP – OCT' },
  { pill: 'Holiday Events', slot: 'season1', months: [10, 11], photo: '/media/home/holiday-events.jpg', noun: 'events', window: 'NOV – DEC' },
]
export const seasonPagesNow = (countFor, now = new Date()) =>
  SEASON_PAGES.filter((s) => s.months.includes(now.getMonth()) && countFor(s.pill) > 0)

// Chain-store listings that run at every branch. On Events they show under
// whichever city is picked in Near.
export const WIDE_CITIES = ['Bay Area', 'Across Bay Area', 'TBD']

// ---- helpers ----------------------------------------------------------------
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const day = (s) => new Date(s + 'T12:00:00')
export const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export const dayTitle = (s) => { const d = day(s); return `${DOW[d.getDay()]}, ${MON[d.getMonth()]} ${d.getDate()}` }
export const onDay = (ev, s) => !!ev.startDate && ev.startDate <= s && (ev.endDate || ev.startDate) >= s

function shortRange(a, b) {
  const A = day(a); const B = day(b || a)
  if (A.getTime() === B.getTime()) return `${MON[A.getMonth()]} ${A.getDate()}`
  if (A.getMonth() === B.getMonth()) return `${MON[A.getMonth()]} ${A.getDate()} - ${B.getDate()}`
  return `${MON[A.getMonth()]} ${A.getDate()} - ${MON[B.getMonth()]} ${B.getDate()}`
}

// Which groups a listing belongs to (tag keys). Halloween listings with no
// group tag live under the Halloween tile only; anything else untagged lands in
// Fun family events so nothing disappears.
export function groupsOf(ev) {
  const g = (ev.tags || []).filter((t) => t.tag_group === 'event-group' && GROUPS[t.name]).map((t) => t.name)
  if (g.length) return g
  if (ev.seasonalType === 'halloween') return []
  return [FALLBACK_GROUP]
}

// Display name, renamable in Supabase through tags.label.
export function groupName(key, events) {
  for (const ev of events) {
    const t = (ev.tags || []).find((x) => x.tag_group === 'event-group' && x.name === key)
    if (t && t.label) return t.label
  }
  return GROUPS[key].name
}

// Group chips for the day view and the Near list.
export function groupChips(ev, names) {
  const g = groupsOf(ev)
  const out = g.map((k) => [`g-${k}`, names[k] || GROUPS[k].name, GROUPS[k].c1, GROUPS[k].c2])
  if (!g.length && ev.seasonalType === 'halloween') out.push(['g-hw', HALLOWEEN_CHIP.name, HALLOWEEN_CHIP.c1, HALLOWEEN_CHIP.c2])
  return out
}

// Repeating listings (same series_name) show as ONE card in a group list:
// the next date's listing, titled with the series name, dated first to last.
export function collapseSeries(list) {
  const out = []; const seen = {}
  const sorted = list.slice().sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''))
  for (const ev of sorted) {
    const s = (ev.seriesName || '').trim()
    if (!s) { out.push(ev); continue }
    if (seen[s]) {
      const c = seen[s]
      if ((ev.endDate || ev.startDate) > c.endDate) c.endDate = ev.endDate || ev.startDate
      c.free = c.free && ev.free
      c._count += 1
      continue
    }
    const c = { ...ev, title: s, endDate: ev.endDate || ev.startDate, _count: 1 }
    seen[s] = c; out.push(c)
  }
  // A "series" of one is just that listing.
  return out.map((c) => (c._count === 1 ? sorted.find((e) => e.id === c.id) : c))
}

// ---- Day ribbon -------------------------------------------------------------
export function DayRibbon({ pick, onPick, hasEvents, lead }) {
  // Keep the picked day in view (the Clear all pill appearing shifts the row).
  const row = useRef(null)
  useEffect(() => {
    const el = row.current; if (!el) return
    const on = el.querySelector('.nx-rb.on')
    if (!on || on.classList.contains('all')) { el.scrollTo({ left: 0 }); return }
    const r = on.getBoundingClientRect(); const box = el.getBoundingClientRect()
    if (r.left < box.left || r.right > box.right) el.scrollTo({ left: el.scrollLeft + r.left - box.left - box.width / 2 + r.width / 2, behavior: 'smooth' })
  }, [pick])
  const days = []
  const d = new Date(); d.setHours(12, 0, 0, 0)
  const end = new Date(d.getFullYear(), d.getMonth() + 3, 0, 12)
  let lastM = -1
  while (d <= end) {
    const s = iso(d)
    if (d.getMonth() !== lastM) { days.push({ mon: MON[d.getMonth()].toUpperCase(), key: `m${d.getMonth()}` }); lastM = d.getMonth() }
    days.push({ s, dow: DOW[d.getDay()].toUpperCase(), n: d.getDate(), we: d.getDay() === 0 || d.getDay() === 6, has: hasEvents(s) })
    d.setDate(d.getDate() + 1)
  }
  return (
    <div className="nx-ribbon" aria-label="Pick a day" ref={row}>
      {lead}
      <button className={`nx-rb all${pick ? '' : ' on'}`} aria-pressed={!pick} onClick={() => onPick(null)}>
        <small>ALL</small><b>Upcoming</b>
      </button>
      {days.map((x) => x.mon ? (
        <span key={x.key} className="nx-mon">{x.mon}</span>
      ) : (
        <button key={x.s} className={`nx-rb${x.we ? ' we' : ''}${x.has ? '' : ' none'}${pick === x.s ? ' on' : ''}`}
          aria-pressed={pick === x.s} disabled={!x.has} onClick={() => onPick(pick === x.s ? null : x.s)}>
          <small>{x.dow}</small><b>{x.n}</b>
        </button>
      ))}
    </div>
  )
}

// ---- Top picks card for an in-season page ---------------------------------
export function SeasonCard({ s, count, onOpen }) {
  const sub = s.pill === 'Pumpkin Patches' ? `${count} patches to visit` : `${count} ${s.pill === 'Halloween' ? 'Halloween' : 'holiday'} events`
  return (
    <article className="nx-big" onClick={onOpen}>
      <div className="nx-art">
        <img src={s.photo} alt="" loading="lazy" decoding="async" style={{ width: '100%', height: 118, objectFit: 'cover', display: 'block' }} />
        <div className="nx-ptop"><span className="nx-ob" style={{ background: '#C94F2C', color: '#fff' }}>✦ Top pick</span></div>
      </div>
      <div className="nx-bigbody">
        <div className="nx-titlerow"><h3>{s.pill}</h3></div>
        <div className="nx-meta">{sub}</div>
        <div className="nx-when">IN SEASON · {s.window}</div>
        <div className="nx-actions"><button className="nx-btn solid" onClick={(e) => { e.stopPropagation(); onOpen() }}>Learn more</button></div>
      </div>
    </article>
  )
}

// ---- Mosaic -----------------------------------------------------------------
// Squarified treemap. The ARRANGEMENT is fixed (Athi approved it): slots are
// laid out on a 358px phone canvas with the approved weights, the top row is
// trimmed to 72% height, then everything is scaled to the real width. Live
// counts are shown on the tiles but do not move them.
const SLOTS = [
  ['festivals-fairs', 10], ['season1', 10], ['season2', 8], ['crafts-workshops', 6], ['stem-coding', 6],
  ['outdoors-animals', 5], ['dm1', 5], ['dm2', 5], ['family-events', 4],
]

function squarify(items, x, y, w, h) {
  const out = []
  const total = items.reduce((a, b) => a + b.v, 0)
  let rest = items.map((i) => ({ ...i, a: (i.v / total) * w * h }))
  const worst = (row, side) => {
    const s = row.reduce((a, b) => a + b.a, 0)
    const mx = Math.max(...row.map((r) => r.a)); const mn = Math.min(...row.map((r) => r.a))
    return Math.max((side * side * mx) / (s * s), (s * s) / (side * side * mn))
  }
  while (rest.length) {
    const short = Math.min(w, h)
    let row = [rest[0]]; let best = worst(row, short)
    for (let i = 1; i < rest.length; i++) {
      const next = [...row, rest[i]]; const wv = worst(next, short)
      if (wv <= best) { row = next; best = wv } else break
    }
    const sum = row.reduce((a, b) => a + b.a, 0)
    if (w >= h) { const cw = sum / h; let cy = y; row.forEach((r) => { const rh = r.a / cw; out.push({ ...r, x, y: cy, w: cw, h: rh }); cy += rh }); x += cw; w -= cw }
    else { const rh = sum / w; let cx = x; row.forEach((r) => { const rw = r.a / rh; out.push({ ...r, x: cx, y, w: rw, h: rh }); cx += rw }); y += rh; h -= rh }
    rest = rest.slice(row.length)
  }
  return out
}

export function layoutTiles(present, W) {
  const REF = 358; const sc = W / REF
  const items = SLOTS.filter(([k]) => present.includes(k)).map(([k, v]) => ({ k, v }))
  if (!items.length) return { tiles: [], H: 0 }
  let base = squarify(items, 0, 0, REF, 780)
  const topH = Math.max(...base.filter((t) => t.y < 1).map((t) => t.h)); const cut = topH * 0.28
  base = base.map((t) => (t.y < 1 ? { ...t, h: t.h - cut } : { ...t, y: t.y - cut }))
  const RH = 780 - cut; const H = Math.round(RH * Math.min(Math.max(sc, 0.9), 1.15))
  return { H, tiles: base.map((t) => ({ ...t, x: t.x * sc, w: t.w * sc, y: (t.y * H) / RH, h: (t.h * H) / RH })) }
}

function Hints({ list, under }) {
  if (!list) return null
  return <span className={`nx-hchips${under ? ' under' : ''}`}>{list.map((c) => <span key={c}>{c}</span>)}</span>
}

// groups: { key: { name, list } }, seasons: [{ s, count }], specials: [ev]
export function Mosaic({ groups, seasons, specials, openKey, onGroup, onSeason, onSpecial }) {
  const box = useRef(null)
  const [W, setW] = useState(0)
  useLayoutEffect(() => {
    const el = box.current; if (!el) return
    const set = () => { const w = el.clientWidth; if (w >= 200) setW(w) }
    set()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(set); ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // One nudge per visit on the biggest tile.
  const [nudge] = useState(() => {
    try { if (sessionStorage.getItem('nx-nudged')) return false; sessionStorage.setItem('nx-nudged', '1') } catch { /* private mode */ }
    return true
  })

  const bySlot = {}
  Object.entries(groups).forEach(([k, g]) => { if (g.list.length) bySlot[k] = { type: 'group', k, ...g } })
  seasons.forEach(({ s, count }) => { bySlot[s.slot] = { type: 'season', s, count } })
  specials.slice(0, 2).forEach((ev, i) => { bySlot[`dm${i + 1}`] = { type: 'special', ev } })
  const { tiles, H } = W ? layoutTiles(Object.keys(bySlot), W) : { tiles: [], H: 0 }

  // Drop hint pills that do not fit on one line (never the first).
  useLayoutEffect(() => {
    if (!box.current) return
    box.current.querySelectorAll('.nx-hchips:not(.under)').forEach((h) => {
      [...h.children].forEach((c) => { c.style.display = '' })
      const kids = [...h.children]
      for (let i = kids.length - 1; i > 0 && h.scrollWidth > h.clientWidth + 1; i--) kids[i].style.display = 'none'
    })
  })

  const GAP = 6
  return (
    <div ref={box} className="nx-mosaic" style={{ height: H || 520 }}>
      {tiles.map((t, i) => {
        const tile = bySlot[t.k]
        const small = t.w < 120 || t.h < 110
        const style = { left: t.x + GAP / 2, top: t.y + GAP / 2, width: t.w - GAP, height: t.h - GAP }
        const cls = `nx-tile${small ? ' sm' : ''}${i === 0 && nudge ? ' first' : ''}`
        const cue = <span className="nx-cue" aria-hidden="true">›</span>
        if (tile.type === 'special') {
          const ev = tile.ev; const art = DONT_MISS_ART[ev.title] || {}
          const img = art.art || ev.imageUrl
          const sub = ev.free ? `${shortRange(ev.startDate, ev.endDate)} · Free` : `${ev.city ? `${ev.city} · ` : ''}${shortRange(ev.startDate, ev.endDate)}`
          return (
            <button key={t.k} className={`${cls} photo`} style={{ ...style, backgroundImage: img ? `url('${img}')` : undefined, backgroundColor: '#2f5d7c' }} onClick={() => onSpecial(ev)}>
              {cue}<span className="nx-go">Don’t miss</span><span />
              <span><span className="nx-tn" style={{ fontSize: small ? 14 : 17 }}>{art.label || ev.title}</span><span className="nx-tr">{sub}</span></span>
            </button>
          )
        }
        if (tile.type === 'season') {
          const { s, count } = tile
          return (
            <button key={t.k} className={`${cls} photo`} style={{ ...style, backgroundImage: `url('${s.photo}')` }} onClick={() => onSeason(s.pill)}>
              {cue}<span />
              <span><span className="nx-tc">{count}</span><span className="nx-tn">{s.pill}</span>
                {t.w >= 100 ? <Hints list={HINTS[s.pill]} /> : <span className="nx-tr">In season</span>}</span>
            </button>
          )
        }
        const g = GROUPS[t.k]; const list = tile.list
        const nf = list.filter((e) => e.free).length
        const fp = nf === list.length ? 'All free' : (nf / list.length >= 2 / 3 ? 'Free' : '')
        const area = t.w * t.h
        const o = (area > 40000 ? 0.62 : area > 22000 ? 0.52 : 0.42) - (i % 2 ? 0.06 : 0)
        const first = list[0]; const lastEnd = list.reduce((m, e) => ((e.endDate || e.startDate) > m ? (e.endDate || e.startDate) : m), first.startDate)
        return (
          <button key={t.k} className={`${cls} soft`} aria-pressed={openKey === t.k} style={{ ...style, background: g.c1, color: g.c2 }} onClick={() => onGroup(t.k)}>
            {cue}<span className="nx-tbg" style={{ '--o': o, backgroundImage: `url('${g.art}')` }} />
            {fp && <span className="nx-freepill">{fp}</span>}<span />
            <span><span className="nx-tc">{list.length}</span><span className="nx-tn">{tile.name}</span>
              {t.w >= 100 ? <Hints list={HINTS[t.k]} under={t.k === 'crafts-workshops'} /> : <span className="nx-tr">{fp ? `${nf} of ${list.length} free` : shortRange(first.startDate, lastEnd)}</span>}</span>
          </button>
        )
      })}
    </div>
  )
}

// Scroll a freshly opened group list into view.
export function useScrollTo(ref, key) {
  useEffect(() => {
    if (key && ref.current) ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [key])
}


