import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Settings' }

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-4 sm:px-10 py-8 md:py-10 max-w-[780px]">
      <h1 className="font-display font-bold text-[26px] tracking-tight mb-1">Settings</h1>
      <p className="text-[14px] text-ink-3 mb-8">Configure notifications, branding, and other options.</p>
      {children}
    </div>
  )
}
