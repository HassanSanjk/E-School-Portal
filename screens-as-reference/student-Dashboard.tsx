import { BrandBand, BottomNav } from "../../components/shell";
import { Card, CardHeader, Button, Progress, StatusPill, Skeleton, EmptyState, Avatar } from "../../components/ui";
import { Home, ChartBar, FileText, Wallet, Upload, ChevronEnd } from "../../components/icons";
import { score, num, currency, longDate, shortDate, daysUntil, deriveFeeStatus } from "../../lib/format";
import { studentMarks, tutorialSubjects, studentFees, studentProfile, ACADEMIC_YEAR } from "../../lib/mock";
import type { ScreenState } from "../types";

// A student's own account holds everything for her: marks, tutorial papers,
// fees, and payment submission. No linked-children / guardian concept — one login
// per daughter.
const nav = [
  { key: "home", label: "الرئيسية", icon: Home },
  { key: "marks", label: "النتائج", icon: ChartBar },
  { key: "papers", label: "المذكّرات", icon: FileText },
  { key: "fees", label: "الرسوم", icon: Wallet },
  { key: "pay", label: "الدفع", icon: Upload },
];

const feeTone: Record<string, string> = {
  paid: "from-paid to-[#0f5c37]",
  due: "from-[#8a5606] to-[#6d4405]",
  overdue: "from-overdue to-[#8a271f]",
};

export default function StudentDashboard({ state }: { state: ScreenState }) {
  const recent = studentMarks.slice(0, 3);
  const overdue = studentFees.find((f) => f.status === "overdue");
  const dueSoon = studentFees.find((f) => !f.paid && daysUntil(f.due) >= 0);
  const activeFee = overdue ?? dueSoon ?? studentFees.find((f) => !f.paid) ?? studentFees[0];
  const feeStatus = deriveFeeStatus(activeFee.due, activeFee.paid);
  const firstName = studentProfile.name.split(" ")[0];

  return (
    <div className="min-h-full flex flex-col bg-background page-tint">
      <BrandBand
        greeting={`مرحبًا، ${firstName}`}
        meta={`${studentProfile.grade} · ${ACADEMIC_YEAR}`}
        trailing={<Avatar name={studentProfile.name} size={44} color="#7a3fae" />}
      />

      <main className="flex-1 overflow-y-auto p-4 space-y-4 pb-6">
        {state === "loading" ? (
          <LoadingBody />
        ) : state === "empty" ? (
          <>
            <FeeSummaryEmpty />
            <Card>
              <CardHeader title="أحدث النتائج" />
              <EmptyState
                icon={<ChartBar width={28} height={28} />}
                title="لا توجد نتائج بعد"
                description="لم تُرصد أي درجات لهذا العام الدراسي حتى الآن. ستظهر هنا فور إدخالها."
              />
            </Card>
          </>
        ) : (
          <>
            {/* Hero fee summary — composed, not label/value rows */}
            <Card className="overflow-hidden -mt-8 relative z-10 shadow-[var(--shadow-raise)]">
              <div className={`bg-gradient-to-l ${feeTone[feeStatus]} text-white p-4`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white/85">حالة الرسوم — {activeFee.label}</span>
                  <StatusPill status={feeStatus} />
                </div>
                <p className="font-display text-[32px] font-extrabold leading-none mt-3" data-num>{currency(activeFee.amount)}</p>
                <p className="text-[13px] text-white/85 mt-2">تاريخ الاستحقاق {shortDate(activeFee.due)}</p>
              </div>
              <div className="p-3">
                <Button size="lg" className="gap-2"><Upload width={18} height={18} />رفع إيصال دفع</Button>
              </div>
            </Card>

            {/* Recent marks */}
            <Card>
              <CardHeader title="أحدث النتائج" action={<LinkBtn>عرض الكل</LinkBtn>} />
              <ul className="divide-y divide-hairline">
                {recent.map((m) => {
                  const last = m.assessments[m.assessments.length - 1];
                  const pct = Math.round((last.value / last.max) * 100);
                  return (
                    <li key={m.subject} className="px-4 py-3.5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-[15px]">{m.subject}</span>
                        <span className="text-sm text-muted-foreground" data-num>{last.label}: {score(last.value, last.max)}</span>
                      </div>
                      <Progress value={pct} tone={pct >= 80 ? "primary" : "accent"} />
                    </li>
                  );
                })}
              </ul>
            </Card>

            {/* Tutorial papers quick links */}
            <Card>
              <CardHeader title="المذكّرات الدراسية" subtitle="اضغطي على المادة لعرض الملفات" />
              <ul className="px-2 pb-2">
                {tutorialSubjects.map((t) => (
                  <li key={t.subject}>
                    <button className="w-full flex items-center gap-3 rounded-[var(--radius-md)] px-2 min-h-12 py-2 hover:bg-muted transition-colors text-start">
                      <span className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] bg-secondary text-primary-soft shrink-0">
                        <FileText width={18} height={18} />
                      </span>
                      <span className="flex-1 font-semibold">{t.subject}</span>
                      <span className="text-xs text-muted-foreground" data-num>{num(t.papers)} ملفات</span>
                      <ChevronEnd width={18} height={18} className="text-muted-foreground/70" />
                    </button>
                  </li>
                ))}
              </ul>
            </Card>

            <p className="text-center text-[11px] text-muted-foreground/70 pt-1">آخر تحديث · {longDate(new Date(2026, 7, 26))}</p>
          </>
        )}
      </main>

      <BottomNav items={nav} active="home" onChange={() => {}} />
    </div>
  );
}

function LinkBtn({ children }: { children: import("react").ReactNode }) {
  return <Button variant="ghost" size="md" className="h-9 px-2 text-sm text-primary">{children}</Button>;
}

function FeeSummaryEmpty() {
  return (
    <Card className="p-4 -mt-8 relative z-10 shadow-[var(--shadow-raise)]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">حالة الرسوم</p>
          <p className="text-base font-semibold mt-0.5 text-muted-foreground">لم تُسجَّل رسوم بعد</p>
        </div>
        <StatusPill status="paid" />
      </div>
    </Card>
  );
}

function LoadingBody() {
  return (
    <>
      <Skeleton className="h-36 -mt-8 relative z-10 rounded-[var(--radius-lg)]" />
      <Card className="p-4 space-y-4">
        <Skeleton className="h-5 w-32" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-2 w-full" />
          </div>
        ))}
      </Card>
      <Skeleton className="h-40 rounded-[var(--radius-lg)]" />
    </>
  );
}
