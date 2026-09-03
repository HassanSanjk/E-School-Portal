// In-app RTL navigation chrome: brand band + top app bar, mobile bottom tab bar,
// admin sidebar. Dark chrome uses the poster-derived purple gradient with the logo.
import type { ReactNode } from "react";
import { cx } from "./ui";
import { Logo } from "./brand";
import { Bell, ChevronEnd } from "./icons";

export interface NavItem {
  key: string;
  label: string;
  icon: (p: { width?: number; height?: number }) => ReactNode;
}

/** Simple gradient app bar with logo — for detail/secondary screens. */
export function AppBar({
  title,
  subtitle,
  onBack,
  trailing,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  trailing?: ReactNode;
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
        {trailing ?? (
          <button aria-label="الإشعارات" className="relative h-11 w-11 inline-flex items-center justify-center rounded-xl hover:bg-white/10">
            <Bell width={22} height={22} />
            <span className="absolute top-2.5 end-2.5 h-2 w-2 rounded-full bg-accent ring-2 ring-[#2b0a46]" />
          </button>
        )}
      </div>
      <div className="gold-rule opacity-70" />
    </header>
  );
}

/** Rich greeting band for dashboards: logo, greeting, date, avatar on brand ground. */
export function BrandBand({
  greeting,
  meta,
  trailing,
}: {
  greeting: string;
  meta?: string;
  trailing?: ReactNode;
}) {
  return (
    <header className="brand-gradient grain text-primary-foreground">
      <div className="relative z-10 px-4 pt-4 pb-5">
        <div className="flex items-center gap-3">
          <Logo size={40} />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-white/65">مدرسة ابن الجراح · الثانوية الخاصة بنات</p>
          </div>
          <button aria-label="الإشعارات" className="relative h-11 w-11 inline-flex items-center justify-center rounded-xl hover:bg-white/10">
            <Bell width={22} height={22} />
            <span className="absolute top-2.5 end-2.5 h-2 w-2 rounded-full bg-accent ring-2 ring-[#2b0a46]" />
          </button>
        </div>
        <div className="mt-4 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-display text-[26px] font-extrabold leading-tight truncate">{greeting}</h1>
            {meta && <p className="text-[13px] text-white/75 mt-1">{meta}</p>}
          </div>
          {trailing}
        </div>
      </div>
      <div className="gold-rule opacity-70" />
    </header>
  );
}

export function BottomNav({
  items,
  active,
  onChange,
}: {
  items: NavItem[];
  active: string;
  onChange: (k: string) => void;
}) {
  return (
    <nav className="sticky bottom-0 z-20 border-t border-border bg-card/95 backdrop-blur-md">
      <ul className="flex items-stretch px-1">
        {items.map((it) => {
          const on = it.key === active;
          const Icon = it.icon;
          return (
            <li key={it.key} className="flex-1">
              <button
                onClick={() => onChange(it.key)}
                className={cx(
                  "w-full h-16 flex flex-col items-center justify-center gap-1 text-[11px] font-semibold",
                  "focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring",
                  on ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
                aria-current={on ? "page" : undefined}
              >
                <span
                  className={cx(
                    "flex h-8 w-14 items-center justify-center rounded-full transition-all",
                    on ? "bg-secondary ring-1 ring-[rgba(197,154,46,0.35)]" : "",
                  )}
                >
                  <Icon width={22} height={22} />
                </span>
                {it.label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function Sidebar({
  items,
  active,
  onChange,
}: {
  items: NavItem[];
  active: string;
  onChange: (k: string) => void;
}) {
  return (
    <aside className="w-64 shrink-0 brand-gradient grain text-primary-foreground flex flex-col">
      <div className="relative z-10 px-5 h-20 flex items-center gap-3 border-b border-white/10">
        <Logo size={40} />
        <div>
          <p className="font-display font-extrabold leading-tight">مدرسة ابن الجراح</p>
          <p className="text-xs text-white/65">لوحة الإدارة</p>
        </div>
      </div>
      <nav className="relative z-10 flex-1 p-3 space-y-1 overflow-y-auto">
        {items.map((it) => {
          const on = it.key === active;
          const Icon = it.icon;
          return (
            <button
              key={it.key}
              onClick={() => onChange(it.key)}
              className={cx(
                "relative w-full h-11 rounded-xl px-3 flex items-center gap-3 text-sm font-semibold transition-colors",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                on ? "bg-white/12 text-white" : "text-white/70 hover:bg-white/8 hover:text-white",
              )}
              aria-current={on ? "page" : undefined}
            >
              {on && <span className="absolute inset-y-2 end-0 w-1 rounded-full bg-accent" />}
              <Icon width={20} height={20} />
              {it.label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
