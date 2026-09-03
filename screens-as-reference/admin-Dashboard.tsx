import { AppBar, BottomNav, Sidebar } from "../../components/shell";
import { Card, CardHeader, Button, StatusPill, Skeleton, EmptyState, cx } from "../../components/ui";
import {
  Home, Upload, Bell, Users, Calendar, Wallet, FileText, Key, ChartBar, AlertTriangle, ChevronEnd, Copy, GraduationCap, Check, X,
} from "../../components/icons";
import { currency, num, shortDate, daysUntil } from "../../lib/format";
import { adminOverview, feesDueSoon, paymentQueue, SCHOOL_SHORT, ACADEMIC_YEAR } from "../../lib/mock";
import type { ScreenState } from "../types";

const nav = [
  { key: "home", label: "لوحة التحكم", icon: Home },
  { key: "dues", label: "الرسوم المستحقة", icon: AlertTriangle },
  { key: "reviews", label: "مراجعة المدفوعات", icon: Bell },
  { key: "import", label: "استيراد Excel", icon: Upload },
  { key: "students", label: "الطالبات", icon: Users },
  { key: "teachers", label: "المعلمون", icon: GraduationCap },
  { key: "timetable", label: "الجداول", icon: Calendar },
  { key: "salary", label: "الرواتب", icon: Wallet },
  { key: "subjects", label: "المواد والمذكّرات", icon: FileText },
  { key: "pin", label: "إعادة الرمز السري", icon: Key },
];

const mobileNav = [nav[0], nav[1], nav[2], nav[4]];

export default function AdminDashboard({ state, variant = "mobile" }: { state: ScreenState; variant?: "mobile" | "desktop" }) {
  if (variant === "desktop") return <AdminDesktop state={state} />;
  return <AdminMobile state={state} />;
}

/* ---------------- shared body pieces ---------------- */

function StatCards({ compact }: { compact?: boolean }) {
  const items = [
    { label: "رسوم مستحقة قريبًا", value: num(adminOverview.duesSoon), tone: "due", Icon: AlertTriangle },
    { label: "مدفوعات بانتظار المراجعة", value: num(adminOverview.pendingReviews), tone: "primary", Icon: Bell },
    { label: "إجمالي الطالبات", value: num(adminOverview.totalStudents), tone: "primary", Icon: Users },
    { label: "المُحصّل هذا الشهر", value: currency(adminOverview.collectedThisMonth), tone: "paid", Icon: Wallet },
  ] as const;
  return (
    <div className={cx("grid gap-3", compact ? "grid-cols-2" : "grid-cols-4")}>
      {items.map((s) => (
        <Card key={s.label} className="p-4 relative overflow-hidden">
          <div className={cx(
            "mb-3 flex h-10 w-10 items-center justify-center rounded-[var(--radius-sm)]",
            s.tone === "due" && "bg-due-bg text-due",
            s.tone === "paid" && "bg-paid-bg text-paid",
            s.tone === "primary" && "bg-secondary text-primary-soft",
          )}>
            <s.Icon width={20} height={20} />
          </div>
          <p className="font-display text-[26px] font-extrabold leading-none" data-num>{s.value}</p>
          <p className="mt-1.5 text-[13px] text-muted-foreground leading-snug">{s.label}</p>
        </Card>
      ))}
    </div>
  );
}

