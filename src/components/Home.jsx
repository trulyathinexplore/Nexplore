import { useState } from 'react'
import { FALL_COLOUR, WEEKEND_TRIPS } from '../fallLists.js'

// The home page. Lives inside the app rather than as a standalone file like
// public/fall.html, which is the whole reason the header is genuinely shared
// rather than copied, and the reason nothing had to move to a new URL.
//
// Bare nexplore.us renders this. Any URL carrying ?view= or ?event= renders
// the list instead. Every link ever shared carries one of those, so no link
// breaks and no redirect was needed.

// ---------------------------------------------------------------------------
// The tiles. This is the ONLY place they are defined.
//
// To use a real photo, put its path in `photo`. Leave it empty and the
// gradient in `fallback` is used, so the page never looks half-built while
// pictures are still being gathered.
//
// The four fall photos already exist in public/media, put there for the fall
// landing page, so they are wired up here rather than left as gradients.
//
// FRAMING, for whoever crops the rest: the bottom third of every big tile sits
// under the title and the white button, so keep the subject in the upper two
// thirds. The five seasonal squares crop to about 34px, so those want one
// clear subject, not scenery.
// ---------------------------------------------------------------------------

const SEASONAL = [
  { pill: 'Pumpkin Patches', name: 'Pumpkin Patches', note: 'across the Bay', photo: '/media/pumpkin.jpg', fallback: 'linear-gradient(150deg,#dd9448,#c2612f)' },
  { pill: 'Fruit Picking', name: 'Apple Picking', note: 'farms, ends soon', photo: '/media/apple.jpg', fallback: 'linear-gradient(150deg,#8fb56a,#4a7c3f)' },
  { pill: 'Halloween', name: 'Halloween', note: 'events in Oct', photo: '', fallback: 'linear-gradient(150deg,#8b7ab8,#4b3d70)' },
  { sheet: 'colour', name: 'Fall colour', note: 'spots, peaks Nov', count: FALL_COLOUR.places.length, photo: '/media/spots.jpg', fallback: 'linear-gradient(150deg,#e0a05c,#a8552c)' },
  { sheet: 'trips', name: 'Weekend Trips', note: 'trips, best in Oct', count: WEEKEND_TRIPS.places.length, photo: '/media/trips.jpg', fallback: 'linear-gradient(150deg,#8fa8bd,#4a6377)' },
]

// A count of zero is a real state, not a bug: apple picking ends in October
// and pumpkin patches are gone by November. "See all 0" reads as broken, so a
// category with nothing upcoming falls back to a neutral label.
const countCta = (n, word) => (n > 0 ? `See all ${n}` : `See ${word}`)

const TILES = [
  { pill: 'Pumpkin Patches', name: 'Pumpkin Patches', cta: (n) => countCta(n, 'the patches'), photo: '/media/pumpkin.jpg', fallback: 'linear-gradient(150deg,#dd9448 0%,#c2612f 100%)' },
  { pill: 'Fruit Picking', name: 'Fruit Picking', cta: (n) => countCta(n, 'the farms'), photo: '/media/apple.jpg', fallback: 'linear-gradient(150deg,#8fb56a 0%,#4a7c3f 100%)' },
  { pill: 'Beaches', name: 'Beaches & Tidepools', cta: () => 'See the coast', photo: '', fallback: 'linear-gradient(150deg,#7fb3d4 0%,#3d6f96 100%)' },
  { pill: 'Playground', name: 'Playgrounds', cta: () => 'Find one near you', photo: '', fallback: 'linear-gradient(150deg,#b89ccc 0%,#6f4f8f 100%)' },
  { pill: 'Museum', name: 'Museums', cta: () => 'Rainy day list', photo: '', fallback: 'linear-gradient(150deg,#e0a3ae 0%,#a8556a 100%)' },
  { pill: 'Events', name: "What's on this month", cta: () => 'Browse everything', photo: '', fallback: 'linear-gradient(150deg,#9aa8b8 0%,#5c6b7d 100%)' },
]

