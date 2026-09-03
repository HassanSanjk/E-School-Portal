import { useState } from "react";
import { Button, Card, Input, Label } from "../../components/ui";
import { Logo, BrandLockup } from "../../components/brand";
import { AlertTriangle, WifiOff } from "../../components/icons";
import { SCHOOL_NAME } from "../../lib/mock";
import type { ScreenState } from "../types";

export default function Login({ state }: { state: ScreenState }) {
  const [pin, setPin] = useState("");
  const showError = state === "empty"; // models the wrong-credentials error

  return (
    <div className="min-h-full flex flex-col bg-background">
      {/* Branded dark header cap */}
      <div className="brand-gradient grain relative text-primary-foreground pt-12 pb-14 px-6 text-center rounded-b-[2rem]">
        <div className="relative z-10 flex flex-col items-center">
          <Logo size={84} className="mb-4 drop-shadow-[0_8px_24px_rgba(0,0,0,0.45)]" />
          <h1 className="font-display text-[19px] font-extrabold leading-snug max-w-[260px]">{SCHOOL_NAME}</h1>
          <div className="ornament mt-4 w-32 opacity-80" />
        </div>
      </div>

      <div className="flex-1 px-5 -mt-8">
        <div className="max-w-sm w-full mx-auto">
          {state === "loading" ? (
            <Card className="p-5 space-y-4">
              <div className="shimmer h-4 w-24 rounded" />
              <div className="shimmer h-12 rounded-xl" />
              <div className="shimmer h-4 w-16 rounded" />
              <div className="shimmer h-12 rounded-xl" />
              <div className="shimmer h-12 rounded-xl" />
            </Card>
          ) : (
            <Card className="p-5">
              <div className="mb-5 text-center">
                <h2 className="font-display text-lg font-bold">تسجيل الدخول</h2>
                <p className="text-sm text-muted-foreground mt-1">أدخلي رقم الدخول والرمز السري للمتابعة</p>
              </div>

              {showError && (
                <div className="mb-4 flex items-start gap-2 rounded-[var(--radius-md)] bg-overdue-bg px-3 py-2.5 text-overdue">
                  <AlertTriangle width={18} height={18} className="mt-0.5 shrink-0" />
                  <p className="text-sm font-semibold">رقم الدخول أو الرمز السري غير صحيح. حاولي مرة أخرى.</p>
                </div>
              )}

              <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
                <div>
                  <Label htmlFor="uid">رقم الدخول</Label>
                  <Input id="uid" inputMode="numeric" dir="ltr" placeholder="STU-1042" defaultValue={showError ? "STU-1042" : ""} className={showError ? "border-overdue" : ""} />
                </div>
                <div>
                  <Label htmlFor="pin">الرمز السري</Label>
                  <Input
                    id="pin"
                    type="password"
                    inputMode="numeric"
                    dir="ltr"
                    placeholder="••••"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    className={showError ? "border-overdue" : ""}
                  />
                </div>
                <Button size="lg" type="submit">تسجيل الدخول</Button>
              </form>

              <div className="gold-rule my-4 opacity-60" />
              <p className="text-center text-xs text-muted-foreground leading-relaxed">
                نسيتِ الرمز السري؟ تواصلي مع إدارة المدرسة لإعادة تعيينه — لأسباب أمنية لا يمكن إعادة التعيين ذاتيًا.
              </p>
            </Card>
          )}

          <p className="mt-6 text-center text-xs text-muted-foreground/80">
            بوابة الطالبات والمعلمين والإدارة · العام الدراسي 2025 / 2026
          </p>
        </div>
      </div>
    </div>
  );
}

export function Splash() {
  return (
    <div className="min-h-full brand-gradient grain flex flex-col items-center justify-center text-primary-foreground px-6 text-center">
      <div className="relative z-10 flex flex-col items-center">
        <Logo size={112} className="drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)]" />
        <div className="ornament mt-6 w-40 opacity-80" />
        <h1 className="font-display text-xl font-extrabold leading-snug max-w-[260px] mt-5">{SCHOOL_NAME}</h1>
        <div className="mt-8 flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <span key={i} className="h-2.5 w-2.5 rounded-full bg-accent/90 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function Offline() {
  return (
    <div className="min-h-full page-tint flex flex-col items-center justify-center px-8 text-center">
      <div className="mb-5">
        <BrandLockup size={56} />
      </div>
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-primary-soft mb-4 ring-1 ring-[rgba(197,154,46,0.3)]">
        <WifiOff width={30} height={30} />
      </div>
      <h2 className="font-display text-lg font-bold">لا يوجد اتصال بالإنترنت</h2>
      <p className="mt-2 text-sm text-muted-foreground max-w-[300px] leading-relaxed">
        سيتم عرض المحتوى المحفوظ عند توفره. ستُحدَّث البيانات تلقائيًا فور عودة الاتصال — لا داعي للقلق.
      </p>
      <Button variant="outline" className="mt-6">إعادة المحاولة</Button>
    </div>
  );
}
