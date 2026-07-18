'use client'
import { useMemo, useRef, useState } from 'react'

interface ExistingBooking {
  date: string   // YYYY-MM-DD (start_date)
  status: string
  public_id: string
}

interface UnavailableVehicle {
  name: string
}

interface Props {
  onDayClick: (date: string) => void
  onMonthChange?: (year: number, month: number) => void | Promise<void>
  existingBookings: ExistingBooking[]
  /** Individual-vehicle mode: show hover tooltip listing which vehicles are booked on that date */
  unavailableVehiclesByDate?: Map<string, UnavailableVehicle[]>
  /** Same-for-all mode: these dates are blocked (red, unclickable) for the chosen vehicle */
  blockedDates?: Set<string>
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

export default function MultiDayPicker({ onDayClick, onMonthChange, existingBookings, unavailableVehiclesByDate, blockedDates }: Props) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [tooltip, setTooltip] = useState<{ ymd: string; x: number; y: number } | null>(null)
  const [loadingMonth, setLoadingMonth] = useState(false)
  const [monthLoadFailed, setMonthLoadFailed] = useState(false)
  const loadSequence = useRef(0)

  function loadMonth(nextYear: number, nextMonth: number) {
    if (!onMonthChange) return
    const sequence = ++loadSequence.current
    setLoadingMonth(true)
    setMonthLoadFailed(false)
    Promise.resolve(onMonthChange(nextYear, nextMonth))
      .catch(() => {
        if (sequence === loadSequence.current) setMonthLoadFailed(true)
      })
      .finally(() => {
        if (sequence === loadSequence.current) setLoadingMonth(false)
      })
  }

  function prev() {
    const nextYear = month === 0 ? year - 1 : year
    const nextMonth = month === 0 ? 11 : month - 1
    setYear(nextYear)
    setMonth(nextMonth)
    loadMonth(nextYear, nextMonth)
  }
  function next() {
    const nextYear = month === 11 ? year + 1 : year
    const nextMonth = month === 11 ? 0 : month + 1
    setYear(nextYear)
    setMonth(nextMonth)
    loadMonth(nextYear, nextMonth)
  }

  const days = getCalendarDays(year, month)
  const todayYMD = toYMD(now)

  // Index bookings by date for dots/sidebar
  const byDate = useMemo(() => {
    const index = new Map<string, { hasPending: boolean; hasConfirmed: boolean; refs: string[] }>()
    for (const b of existingBookings) {
      const entry = index.get(b.date) ?? { hasPending: false, hasConfirmed: false, refs: [] }
      if (b.status === 'pending') entry.hasPending = true
      if (b.status === 'confirmed') entry.hasConfirmed = true
      entry.refs.push(b.public_id)
      index.set(b.date, entry)
    }
    return index
  }, [existingBookings])

