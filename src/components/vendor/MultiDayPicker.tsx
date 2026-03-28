'use client'
import { useState } from 'react'

interface ExistingBooking {
  date: string   // YYYY-MM-DD
  status: string
  public_id: string
}

interface Props {
  onDayClick: (date: string) => void
  existingBookings: ExistingBooking[]
}

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]
const DAY_NAMES = ['Mo','Tu','We','Th','Fr','Sa','Su']

const STATUS_COLORS: Record<string, string> = {
  pending:   'bg-yellow-50 text-yellow-700 border-yellow-200',
  confirmed: 'bg-success-bg text-success border-success/30',
  completed: 'bg-blue-50 text-blue-700 border-blue-200',
  cancelled: 'bg-red-50 text-red-600 border-red-200',
}
const STATUS_DOTS: Record<string, string> = {
  pending:  'bg-amber-400',
  confirmed:'bg-success',
}

function toYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function getCalendarDays(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1)
  const last  = new Date(year, month + 1, 0)
  let dow = first.getDay()
  dow = dow === 0 ? 6 : dow - 1  // Mon-based (Mon=0)
  const days: (Date | null)[] = Array(dow).fill(null)
  for (let d = 1; d <= last.getDate(); d++) days.push(new Date(year, month, d))
  while (days.length % 7 !== 0) days.push(null)
  return days
}

function formatDateShort(ymd: string): string {
  const d = new Date(ymd + 'T00:00:00')
  return d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
}

export default function MultiDayPicker({ onDayClick, existingBookings }: Props) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())

  function prev() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  function next() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  const days = getCalendarDays(year, month)
  const todayYMD = toYMD(now)

  // Index bookings by date
  const byDate = new Map<string, { hasPending: boolean; hasConfirmed: boolean; refs: string[] }>()
  for (const b of existingBookings) {
    const e = byDate.get(b.date) ?? { hasPending: false, hasConfirmed: false, refs: [] }
    if (b.status === 'pending')   e.hasPending = true
    if (b.status === 'confirmed') e.hasConfirmed = true
    e.refs.push(b.public_id)
    byDate.set(b.date, e)
  }

  // Sidebar: bookings visible in the current month (pending + confirmed only)
  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`
  const sidebarBookings = existingBookings
    .filter(b => b.date.startsWith(monthPrefix) && (b.status === 'pending' || b.status === 'confirmed'))
    .sort((a, b) => a.date.localeCompare(b.date))

  return (
    <div className="bg-white border border-border rounded-xl overflow-hidden">
      <div className="flex flex-col lg:flex-row">
        {/* ── Calendar ──────────────────────────────────────── */}
        <div className="p-5 lg:w-[320px] lg:shrink-0">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-5">
            <button onClick={prev}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-bg transition-colors text-ink-3 hover:text-ink text-[20px] font-light leading-none">
              ‹
            </button>
            <p className="font-display font-bold text-[15px] tracking-tight">
              {MONTH_NAMES[month]} {year}
            </p>
            <button onClick={next}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-bg transition-colors text-ink-3 hover:text-ink text-[20px] font-light leading-none">
              ›
            </button>
          </div>

          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAY_NAMES.map((d, i) => (
              <div key={d}
                className={`text-center text-[10.5px] font-bold uppercase tracking-wider py-1
                  ${i >= 5 ? 'text-ink-4/60' : 'text-ink-4'}`}>
                {d}
              </div>
            ))}
          </div>

          {/* Day tiles */}
          <div className="grid grid-cols-7 gap-0.5">
            {days.map((day, i) => {
              if (!day) return <div key={`e${i}`} className="aspect-square" />
              const ymd = toYMD(day)
              const isToday = ymd === todayYMD
              const info = byDate.get(ymd)
              const isWeekend = i % 7 >= 5
              const tooltip = info?.refs.join(' · ')

              return (
                <div key={ymd} title={tooltip}>
                  <button
                    onClick={() => onDayClick(ymd)}
                    className={`w-full flex flex-col items-center justify-center rounded-lg py-1.5 transition-all active:scale-95 select-none
                      ${isToday
                        ? 'bg-accent text-white shadow-sm'
                        : info
                          ? 'bg-amber-50 hover:bg-accent/10 hover:text-accent text-ink'
                          : isWeekend
                            ? 'text-ink-3 hover:bg-accent/10 hover:text-accent'
                            : 'text-ink hover:bg-accent/10 hover:text-accent'
                      }`}
                  >
                    <span className="text-[13px] font-medium leading-none">{day.getDate()}</span>
                    {/* Dots */}
                    <div className="flex items-center gap-0.5 mt-1 h-1.5">
                      {!isToday && info?.hasPending  && <span className="w-1 h-1 rounded-full bg-amber-400" />}
                      {!isToday && info?.hasConfirmed && <span className="w-1 h-1 rounded-full bg-success" />}
                    </div>
                  </button>
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 mt-4 pt-4 border-t border-border text-[11px] text-ink-4">
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" /> Pending</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-success inline-block" /> Confirmed</span>
            <span className="ml-auto">Click to add</span>
          </div>
        </div>

        {/* ── Bookings sidebar ──────────────────────────────── */}
        <div className="border-t lg:border-t-0 lg:border-l border-border flex flex-col min-w-0 flex-1">
          <div className="px-5 pt-5 pb-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-ink-4">
              {MONTH_NAMES[month]} bookings
            </p>
          </div>

          {sidebarBookings.length === 0 ? (
            <div className="px-5 pb-5 flex-1 flex items-start">
              <p className="text-[13px] text-ink-4">No bookings this month.</p>
            </div>
          ) : (
            <div className="overflow-y-auto px-4 pb-4 space-y-2" style={{ maxHeight: 280 }}>
              {sidebarBookings.map(b => (
                <div key={b.public_id + b.date}
                  className="flex items-center justify-between gap-3 py-2.5 px-3 rounded-lg bg-bg/60 border border-border">
                  <div className="min-w-0">
                    <p className="font-mono text-[12px] font-bold text-ink truncate">{b.public_id}</p>
                    <p className="text-[11.5px] text-ink-3 mt-0.5">{formatDateShort(b.date)}</p>
                  </div>
                  <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${STATUS_COLORS[b.status] ?? 'bg-bg text-ink-3 border-border'}`}>
                    {b.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
