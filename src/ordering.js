// List order for categories that have their own rule (Oct 2026 release).
//
// Every other category keeps the default: the database order (start date,
// oldest first) with closed-for-the-season venues moved to the bottom.
//
// Pumpkin Patches (RAG, Oct 6):
//   1. Farms open today first. Farms that have not opened yet, or are closed
//      for the season, go to the bottom.
//   2. Among open farms: a video, then Rides & Games, then Free admission.
//      More of these ranks higher, so video + rides + free beats video only.
//   3. Same score: the farm closing soonest first.
//   4. Same-name farms (ABC Tree Farms, Speer, the floating patches) never sit
//      next to each other.
//
// Halloween (RAG, Oct 6):
//   1. Closed for the season goes to the bottom (ended events are already
//      filtered out before this runs).
//   2. A video, then Family friendly, then Yard displays, then Haunted maze.
//      More of these ranks higher.
//   3. Same score: happening soonest. Things already running come first,
//      ordered by which closes soonest; then upcoming ones by start date.
//   4. Same-name listings never sit next to each other.
import { isClosedForSeason } from './season.js'

const DAY = 86400000
const dayOf = (s) => (s ? new Date(s + 'T12:00:00').getTime() : null)
const hasTag = (ev, name) => (ev.tags || []).some((t) => t && t.name === name)

const startOfToday = (now) => {
  const d = new Date(now)
  d.setHours(12, 0, 0, 0)
  return d.getTime()
}

// Not open yet: starts in the future. Closed: out of season.
export function isOpenToday(ev, now = new Date()) {
  if (isClosedForSeason(ev, now)) return false
  const s = dayOf(ev.startDate)
  return s === null || s <= startOfToday(now)
}

// "ABC Tree Farms - Fremont" -> "abc tree farms". Pool events share one brand
// so three floating patches in a row also get spaced out.
export function brandOf(ev) {
  const t = String(ev.title || '').toLowerCase().trim()
  if (/floating pumpkin patch|pumpkin splash|pumpkin pool/.test(t)) return 'pool-pumpkin-events'
  const cut = t.split(/\s+[-–—]\s+|\s*\(/)[0]
  return cut.trim() || t
}

// Pull the next different-brand item forward whenever two of the same brand
// would touch. Order is otherwise kept as close to the input as possible.
export function spreadBrands(list) {
  const out = []
  const pool = list.slice()
  while (pool.length) {
    const prev = out.length ? brandOf(out[out.length - 1]) : null
    let i = 0
    if (prev !== null && brandOf(pool[0]) === prev) {
      const j = pool.findIndex((ev) => brandOf(ev) !== prev)
      if (j > 0) i = j
    }
    out.push(pool.splice(i, 1)[0])
  }
  return out
}

const closingKey = (ev) => {
  const e = dayOf(ev.endDate)
  return e === null ? Number.MAX_SAFE_INTEGER : e
}

function pumpkinScore(ev) {
  return (ev.videoUrl ? 4 : 0) + (hasTag(ev, 'rides-games') ? 2 : 0) + (hasTag(ev, 'free-admission') ? 1 : 0)
}

function halloweenScore(ev) {
  return (ev.videoUrl ? 8 : 0) + (hasTag(ev, 'family-friendly') ? 4 : 0) +
    (hasTag(ev, 'home-display') ? 2 : 0) + (hasTag(ev, 'haunted-maze') ? 1 : 0)
}

// Running now: ordered by closing soonest. Upcoming: by start date. Running
// things come first, since they are happening sooner than anything upcoming.
function soonestKey(ev, today) {
  const s = dayOf(ev.startDate)
  if (s === null || s <= today) return [0, closingKey(ev)]
  return [1, s]
}

const stableSort = (list, cmp) =>
  list.map((ev, i) => [ev, i]).sort((a, b) => cmp(a[0], b[0]) || a[1] - b[1]).map((p) => p[0])

export function orderPumpkinPatches(list, now = new Date()) {
  const open = list.filter((ev) => isOpenToday(ev, now))
  const later = list.filter((ev) => !isOpenToday(ev, now))
  const ranked = stableSort(open, (a, b) => pumpkinScore(b) - pumpkinScore(a) || closingKey(a) - closingKey(b))
  // Not open yet: soonest opening first; closed for the season last of all.
  const rest = stableSort(later, (a, b) => {
    const ca = isClosedForSeason(a, now) ? 1 : 0
    const cb = isClosedForSeason(b, now) ? 1 : 0
    return ca - cb || (dayOf(a.startDate) || 0) - (dayOf(b.startDate) || 0)
  })
  return spreadBrands(ranked).concat(spreadBrands(rest))
}

export function orderHalloween(list, now = new Date()) {
  const today = startOfToday(now)
  const live = list.filter((ev) => !isClosedForSeason(ev, now))
  const closed = list.filter((ev) => isClosedForSeason(ev, now))
  const ranked = stableSort(live, (a, b) => {
    const d = halloweenScore(b) - halloweenScore(a)
    if (d) return d
    const ka = soonestKey(a, today)
    const kb = soonestKey(b, today)
    return ka[0] - kb[0] || ka[1] - kb[1]
  })
  return spreadBrands(ranked).concat(closed)
}

// Entry point used by App.jsx. `list` is already filtered to upcoming items
// and partitioned with closed-for-season last.
export function orderForPill(pillLabel, list, now = new Date()) {
  if (pillLabel === 'Pumpkin Patches') return orderPumpkinPatches(list, now)
  if (pillLabel === 'Halloween') return orderHalloween(list, now)
  return list
}

// Top picks row: your ranking first (top_pick_rank 1, 2, 3...), unranked picks
// after, keeping their list order.
export function orderTopPicks(picks) {
  return stableSort(picks, (a, b) => {
    const ra = a.topPickRank == null ? Number.MAX_SAFE_INTEGER : a.topPickRank
    const rb = b.topPickRank == null ? Number.MAX_SAFE_INTEGER : b.topPickRank
    return ra - rb
  })
}

// Top picks now also stay in the main list. The list must not open with the
// same place the Top picks row opens with, so swap it one down if it does.
export function avoidSameFirst(list, firstPick) {
  if (!firstPick || list.length < 2 || list[0].id !== firstPick.id) return list
  const out = list.slice()
  ;[out[0], out[1]] = [out[1], out[0]]
  return out
}

export const _test = { pumpkinScore, halloweenScore, DAY }
