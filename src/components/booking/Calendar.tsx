'use client'
import { useState } from 'react'
import { cn, isDateInRanges } from '@/lib/utils'

interface Props {
  startDate: Date | null
  endDate: Date | null
  bookedRanges: Array<{ start: string; end: string }>
  onChange: (start: Date | null, end: Date | null) => void
}

export default function Calendar({ startDate, endDate, bookedRanges, onChange }: Props) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date(); d.setDate(1); return d
  })

  const year = calMonth.getFullYear()
  const month = calMonth.getMonth()
  const monthLabel = calMonth.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  function handleDayClick(date: Date) {
    if (!startDate || (startDate && endDate)) {
      onChange(date, null)
    } else {
      if (date < startDate) onChange(date, startDate)
      else if (date.getTime() === startDate.getTime()) onChange(date, date)
      else onChange(startDate, date)
    }
  }

  const hint = !startDate ? 'Click a start date'
    : !endDate ? 'Now select an end date'
    : null

  return (
    <div>
      <p className="text-[11.5px] font-semibold text-ink-3 uppercase tracking-wider mb-2.5">Select Hire Period</p>

      {/* Month nav */}
      <div className="flex items-center justify-between mb-2.5">
        <button onClick={() => setCalMonth(new Date(year, month - 1, 1))}
          className="w-[26px] h-[26px] border border-border rounded-[6px] flex items-center justify-center text-[11px] text-ink-3 hover:border-ink hover:text-ink hover:bg-bg transition-all">‹</button>
        <span className="font-display font-bold text-[15px]">{monthLabel}</span>
        <button onClick={() => setCalMonth(new Date(year, month + 1, 1))}
          className="w-[26px] h-[26px] border border-border rounded-[6px] flex items-center justify-center text-[11px] text-ink-3 hover:border-ink hover:text-ink hover:bg-bg transition-all">›</button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
          <span key={d} className="text-center text-[10px] font-bold uppercase tracking-wider text-ink-4 py-1">{d}</span>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-px">
        {Array.from({ length: firstDay }).map((_, i) => <div key={`blank-${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const d = i + 1
          const date = new Date(year, month, d); date.setHours(0, 0, 0, 0)
          const isPast = date < today
          const isBooked = isDateInRanges(date, bookedRanges)
          const isStart = startDate && date.getTime() === startDate.getTime()
          const isEnd = endDate && date.getTime() === endDate.getTime()
          const inRange = startDate && endDate && date > startDate && date < endDate
          const isToday = date.getTime() === today.getTime()
          const isSingleDay = isStart && isEnd
          const disabled = isPast

          return (
            <button
              key={d}
              disabled={disabled}
              onClick={() => handleDayClick(date)}
              title={isBooked ? 'These dates are booked — you can still select to submit a waitlist enquiry' : undefined}
              className={cn(
                'aspect-square flex items-center justify-center text-[12px] rounded-[5px] relative transition-all',
                disabled && 'text-ink-4 cursor-not-allowed font-light opacity-40',
                isBooked && !disabled && !isStart && !isEnd && 'line-through text-amber-600 bg-amber-50 hover:bg-amber-100',
                !disabled && !isBooked && !isStart && !isEnd && !inRange && 'hover:bg-bg',
                (isStart || isEnd) && 'bg-ink text-white font-bold',
                inRange && 'bg-[#e8e6e2] text-ink rounded-none',
                isBooked && inRange && 'bg-amber-100 text-amber-700 line-through',
                isStart && !isSingleDay && 'cal-range-start',
                isEnd && !isSingleDay && 'cal-range-end',
                isSingleDay && 'cal-range-single',
              )}
            >
              {d}
              {isToday && !isStart && !isEnd && (
                <span className="absolute bottom-[2px] left-1/2 -translate-x-1/2 w-[3px] h-[3px] rounded-full bg-accent" />
              )}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex gap-3 mt-2 pt-2 border-t border-border flex-wrap">
        {[
          ['bg-ink', 'Selected'],
          ['bg-[#e8e6e2]', 'In range'],
          ['bg-amber-100 border border-amber-300', 'Booked'],
        ].map(([bg, label]) => (
          <div key={label} className="flex items-center gap-1 text-[10.5px] text-ink-4">
            <span className={`w-2 h-2 rounded-sm ${bg}`} />
            {label}
          </div>
        ))}
      </div>

      {hint && <p className="text-center text-[12px] text-ink-3 italic mt-1.5">{hint}</p>}
    </div>
  )
}