const bgFor = (t) => (t.photo ? `url('${t.photo}') center / cover` : t.fallback)

function PlayDot() {
  return (
    <div style={{ flexShrink: 0, width: 25, height: 25, borderRadius: '50%', background: '#1A6B4A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="8" height="9" viewBox="0 0 8 9" fill="#fff"><path d="M0.5 0.5 L7.5 4.5 L0.5 8.5 Z" /></svg>
    </div>
  )
}

// Same shape as the sheets on the fall page. A place with a reel is a link
// with a play button; one without is an inert row, so nothing looks broken.
function PlaceSheet({ list, onClose }) {
  if (!list) return null
  const anyReel = list.places.some((p) => p.reel)
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(40,28,20,0.45)', zIndex: 990, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#F7F4EF', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, maxHeight: '88vh', overflowY: 'auto', paddingBottom: 26 }}>
        <div style={{ width: 40, height: 4, borderRadius: 4, background: '#E2DDD6', margin: '11px auto 0' }} />

        <div style={{ padding: '14px 20px 10px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 19, fontWeight: 700 }}>{list.title}</div>
            <div style={{ flexShrink: 0, fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#C94F2C', background: '#FEF0E6', padding: '3px 8px', borderRadius: 20 }}>{list.when}</div>
          </div>
          <div style={{ fontSize: 11.5, color: '#888880', marginTop: 4, lineHeight: 1.5 }}>{list.note}</div>
          {anyReel && <div style={{ fontSize: 11.5, color: '#888880', marginTop: 6 }}>Tap a spot to watch it.</div>}
        </div>

        <div style={{ padding: '0 14px' }}>
          {list.places.map((p) => {
            const inner = (
              <>
                <div style={{ flexGrow: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: '#2D2D2D' }}>{p.name}</div>
                  {p.meta && <div style={{ fontSize: 10.5, color: '#888880', marginTop: 1 }}>{p.meta}</div>}
                </div>
                {p.reel ? <PlayDot /> : null}
              </>
            )
            const style = { display: 'flex', alignItems: 'center', gap: 10, background: 'white', border: '0.5px solid #E2DDD6', borderRadius: 11, padding: '11px 12px', marginBottom: 7, textDecoration: 'none' }
            return p.reel
              ? <a key={p.name} href={p.reel} target="_blank" rel="noreferrer" style={{ ...style, cursor: 'pointer' }}>{inner}</a>
              : <div key={p.name} style={style}>{inner}</div>
          })}
        </div>

        <div onClick={onClose} style={{ margin: '4px 14px 0', textAlign: 'center', fontSize: 11.5, color: '#888880', cursor: 'pointer', padding: '10px 0' }}>Close</div>
      </div>
    </div>
  )
}

export default function Home({ countFor, onPick }) {
  const [sheet, setSheet] = useState(null)

  const openSheet = (key) => setSheet(key === 'colour' ? FALL_COLOUR : WEEKEND_TRIPS)

  return (
    <div>
      {/* Intro */}
      <div style={{ background: 'white', padding: '20px 22px 28px', textAlign: 'center', borderBottom: '0.5px solid #EDE7DF' }}>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 25, fontWeight: 800, lineHeight: 1.22, letterSpacing: '-0.5px', marginBottom: 11 }}>
          Welcome to your Family Outing Planner!
        </div>
        <div style={{ fontSize: 12.5, color: '#6b665f', lineHeight: 1.68 }}>
          We help Bay Area parents find activities that are budget friendly, kid friendly and genuinely fun for the whole family, all season long. Everything at a glance: cost, ages, parking and accessibility. No long articles to read through.
        </div>
        <div style={{ fontSize: 10.5, color: '#a8a29a', marginTop: 13 }}>Free. No account. Nothing to install.</div>
      </div>

      {/* Seasonal band. Three layers: photo, scrim, words. The scrim is what
          keeps white type readable once a bright photo sits behind it.
          The id is the target for ?section=fall. */}
      <div id="section-fall" style={{ position: 'relative', overflow: 'hidden', scrollMarginTop: 12 }}>
        <div style={{ position: 'absolute', inset: 0, background: "url('/media/pumpkin.jpg') center / cover" }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(58,24,10,0.42) 0%, rgba(58,24,10,0.76) 100%)' }} />
        <div style={{ position: 'relative', padding: '24px 18px 26px', color: '#fff' }}>
          <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', opacity: 0.88, marginBottom: 8 }}>Right now in the Bay Area</div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 29, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.6px', marginBottom: 11 }}>
            Your complete guide to Bay&nbsp;Area fall
          </div>
          <div style={{ fontSize: 12.5, lineHeight: 1.58, opacity: 0.95 }}>
            From apple picking and pumpkin patches to the best fall colour streets and a weekend in the Sierra. All of it in one place, with the details you actually need.
          </div>
        </div>
      </div>

      {/* Seasonal tiles. Each goes straight into its category, or opens a
          sheet for the two that have no category behind them. */}
      <div style={{ display: 'flex', gap: 9, overflowX: 'auto', padding: '13px 16px 2px' }}>
        {SEASONAL.map((s) => {
          const n = s.count != null ? s.count : countFor(s.pill)
          return (
            <div
              key={s.name}
              onClick={() => (s.sheet ? openSheet(s.sheet) : onPick(s.pill))}
              style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: '0.5px solid #E2DDD6', borderRadius: 12, padding: '9px 14px 9px 9px', cursor: 'pointer' }}
            >
              <div style={{ width: 34, height: 34, borderRadius: 8, flexShrink: 0, background: bgFor(s) }} />
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>{s.name}</div>
                <div style={{ fontSize: 10, color: '#888880', whiteSpace: 'nowrap' }}>{n > 0 ? `${n} ${s.note}` : 'Back next season'}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Weekend grid */}
      <div id="section-weekend" style={{ padding: '24px 16px 0', scrollMarginTop: 12 }}>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, textAlign: 'center', letterSpacing: '-0.3px', marginBottom: 3 }}>
          Where are we going this weekend?
        </div>
        <div style={{ fontSize: 11.5, color: '#888880', textAlign: 'center', marginBottom: 16 }}>
          Pick a thing. We have already done the looking.
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
          {TILES.map((t) => (
            <div
              key={t.name}
              onClick={() => onPick(t.pill)}
              style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', height: 134, cursor: 'pointer' }}
            >
              <div style={{ position: 'absolute', inset: 0, background: bgFor(t) }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0) 32%, rgba(26,15,8,0.74) 100%)' }} />
              <div style={{ position: 'relative', height: '100%', padding: 11, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                <div style={{ color: '#fff', fontSize: 13.5, fontWeight: 700, lineHeight: 1.2, textShadow: '0 1px 3px rgba(0,0,0,0.4)' }}>{t.name}</div>
                <div style={{ background: '#fff', color: '#2D2D2D', fontSize: 10, fontWeight: 700, padding: '6px 0', borderRadius: 7, textAlign: 'center', marginTop: 7 }}>
                  {t.cta(countFor(t.pill))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div id="section-about" style={{ margin: '24px 16px 0', padding: '17px 16px', background: '#fff', border: '0.5px solid #E2DDD6', borderRadius: 14, textAlign: 'center', scrollMarginTop: 12 }}>
        <div style={{ fontSize: 12, color: '#6b665f', lineHeight: 1.65 }}>
          Built by a Bay Area mum who takes her two kids to all of it first.
        </div>
        <a href="https://www.instagram.com/truly_athi/" target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: 9, fontSize: 12, fontWeight: 700, color: '#1A6B4A', textDecoration: 'none' }}>
          Follow along on Instagram →
        </a>
      </div>

      <div style={{ height: 28 }} />

      <PlaceSheet list={sheet} onClose={() => setSheet(null)} />
    </div>
  )
}
