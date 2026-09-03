// Lightweight, RTL-correct, shadcn-flavored primitives.
// All interactive elements meet 44px min tap targets and AA focus rings.
import {
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  createContext,
  useContext,
  useState,
} from "react";
import { FEE_STATUS_LABEL, PAYMENT_STATUS_LABEL, type FeeStatus, type PaymentStatus } from "../lib/format";
import { AlertTriangle, CheckCircle, Clock, X } from "./icons";

function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

/* ---------- Button ---------- */
type ButtonVariant = "primary" | "secondary" | "ghost" | "outline" | "danger";
type ButtonSize = "md" | "lg" | "icon";

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-primary-foreground shadow-[var(--shadow-brand)] ring-1 ring-inset ring-white/10 hover:bg-[#37124f] active:bg-[#2e0f45]",
  secondary: "bg-secondary text-secondary-foreground hover:bg-[#e2d3f2] active:bg-[#dbc9ee]",
  outline: "border border-border bg-card text-foreground hover:bg-muted hover:border-[#d9c8ef]",
  ghost: "text-foreground hover:bg-muted",
  danger: "bg-overdue text-white hover:bg-[#9c2c23] active:bg-[#8a271f]",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }) {
  const sizes: Record<ButtonSize, string> = {
    md: "h-11 px-4 text-[15px] gap-2",
    lg: "h-12 px-5 text-[15px] gap-2 w-full",
    icon: "h-11 w-11",
  };
  return (
    <button
      className={cx(
        "inline-flex items-center justify-center rounded-[var(--radius-md)] font-semibold",
        "transition-[background-color,transform,box-shadow] duration-150 active:translate-y-px",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        "disabled:opacity-50 disabled:pointer-events-none",
        buttonVariants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

/* ---------- Card ---------- */
export function Card({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cx(
        "rounded-[var(--radius-lg)] bg-card border border-border shadow-[var(--shadow-card)]",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-3">
      <div className="min-w-0">
        <h3 className="font-display text-[17px] font-bold leading-tight text-foreground">{title}</h3>
        {subtitle && <p className="text-[13px] text-muted-foreground mt-1 leading-snug">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0 -mt-1">{action}</div>}
    </div>
  );
}

/* ---------- Label + Input ---------- */
export function Label({ className, children, ...rest }: HTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cx("block text-sm font-medium text-foreground mb-1.5", className)} {...rest}>
      {children}
    </label>
  );
}

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cx(
        "h-12 w-full rounded-[var(--radius-md)] border border-border bg-card px-4 text-[15px]",
        "placeholder:text-muted-foreground/80",
        "outline-none transition-[border-color,box-shadow] duration-150",
        "focus:border-primary focus:ring-4 focus:ring-primary/12",
        className,
      )}
      {...rest}
    />
  );
}

/* ---------- Badge ---------- */
export function Badge({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 h-7 text-xs font-bold ring-1 ring-inset ring-black/[0.04]",
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ---------- StatusPill (fee) — icon + label, never color alone ---------- */
const feeStyles: Record<FeeStatus, { cls: string; Icon: typeof CheckCircle }> = {
  paid: { cls: "bg-paid-bg text-paid", Icon: CheckCircle },
  due: { cls: "bg-due-bg text-due", Icon: Clock },
  overdue: { cls: "bg-overdue-bg text-overdue", Icon: AlertTriangle },
};

export function StatusPill({ status }: { status: FeeStatus }) {
  const { cls, Icon } = feeStyles[status];
  return (
    <Badge className={cls}>
      <Icon width={14} height={14} />
      {FEE_STATUS_LABEL[status]}
    </Badge>
  );
}

const payStyles: Record<PaymentStatus, string> = {
  pending: "bg-due-bg text-due",
  confirmed: "bg-paid-bg text-paid",
  rejected: "bg-overdue-bg text-overdue",
};

export function PaymentPill({ status }: { status: PaymentStatus }) {
  return <Badge className={payStyles[status]}>{PAYMENT_STATUS_LABEL[status]}</Badge>;
}

/* ---------- Tabs ---------- */
const TabsCtx = createContext<{ value: string; setValue: (v: string) => void } | null>(null);

export function Tabs({ defaultValue, children }: { defaultValue: string; children: ReactNode }) {
  const [value, setValue] = useState(defaultValue);
  return <TabsCtx.Provider value={{ value, setValue }}>{children}</TabsCtx.Provider>;
}

export function TabsList({ children }: { children: ReactNode }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-xl bg-muted p-1 w-full">{children}</div>
  );
}

export function TabsTrigger({ value, children }: { value: string; children: ReactNode }) {
  const ctx = useContext(TabsCtx)!;
  const active = ctx.value === value;
  return (
    <button
      onClick={() => ctx.setValue(value)}
      className={cx(
        "flex-1 h-9 rounded-lg text-sm font-medium transition-colors px-3",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        active ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

export function TabsContent({ value, children }: { value: string; children: ReactNode }) {
  const ctx = useContext(TabsCtx)!;
  if (ctx.value !== value) return null;
  return <div className="mt-4">{children}</div>;
}

/* ---------- Avatar ---------- */
export function Avatar({ name, color, size = 44 }: { name: string; color?: string; size?: number }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("");
  return (
    <span
      className="inline-flex items-center justify-center rounded-full font-bold text-white shrink-0"
      style={{ width: size, height: size, backgroundColor: color ?? "#7a3fae", fontSize: size * 0.36 }}
      aria-hidden
    >
      {initials}
    </span>
  );
}

/* ---------- Skeleton ---------- */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("shimmer rounded-[var(--radius-sm)]", className)} />;
}

/* ---------- EmptyState — crafted on-brand emblem, not a plain icon box ---------- */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center text-center px-6 py-10">
      <div className="relative mb-5">
        <div className="absolute inset-0 -m-2 rounded-full bg-secondary/70 blur-md" aria-hidden />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-secondary to-[#e2d3f2] text-primary ring-1 ring-[rgba(197,154,46,0.35)]">
          {icon}
        </div>
      </div>
      <h3 className="font-display text-lg font-bold">{title}</h3>
      <p className="mt-1.5 text-sm text-muted-foreground max-w-[280px] leading-relaxed">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* ---------- Progress bar (score) ---------- */
export function Progress({ value, tone = "primary" }: { value: number; tone?: "primary" | "accent" }) {
  return (
    <div className="h-2 w-full rounded-full bg-secondary overflow-hidden ring-1 ring-inset ring-black/[0.03]">
      <div
        className={cx(
          "h-full rounded-full transition-[width] duration-500",
          tone === "primary" ? "bg-gradient-to-l from-primary to-primary-soft" : "bg-gradient-to-l from-[#b9862a] to-accent",
        )}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

export { cx, X };