  // Sidebar: bookings visible in the current month (pending + confirmed only)
  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`
  const sidebarBookings = useMemo(() => existingBookings
    .filter(b => b.date.startsWith(monthPrefix) && (b.status === 'pending' || b.status === 'confirmed'))
    .sort((a, b) => a.date.localeCompare(b.date)), [existingBookings, monthPrefix])

  const tooltipVehicles = tooltip ? (unavailableVehiclesByDate?.get(tooltip.ymd) ?? []) : []

  return (
    <>
      {/* Fixed-position hover tooltip for unavailable vehicles */}
      {tooltip && tooltipVehicles.length > 0 && (
        <div
          className="pointer-events-none"
          style={{
            position: 'fixed',
            left: tooltip.x + 10,
            top: tooltip.y,
            zIndex: 9999,
            maxWidth: 220,
          }}
        >
          <div className="bg-ink text-white rounded-lg shadow-xl px-3 py-2.5">
            <p className="text-[10.5px] font-semibold uppercase tracking-wider text-white/60 mb-1.5">
              Vehicles Unavailable
            </p>
            <ul className="space-y-0.5">
              {tooltipVehicles.map((v, i) => (
                <li key={i} className="flex items-center gap-1.5 text-[12px] font-bold text-red-300">
                  <span className="w-1 h-1 rounded-full bg-red-400 flex-shrink-0" />
                  {v.name}
                </li>
              ))}
            </ul>
          </div>
          {/* Arrow */}
          <div
            className="absolute"
            style={{
              left: -6,
              top: 10,
              width: 0,
              height: 0,
              borderTop: '5px solid transparent',
              borderBottom: '5px solid transparent',
              borderRight: '6px solid #1a1a2e',
            }}
          />
        </div>
      )}

      <div className="bg-white border border-border rounded-xl overflow-hidden">
        <div className="flex flex-col lg:flex-row">
          {/* ── Calendar ──────────────────────────────────────── */}
          <div className="p-5 lg:w-[320px] lg:shrink-0">
            {/* Month nav */}
            <div className="flex items-center justify-between mb-5">
              <button onClick={prev}
                disabled={loadingMonth}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-bg transition-colors text-ink-3 hover:text-ink text-[20px] font-light leading-none disabled:opacity-30 disabled:cursor-not-allowed">
                ‹
              </button>
              <p className="font-display font-bold text-[15px] tracking-tight">
                {MONTH_NAMES[month]} {year}
              </p>
              <button onClick={next}
                disabled={loadingMonth}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-bg transition-colors text-ink-3 hover:text-ink text-[20px] font-light leading-none disabled:opacity-30 disabled:cursor-not-allowed">
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
                const isBlocked = blockedDates?.has(ymd) ?? false
                const hasUnavailable = (unavailableVehiclesByDate?.get(ymd)?.length ?? 0) > 0

                function handleMouseEnter(e: React.MouseEvent) {
                  if (hasUnavailable) {
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                    setTooltip({ ymd, x: rect.right, y: rect.top })
                  }
                }
                function handleMouseLeave() {
                  setTooltip(null)
                }

                if (isBlocked) {
                  return (
                    <div key={ymd} className="relative">
                      <div
                        className="w-full flex flex-col items-center justify-center rounded-lg py-1.5 select-none cursor-not-allowed bg-red-50 border border-red-200"
                        title="This date is unavailable"
                      >
                        <span className="text-[13px] font-medium leading-none text-red-400 line-through">{day.getDate()}</span>
                        <div className="flex items-center gap-0.5 mt-1 h-1.5">
                          <span className="w-1 h-1 rounded-full bg-red-300" />
                        </div>
                      </div>
                    </div>
                  )
                }

                return (
                  <div key={ymd} className="relative"
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                  >
                    <button
                      onClick={() => onDayClick(ymd)}
                      disabled={loadingMonth || monthLoadFailed}
                      className={`w-full flex flex-col items-center justify-center rounded-lg py-1.5 transition-all active:scale-95 select-none
                        ${isToday
                          ? 'bg-accent text-white shadow-sm'
                          : hasUnavailable
                            ? 'bg-orange-50 hover:bg-orange-100 text-ink border border-orange-200'
                            : info
                              ? 'bg-amber-50 hover:bg-accent/10 hover:text-accent text-ink'
                              : isWeekend
                                ? 'text-ink-3 hover:bg-accent/10 hover:text-accent'
                                : 'text-ink hover:bg-accent/10 hover:text-accent'
                        } disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100`}
                    >
                      <span className="text-[13px] font-medium leading-none">{day.getDate()}</span>
                      {/* Dots */}
                      <div className="flex items-center gap-0.5 mt-1 h-1.5">
                        {!isToday && info?.hasPending  && <span className="w-1 h-1 rounded-full bg-amber-400" />}
                        {!isToday && info?.hasConfirmed && <span className="w-1 h-1 rounded-full bg-success" />}
                        {!isToday && hasUnavailable && !info?.hasPending && !info?.hasConfirmed && (
                          <span className="w-1 h-1 rounded-full bg-orange-400" />
                        )}
                      </div>
                    </button>
                  </div>
                )
              })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-border text-[11px] text-ink-4">
              {loadingMonth && <span className="text-accent font-semibold">Loading availability...</span>}
              {monthLoadFailed && (
                <button
                  type="button"
                  onClick={() => loadMonth(year, month)}
                  className="text-red-600 font-semibold hover:underline"
                >
                  Availability unavailable - retry
                </button>
              )}
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" /> Pending</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-success inline-block" /> Confirmed</span>
              {unavailableVehiclesByDate && unavailableVehiclesByDate.size > 0 && (
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-orange-400 inline-block" /> Vehicles unavailable</span>
              )}
              {blockedDates && blockedDates.size > 0 && (
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" /> Booked</span>
              )}
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
    </>
  )
}
