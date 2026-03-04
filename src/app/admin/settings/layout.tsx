import type { Metadata } from 'next'
import SettingsNav from './SettingsNav'

export const metadata: Metadata = { title: 'Settings' }

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-10 py-10">
      <h1 className="font-display font-bold text-[26px] tracking-tight mb-1">Settings</h1>
      <p className="text-[14px] text-ink-3 mb-8">Configure notifications, branding, and other options.</p>
      <div className="flex gap-8 items-start">
        <SettingsNav />
        <div className="flex-1 min-w-0 max-w-[680px]">
          {children}
        </div>
      </div>
    </div>
  )
}
