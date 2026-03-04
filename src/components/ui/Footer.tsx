import Link from 'next/link'
import { getSiteName } from '@/lib/site'

export default async function Footer() {
  const year = new Date().getFullYear()
  const siteName = await getSiteName()
  return (
    <footer className="bg-ink text-white/50 px-4 sm:px-6 md:px-10 py-8 flex items-center justify-between flex-wrap gap-4 text-[13px]">
      <span className="font-display font-extrabold text-base text-white">{siteName}</span>
      <div className="flex gap-6">
        <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
        <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
        <Link href="/#contact" className="hover:text-white transition-colors">Contact</Link>
      </div>
      <span>© {year} {siteName}</span>
    </footer>
  )
}
