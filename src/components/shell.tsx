import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router'
import { cn } from '@/lib/utils'
import { SCHOOL_NAME_FULL } from '@/lib/constants'
import { Logo } from './brand'
import { ChevronEnd } from './icons'

export interface NavItem {
  key: string
  label: string
  icon: (p: { width?: number; height?: number; className?: string }) => ReactNode
  to: string
  /** false for a tab whose screen hasn't been built yet (Stage D lands one
   * route at a time) — rendered visibly, so the eventual shape of the app
   * is clear, but disabled rather than linking to a route that 404s. */
  enabled: boolean
}

/** Simple app-bar header with a back button — for any screen that isn't
 * the dashboard itself. Reference: reusable_design_export.zip's
 * keep-as-is/shell.tsx, adapted to this repo's cn() and icon set. */
export function AppBar({
  title,
  subtitle,
  onBack,
  trailing,
}: {
  title: string
  subtitle?: string
  onBack?: () => void
  trailing?: ReactNode
}) {
  return (
    <header className="sticky top-0 z-20 brand-gradient grain text-primary-foreground">
      <div className="relative z-10 flex items-center gap-3 px-4 h-16">
        {onBack ? (
          <button
            onClick={onBack}
            aria-label="رجوع"
            className="h-11 w-11 -me-2 inline-flex items-center justify-center rounded-xl hover:bg-white/10"
          >
            <ChevronEnd width={22} height={22} className="scale-x-[-1]" />
          </button>
        ) : (
          <Logo size={34} />
        )}
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-lg font-bold leading-tight truncate">{title}</h1>
          {subtitle && <p className="text-xs text-white/70 truncate mt-0.5">{subtitle}</p>}
        </div>
        {trailing}
      </div>
      <div className="gold-rule opacity-70" />
    </header>
  )
}

/** Rich branded header for portal dashboards: logo, greeting, meta line,
 * optional trailing content (e.g. an avatar + sign-out button). Relies on
 * the `.brand-gradient` / `.grain` / `.gold-rule` utility classes already
 * defined in index.css (carried over as-is from the design export). */
export function BrandBand({
  greeting,
  meta,
  trailing,
}: {
  greeting: string
  meta?: string
  trailing?: ReactNode
}) {
  return (
    <header className="brand-gradient grain text-primary-foreground">
      <div className="relative z-10 px-4 pt-4 pb-5">
        <div className="flex items-center gap-3">
          <Logo size={36} />
          <p className="flex-1 min-w-0 text-xs text-white/65 truncate">
            {SCHOOL_NAME_FULL}
          </p>
        </div>
        <div className="mt-4 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-display text-[26px] font-extrabold leading-tight truncate">
              {greeting}
            </h1>
            {meta && <p className="text-[13px] text-white/75 mt-1">{meta}</p>}
          </div>
          {trailing}
        </div>
      </div>
      <div className="gold-rule opacity-70" />
    </header>
  )
}

/** Fixed bottom tab bar (not just `sticky`, so it stays visible while a
 * long page scrolls under it) — pages using this need bottom padding on
 * their scrollable content equal to its height so the last card isn't
 * hidden behind it. Real routes render as real Links; not-yet-built
 * screens render as visibly-present but disabled buttons rather than
 * dead links to a route that doesn't exist. */
export function BottomNav({ items }: { items: NavItem[] }) {
  const location = useLocation()
  return (
    <nav className="fixed bottom-0 inset-x-0 z-20 border-t border-border bg-card/95 backdrop-blur-md">
      <ul className="flex items-stretch px-1">
        {items.map((item) => {
          const active = location.pathname === item.to
          const Icon = item.icon
          const iconWrap = (
            <span
              className={cn(
                'flex h-8 w-14 items-center justify-center rounded-full transition-all',
                active ? 'bg-secondary ring-1 ring-[rgba(197,154,46,0.35)]' : '',
              )}
            >
              <Icon width={22} height={22} />
            </span>
          )
          return (
            <li key={item.key} className="flex-1">
              {item.enabled ? (
                <Link
                  to={item.to}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'w-full h-16 flex flex-col items-center justify-center gap-1 text-[11px] font-semibold',
                    'focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring',
                    active ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {iconWrap}
                  {item.label}
                </Link>
              ) : (
                <button
                  type="button"
                  disabled
                  aria-disabled="true"
                  title="قريبًا"
                  className="w-full h-16 flex flex-col items-center justify-center gap-1 text-[11px] font-semibold text-muted-foreground/40 cursor-not-allowed"
                >
                  {iconWrap}
                  {item.label}
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
