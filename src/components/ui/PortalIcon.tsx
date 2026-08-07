import type { SVGProps } from 'react'

export type PortalIconName =
  | 'layout-dashboard'
  | 'clipboard-list'
  | 'calendar-days'
  | 'calendar-off'
  | 'car-front'
  | 'users'
  | 'building-2'
  | 'steering-wheel'
  | 'receipt-text'
  | 'chart'
  | 'settings-2'
  | 'life-buoy'
  | 'log-out'
  | 'chevron-down'
  | 'chevron-right'
  | 'menu'
  | 'x'
  | 'message-square-warning'
  | 'circle-help'
  | 'plus'
  | 'arrow-up-right'
  | 'arrow-up'
  | 'arrow-down'
  | 'chevrons-up-down'

const paths: Record<PortalIconName, React.ReactNode> = {
  'layout-dashboard': <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="4" rx="1" /><rect x="14" y="10" width="7" height="11" rx="1" /><rect x="3" y="13" width="7" height="8" rx="1" /></>,
  'clipboard-list': <><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4V3h6v1M9 9h6M9 13h6M9 17h3" /></>,
  'calendar-days': <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" /></>,
  'calendar-off': <><path d="M3 10h14M8 3v4M16 3v2M3 14v5a2 2 0 0 0 2 2h11M21 14V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2" /><path d="m3 3 18 18" /></>,
  'car-front': <><path d="m5 17-1 3M19 17l1 3M4 15v-4l2.5-5h11l2.5 5v4M4 15h16M7 15h.01M17 15h.01M7 10h10" /></>,
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
  'building-2': <><path d="M3 21h18M6 21V5l6-3 6 3v16M9 8h1M14 8h1M9 12h1M14 12h1M9 16h1M14 16h1" /></>,
  'steering-wheel': <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="2" /><path d="M12 3v7M3.5 10.5 10 12M20.5 10.5 14 12M12 14v7" /></>,
  'receipt-text': <><path d="M4 3h16v18l-3-2-3 2-3-2-3 2-4-2V3Z" /><path d="M8 8h8M8 12h8M8 16h4" /></>,
  chart: <><path d="M4 19V5M4 19h17" /><path d="m7 15 4-4 3 2 5-6" /></>,
  'settings-2': <><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3" /><path d="M1 14h6M9 8h6M17 16h6" /></>,
  'life-buoy': <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3" /><path d="m5.64 5.64 4.24 4.24M14.12 14.12l4.24 4.24M18.36 5.64l-4.24 4.24M9.88 14.12l-4.24 4.24" /></>,
  'log-out': <><path d="M10 17l5-5-5-5M15 12H3M21 19V5a2 2 0 0 0-2-2h-5" /></>,
  'chevron-down': <path d="m6 9 6 6 6-6" />,
  'chevron-right': <path d="m9 18 6-6-6-6" />,
  menu: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
  x: <><path d="M6 6l12 12M18 6 6 18" /></>,
  'message-square-warning': <><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z" /><path d="M12 7v4M12 14h.01" /></>,
  'circle-help': <><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 1 1 4.34 1.7c-.96.95-1.84 1.35-1.84 2.8M12 17h.01" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  'arrow-up-right': <><path d="M7 17 17 7M7 7h10v10" /></>,
  'arrow-up': <><path d="m5 12 7-7 7 7M12 19V5" /></>,
  'arrow-down': <><path d="m19 12-7 7-7-7M12 5v14" /></>,
  'chevrons-up-down': <><path d="m7 15 5 5 5-5M7 9l5-5 5 5" /></>,
}

export default function PortalIcon({ name, size = 17, strokeWidth = 1.8, ...props }: { name: PortalIconName; size?: number; strokeWidth?: number } & Omit<SVGProps<SVGSVGElement>, 'name'>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={props['aria-label'] ? undefined : true}
      {...props}
    >
      {paths[name]}
    </svg>
  )
}