function DuesList() {
  return (
    <ul className="divide-y divide-hairline">
      {feesDueSoon.map((r) => {
        const days = daysUntil(r.due);
        return (
          <li key={r.studentName + r.feeLabel} className="flex items-center gap-3 px-4 py-3">
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{r.studentName}</p>
              <p className="text-sm text-muted-foreground">{r.grade} · {r.feeLabel} · {currency(r.amount)}</p>
            </div>
            <div className="text-end shrink-0">
              <StatusPill status={r.status} />
              <p className="mt-1 text-xs text-muted-foreground">
                {days < 0 ? `متأخرة ${num(Math.abs(days))} يومًا` : `خلال ${num(days)} أيام`}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function DuesTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-start text-muted-foreground border-b border-border">
            <Th>الطالبة</Th><Th>الصف</Th><Th>القسط</Th><Th>المبلغ</Th><Th>الاستحقاق</Th><Th>الحالة</Th>
          </tr>
        </thead>
        <tbody>
          {feesDueSoon.map((r) => (
            <tr key={r.studentName + r.feeLabel} className="border-b border-border/70 hover:bg-muted/50">
              <Td className="font-semibold">{r.studentName}</Td>
              <Td className="text-muted-foreground">{r.grade}</Td>
              <Td>{r.feeLabel}</Td>
              <Td className="tabular-nums">{currency(r.amount)}</Td>
              <Td className="tabular-nums">{shortDate(r.due)}</Td>
              <Td><StatusPill status={r.status} /></Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
const Th = ({ children }: { children: import("react").ReactNode }) => <th className="px-4 py-3 font-semibold text-start">{children}</th>;
const Td = ({ children, className }: { children: import("react").ReactNode; className?: string }) => <td className={cx("px-4 py-3 text-start", className)}>{children}</td>;

function ReviewsPreview() {
  return (
    <ul className="divide-y divide-hairline">
      {paymentQueue.slice(0, 3).map((p) => (
        <li key={p.id} className="flex items-center gap-3 px-4 py-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-primary-soft shrink-0">
            <FileText width={20} height={20} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{p.studentName}</p>
            <p className="text-sm text-muted-foreground">{p.feeLabel} · {currency(p.amount)}</p>
          </div>
          <div className="flex gap-2">
            <Button size="icon" variant="outline" aria-label="رفض" className="text-overdue"><X width={18} height={18} /></Button>
            <Button size="icon" aria-label="قبول"><Check width={18} height={18} /></Button>
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ---------------- mobile ---------------- */

function AdminMobile({ state }: { state: ScreenState }) {
  return (
    <div className="min-h-full flex flex-col bg-background">
      <AppBar title="الإدارة" subtitle={`${SCHOOL_SHORT} · ${ACADEMIC_YEAR}`} />
      <main className="flex-1 overflow-y-auto p-4 space-y-4 pb-6">
        {state === "loading" ? (
          <>
            <div className="grid grid-cols-2 gap-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-[var(--radius-lg)]" />)}</div>
            <Skeleton className="h-56 rounded-[var(--radius-lg)]" />
          </>
        ) : state === "empty" ? (
          <>
            <StatCards compact />
            <Card>
              <CardHeader title="الرسوم المستحقة قريبًا" />
              <EmptyState icon={<ChartBar width={28} height={28} />} title="لا توجد رسوم مستحقة" description="جميع الطالبات مسددات حتى الآن. ستظهر هنا أي رسوم تقترب من موعد استحقاقها." />
            </Card>
          </>
        ) : (
          <>
            <StatCards compact />
            <Card>
              <CardHeader title="الرسوم المستحقة قريبًا" action={<Button variant="ghost" className="h-9 px-2 text-sm text-primary gap-1"><Copy width={16} height={16} />نسخ التذكير</Button>} />
              <DuesList />
            </Card>
            <Card>
              <CardHeader title="مدفوعات بانتظار المراجعة" action={<Button variant="ghost" className="h-9 px-2 text-sm text-primary">الكل <ChevronEnd width={16} height={16} /></Button>} />
              <ReviewsPreview />
            </Card>
          </>
        )}
      </main>
      <BottomNav items={mobileNav} active="home" onChange={() => {}} />
    </div>
  );
}

/* ---------------- desktop ---------------- */

function AdminDesktop({ state }: { state: ScreenState }) {
  return (
    <div className="min-h-full flex bg-background">
      <Sidebar items={nav} active="home" onChange={() => {}} />
      <div className="flex-1 flex flex-col min-w-0 page-tint">
        <header className="h-16 border-b border-border bg-card/80 backdrop-blur flex items-center justify-between px-6">
          <div>
            <h1 className="font-display text-lg font-bold">لوحة التحكم</h1>
            <p className="text-xs text-muted-foreground">العام الدراسي {ACADEMIC_YEAR}</p>
          </div>
          <Button variant="outline" className="gap-2"><Upload width={18} height={18} />استيراد Excel</Button>
        </header>
        <main className="flex-1 overflow-y-auto p-6 space-y-5">
          {state === "loading" ? (
            <>
              <div className="grid grid-cols-4 gap-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-[var(--radius-lg)]" />)}</div>
              <Skeleton className="h-72 rounded-[var(--radius-lg)]" />
            </>
          ) : state === "empty" ? (
            <>
              <StatCards />
              <Card>
                <CardHeader title="الرسوم المستحقة قريبًا" />
                <EmptyState icon={<ChartBar width={28} height={28} />} title="لا توجد رسوم مستحقة" description="جميع الطالبات مسددات حتى الآن." />
              </Card>
            </>
          ) : (
            <>
              <StatCards />
              <div className="grid grid-cols-3 gap-5">
                <Card className="col-span-2">
                  <CardHeader
                    title="الرسوم المستحقة قريبًا"
                    subtitle="أكثر الشاشات أهمية — مرتّبة حسب قرب موعد الاستحقاق"
                    action={<Button variant="ghost" className="h-9 px-2 text-sm text-primary gap-1"><Copy width={16} height={16} />نسخ نص التذكير</Button>}
                  />
                  <DuesTable />
                </Card>
                <Card>
                  <CardHeader title="بانتظار المراجعة" subtitle={`${num(paymentQueue.length)} إيصالات`} />
                  <ReviewsPreview />
                </Card>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
