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
const DAY_NAMES = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

function toYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function getCalendarDays(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1)
  const last  = new Date(year, month + 1, 0)
  let dow = first.getDay() // 0=Sun
  dow = dow === 0 ? 6 : dow - 1 // convert to Mon-based (Mon=0)
  const days: (Date | null)[] = Array(dow).fill(null)
  for (let d = 1; d <= last.getDate(); d++) days.push(new Date(year, month, d))
  while (days.length % 7 !== 0) days.push(null)
  return days
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

  // Index existing bookings by date for dot rendering
  const byDate = new Map<string, { hasPending: boolean; hasConfirmed: boolean; refs: string[] }>()
  for (const b of existingBookings) {
    const entry = byDate.get(b.date) ?? { hasPending: false, hasConfirmed: false, refs: [] }
    if (b.status === 'pending') entry.hasPending = true
    if (b.status === 'confirmed') entry.hasConfirmed = true
    entry.refs.push(b.public_id)
    byDate.set(b.date, entry)
  }

  return (
    <div className="bg-white border border-border rounded-xl p-5 select-none">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={prev}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-bg transition-colors text-ink-3 hover:text-ink text-[18px] font-light">
          ‹
        </button>
        <p className="font-display font-bold text-[15px]">{MONTH_NAMES[month]} {year}</p>
        <button onClick={next}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-bg transition-colors text-ink-3 hover:text-ink text-[18px] font-light">
          ›
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_NAMES.map(d => (
          <div key={d} className="text-center text-[11px] font-semibold text-ink-4 py-1">{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {days.map((day, i) => {
          if (!day) return <div key={`e${i}`} className="h-12" />
          const ymd = toYMD(day)
          const isToday = ymd === todayYMD
          const info = byDate.get(ymd)
          const tooltip = info?.refs.join(' · ')

          return (
            <div key={ymd} className="flex flex-col items-center py-0.5" title={tooltip}>
              <button
                onClick={() => onDayClick(ymd)}
                className={`w-9 h-9 rounded-full text-[13px] transition-all hover:bg-accent/10 hover:text-accent active:scale-90 active:bg-accent/20
                  ${isToday
                    ? 'ring-2 ring-accent font-bold text-accent'
                    : 'font-medium text-ink'
                  }`}
              >
                {day.getDate()}
              </button>
              {/* Status dots */}
              <div className="h-2 flex items-center gap-0.5">
                {info?.hasPending  && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                {info?.hasConfirmed && <span className="w-1.5 h-1.5 rounded-full bg-success" />}
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border text-[11.5px] text-ink-3">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Pending
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-success inline-block" /> Confirmed
        </span>
        <span className="ml-auto text-ink-4">Click a day to add a booking</span>
      </div>
    </div>
  )
}
