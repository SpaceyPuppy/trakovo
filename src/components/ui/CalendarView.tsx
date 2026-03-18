'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export interface CalendarEvent {
  id: string
  title: string
  subtitle?: string  // shown in tooltip only — callers control whether this is PII-safe
  start: string      // YYYY-MM-DD
  end: string        // YYYY-MM-DD
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'blockout'
  href?: string      // omit for blockouts
}

interface PlacedEvent {
  event: CalendarEvent
  startCol: number   // 0–6 within this week row
  span: number       // columns occupied in this week row
  lane: number
  continues: boolean // event extends past end of week
  continued: boolean // event started before this week
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DOW = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
const MAX_VISIBLE_LANES = 3

const EVENT_BAR: Record<string, string> = {
  pending:   'bg-amber-400 text-amber-950 hover:bg-amber-500',
  confirmed: 'bg-accent text-white hover:opacity-90',
  completed: 'bg-green-500 text-white hover:bg-green-600',
  cancelled: 'bg-gray-200 text-gray-400 hover:bg-gray-300',
  blockout:  'bg-slate-200 text-slate-500 cursor-default select-none',
}

function toYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function parseYMD(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// Returns 6 (at most) week arrays, each with 7 Date objects. Weeks start Monday.
function getCalendarWeeks(year: number, month: number): Date[][] {
  const firstOfMonth = new Date(year, month, 1)
  const lastOfMonth = new Date(year, month + 1, 0)
  const start = new Date(firstOfMonth)
  const dow = start.getDay() // 0=Sun
  start.setDate(start.getDate() - (dow === 0 ? 6 : dow - 1))

  const weeks: Date[][] = []
  const cur = new Date(start)
  while (cur <= lastOfMonth || weeks.length < 4) {
    const week: Date[] = []
    for (let i = 0; i < 7; i++) {
      week.push(new Date(cur))
      cur.setDate(cur.getDate() + 1)
    }
    weeks.push(week)
    if (cur > lastOfMonth && weeks.length >= 5) break
  }
  return weeks
}

function placeEventsInWeek(week: Date[], events: CalendarEvent[]): PlacedEvent[] {
  const ws = toYMD(week[0])
  const we = toYMD(week[6])

  const relevant = events
    .filter(e => e.start <= we && e.end >= ws)
    .sort((a, b) => {
      if (a.start !== b.start) return a.start < b.start ? -1 : 1
      // Longer events first (stay in lower lanes)
      const aLen = parseYMD(a.end).getTime() - parseYMD(a.start).getTime()
      const bLen = parseYMD(b.end).getTime() - parseYMD(b.start).getTime()
      return bLen - aLen
    })

  const laneEnd: number[] = [] // last endCol used per lane
  const placed: PlacedEvent[] = []

  for (const event of relevant) {
    const effStart = event.start < ws ? parseYMD(ws) : parseYMD(event.start)
    const effEnd   = event.end   > we ? parseYMD(we) : parseYMD(event.end)

    const startCol = week.findIndex(d => toYMD(d) === toYMD(effStart))
    const endCol   = week.findIndex(d => toYMD(d) === toYMD(effEnd))
    if (startCol < 0 || endCol < 0) continue

    // First lane where the last placed event ends before startCol
    let lane = 0
    while (lane < laneEnd.length && (laneEnd[lane] ?? -1) >= startCol) lane++
    laneEnd[lane] = endCol

    placed.push({
      event,
      startCol,
      span: endCol - startCol + 1,
      lane,
      continues: event.end > we,
      continued: event.start < ws,
    })
  }
  return placed
}

export default function CalendarView({ events }: { events: CalendarEvent[] }) {
  const today = new Date()
  const [year, setYear]   = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const todayYMD = toYMD(today)

  const weeks = useMemo(() => getCalendarWeeks(year, month), [year, month])

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  return (
    <div className="bg-white border border-border rounded-xl overflow-hidden">

      {/* Month navigator */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
        <button
          onClick={prevMonth}
          className="w-8 h-8 flex items-center justify-center rounded-[6px] text-ink-3 hover:bg-bg hover:text-ink transition-all text-[18px]"
          aria-label="Previous month"
        >‹</button>
        <h2 className="font-display font-bold text-[15px]">{MONTHS[month]} {year}</h2>
        <button
          onClick={nextMonth}
          className="w-8 h-8 flex items-center justify-center rounded-[6px] text-ink-3 hover:bg-bg hover:text-ink transition-all text-[18px]"
          aria-label="Next month"
        >›</button>
      </div>

      {/* Day-of-week header */}
      <div className="grid grid-cols-7 border-b border-border bg-bg">
        {DOW.map(d => (
          <div key={d} className="py-2 text-center text-[11px] font-semibold text-ink-4 uppercase tracking-wider">
            {d}
          </div>
        ))}
      </div>

      {/* Week rows */}
      <div>
        {weeks.map((week, wi) => {
          const placed = placeEventsInWeek(week, events)
          const maxLane = placed.length > 0 ? Math.max(...placed.map(p => p.lane)) : -1
          const visibleLanes = Math.min(maxLane + 1, MAX_VISIBLE_LANES)
          const hasOverflow = maxLane >= MAX_VISIBLE_LANES

          return (
            <div key={wi} className="border-b border-border last:border-b-0">

              {/* Day number row */}
              <div className="grid grid-cols-7">
                {week.map(day => {
                  const ymd = toYMD(day)
                  const isToday = ymd === todayYMD
                  const inMonth = day.getMonth() === month
                  return (
                    <div key={ymd} className="h-8 flex items-start justify-end pr-2 pt-1.5">
                      <span className={cn(
                        'text-[12px] font-medium w-6 h-6 flex items-center justify-center rounded-full',
                        isToday
                          ? 'bg-accent text-white'
                          : inMonth ? 'text-ink' : 'text-ink-4'
                      )}>
                        {day.getDate()}
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* Event lanes */}
              {visibleLanes > 0 && (
                <div className="pb-1 space-y-0.5">
                  {Array.from({ length: visibleLanes }, (_, lane) => {
                    const laneEvents = placed.filter(p => p.lane === lane)
                    return (
                      <div key={lane} className="grid grid-cols-7 h-5">
                        {laneEvents.map(pe => {
                          const barClass = cn(
                            'h-5 flex items-center px-1.5 text-[11px] font-medium truncate',
                            EVENT_BAR[pe.event.status],
                            pe.continued ? 'rounded-l-none' : 'rounded-l-[3px] ml-0.5',
                            pe.continues  ? 'rounded-r-none' : 'rounded-r-[3px] mr-0.5',
                          )
                          const title = pe.event.subtitle
                            ? `${pe.event.title} · ${pe.event.subtitle}`
                            : pe.event.title
                          const content = !pe.continued && pe.event.title
                          return pe.event.href ? (
                            <Link
                              key={pe.event.id}
                              href={pe.event.href}
                              title={title}
                              style={{ gridColumn: `${pe.startCol + 1} / span ${pe.span}` }}
                              className={cn(barClass, 'transition-opacity')}
                            >
                              {content}
                            </Link>
                          ) : (
                            <div
                              key={pe.event.id}
                              title={title}
                              style={{ gridColumn: `${pe.startCol + 1} / span ${pe.span}` }}
                              className={barClass}
                            >
                              {content}
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Overflow indicator per day */}
              {hasOverflow && (
                <div className="grid grid-cols-7 pb-1">
                  {week.map(day => {
                    const ymd = toYMD(day)
                    const count = placed.filter(p =>
                      p.lane >= MAX_VISIBLE_LANES &&
                      p.event.start <= ymd &&
                      p.event.end >= ymd
                    ).length
                    return (
                      <div key={ymd} className="h-4 flex items-center justify-center">
                        {count > 0 && (
                          <span className="text-[10px] text-ink-4 font-medium">+{count}</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Bottom padding when no events */}
              {visibleLanes === 0 && !hasOverflow && <div className="h-2" />}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-5 py-3 border-t border-border bg-bg flex-wrap">
        {(['pending','confirmed','completed','cancelled','blockout'] as const).map(s => (
          <div key={s} className="flex items-center gap-1.5">
            <span className={cn('w-3 h-3 rounded-[2px]', EVENT_BAR[s].split(' ')[0])} />
            <span className="text-[11px] text-ink-3 capitalize">{s === 'blockout' ? 'blocked' : s}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
