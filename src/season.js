// Seasonal open/closed state, site-wide.
//
// The problem this solves: half the catalogue is seasonal. Pumpkin patches are
// gone by mid-November, lake boating shuts around Labor Day, and a card that
// says nothing reads as "open now" to a parent planning Saturday. Before this,
// the only tools were deleting the row (losing it from search, and from spring
// planning) or leaving it up and misleading people.
//
// Driven entirely by two nullable columns, season_start and season_end. Both
// null means year-round, which is every row that existed before this shipped,
// so nothing changes anywhere until the dates are filled in. That is what makes
// it safe to turn on site-wide in one go.
//
// Dates are stored as MM-DD, not full dates, because a season recurs every
// year. Storing 2026-04-01 would mean editing every row each January.

// "04-01" -> day of year, roughly. Only used for comparisons, so a fixed
// non-leap reference year is fine and keeps it stable.
const DAY_OF = (mmdd) => {
  if (!mmdd) return null
  const m = String(mmdd).match(/^(\d{1,2})-(\d{1,2})$/)
  if (!m) return null
  const month = parseInt(m[1], 10)
  const day = parseInt(m[2], 10)
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  // Cumulative days before each month, non-leap.
  const CUM = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334]
  return CUM[month - 1] + day
}

const MONTH_NAME = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const monthOf = (mmdd) => {
  const m = String(mmdd || '').match(/^(\d{1,2})-/)
  return m ? MONTH_NAME[parseInt(m[1], 10) - 1] || '' : ''
}

// Days before season_end at which "Closing soon" starts showing.
const CLOSING_SOON_DAYS = 21

/**
 * Where an event sits in its season, today.
 *
 * Returns one of:
 *   { state: 'year-round' }            no dates set, or unparseable
 *   { state: 'open' }                  in season, not near the end
 *   { state: 'closing-soon', daysLeft, closesMonth }
 *   { state: 'closed', reopensMonth }
 *
 * `now` is injectable so the tests can pin a date rather than depending on
 * when they happen to run.
 */
export function seasonState(event, now = new Date()) {
  const start = DAY_OF(event?.seasonStart)
  const end = DAY_OF(event?.seasonEnd)

  // Both absent is the overwhelmingly common case: year-round, say nothing.
  if (start === null || end === null) return { state: 'year-round' }

  const today = DAY_OF(`${now.getMonth() + 1}-${now.getDate()}`)

  // A season that wraps the new year (say Nov 15 to Feb 28) has start > end,
  // so "in season" is the union of the two ends of the year rather than the
  // span between them. Getting this wrong would mark every winter attraction
  // permanently closed.
  const inSeason = start <= end
    ? today >= start && today <= end
    : today >= start || today <= end

  if (!inSeason) {
    return { state: 'closed', reopensMonth: monthOf(event.seasonStart) }
  }

  // Days until the season ends, accounting for the wrap.
  const daysLeft = end >= today ? end - today : 365 - today + end
  if (daysLeft <= CLOSING_SOON_DAYS) {
    return { state: 'closing-soon', daysLeft, closesMonth: monthOf(event.seasonEnd) }
  }

  return { state: 'open' }
}

// Convenience for the sort and the all-closed check.
export const isClosedForSeason = (event, now) =>
  seasonState(event, now).state === 'closed'

/**
 * Open things first, closed ones at the bottom, original order preserved
 * within each group.
 *
 * Deliberately a stable partition rather than a comparator: the list arrives
 * already ordered by start_date and the season is the only thing that should
 * override that. Array.prototype.sort is stable in every engine that matters
 * now, but a partition makes the intent obvious and cannot be broken by a
 * comparator that returns something inconsistent.
 */
export function sortClosedLast(events, now) {
  const open = []
  const closed = []
  for (const ev of events) {
    (isClosedForSeason(ev, now) ? closed : open).push(ev)
  }
  return open.concat(closed)
}
