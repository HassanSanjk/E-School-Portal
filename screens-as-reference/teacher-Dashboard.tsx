import { BrandBand, BottomNav } from "../../components/shell";
import { Card, CardHeader, StatusPill, Skeleton, EmptyState, Avatar } from "../../components/ui";
import { Home, Calendar, Wallet } from "../../components/icons";
import { currency, num } from "../../lib/format";
import { teacherToday, teacherSalary, ACADEMIC_YEAR } from "../../lib/mock";
import type { ScreenState } from "../types";

const nav = [
  { key: "home", label: "الرئيسية", icon: Home },
  { key: "timetable", label: "الجدول", icon: Calendar },
  { key: "salary", label: "الراتب", icon: Wallet },
];

const TEACHER = "سعاد عبد الرحمن";

export default function TeacherDashboard({ state }: { state: ScreenState }) {
  return (
    <div className="min-h-full flex flex-col bg-background page-tint">
      <BrandBand
        greeting="مرحبًا، أستاذة سعاد"
        meta={`معلمة الرياضيات · ${ACADEMIC_YEAR}`}
        trailing={<Avatar name={TEACHER} size={44} color="#5a2a86" />}
      />

      <main className="flex-1 overflow-y-auto p-4 space-y-4 pb-6">
        {state === "loading" ? (
          <>
            <Skeleton className="h-32 -mt-8 relative z-10 rounded-[var(--radius-lg)]" />
            <Skeleton className="h-56 rounded-[var(--radius-lg)]" />
          </>
        ) : state === "empty" ? (
          <>
            <SalaryCard hero />
            <Card>
              <CardHeader title={`حصص اليوم — ${teacherToday.day}`} />
              <EmptyState
                icon={<Calendar width={28} height={28} />}
                title="لا توجد حصص اليوم"
                description="لا توجد حصص مجدولة في يومك الحالي. استمتعي بيومك!"
              />
            </Card>
          </>
        ) : (
          <>
            <SalaryCard hero />

            {/* Today's timetable */}
            <Card>
              <CardHeader title={`حصص اليوم — ${teacherToday.day}`} subtitle={`${num(teacherToday.periods.length)} حصص`} />
              <ul className="px-4 pb-4 space-y-2.5">
                {teacherToday.periods.map((p) => (
                  <li key={p.period} className="flex items-center gap-3 rounded-[var(--radius-md)] bg-muted/70 p-3 ring-1 ring-inset ring-black/[0.03]">
                    <div className="flex h-12 w-12 flex-col items-center justify-center rounded-[var(--radius-sm)] brand-gradient text-primary-foreground shrink-0">
                      <span className="text-[10px] leading-none text-white/70">الحصة</span>
                      <span className="font-display text-lg font-extrabold leading-none mt-0.5" data-num>{num(p.period)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold">{p.subject}</p>
                      <p className="text-sm text-muted-foreground">{p.grade} · {p.room}</p>
                    </div>
                    <span className="text-sm font-bold text-primary" dir="ltr" data-num>{p.time}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </>
        )}
      </main>

      <BottomNav items={nav} active="home" onChange={() => {}} />
    </div>
  );
}

function SalaryCard({ hero }: { hero?: boolean }) {
  const s = teacherSalary;
  return (
    <Card className={hero ? "overflow-hidden -mt-8 relative z-10 shadow-[var(--shadow-raise)]" : "overflow-hidden"}>
      <div className="brand-gradient grain text-white p-4">
        <div className="relative z-10 flex items-center justify-between">
          <span className="text-xs font-semibold text-white/80">صافي راتب {s.month}</span>
          <StatusPill status={s.paid ? "paid" : "due"} />
        </div>
        <p className="relative z-10 font-display text-[30px] font-extrabold leading-none mt-3" data-num>{currency(s.net)}</p>
      </div>
      <div className="p-4 space-y-2 text-sm">
        <Row label="الراتب الأساسي" value={currency(s.base)} />
        {s.deductions.map((d) => (
          <Row key={d.label} label={`خصم — ${d.label}`} value={`− ${currency(d.amount)}`} tone="overdue" />
        ))}
      </div>
    </Card>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: "overdue" }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={tone === "overdue" ? "text-overdue font-bold" : "font-bold"} data-num>{value}</span>
    </div>
  );
}
