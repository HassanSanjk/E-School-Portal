import { useId, useState, type FormEvent } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Logo } from '@/components/brand'
import { AlertTriangle } from '@/components/icons'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Field, FieldLabel } from '@/components/ui/field'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { SCHOOL_NAME_FULL, currentAcademicYearLabel } from '@/lib/constants'

export function LoginPage() {
  const { login } = useAuth()
  const [loginId, setLoginId] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const loginIdInputId = useId()
  const pinInputId = useId()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    try {
      const { error } = await login(loginId, pin)
      if (error) {
        // Supabase's own error text is English/technical (e.g. "Invalid
        // login credentials") and not meant for end users — every failure
        // mode maps to the one Arabic message a family actually needs to
        // act on, matching the confirmed copy from the design brief.
        setError('رقم الدخول أو الرمز السري غير صحيح. حاولي مرة أخرى.')
      }
    } catch (e) {
      setError('حدث خطأ غير متوقع. تحققي من اتصالك بالإنترنت وحاولي مرة أخرى.')
      console.error('Unexpected login error:', e)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-dvh flex flex-col bg-background">
      {/* Branded dark header cap */}
      <div className="brand-gradient grain relative text-primary-foreground pt-12 pb-14 px-6 text-center rounded-b-[2rem]">
        <div className="relative z-10 flex flex-col items-center">
          <Logo size={84} className="mb-4 drop-shadow-[0_8px_24px_rgba(0,0,0,0.45)]" />
          <h1 className="font-display text-[19px] font-extrabold leading-snug max-w-[260px]">
            {SCHOOL_NAME_FULL}
          </h1>
          <div className="ornament mt-4 w-32 opacity-80" />
        </div>
      </div>

      <div className="flex-1 px-5 -mt-8">
        <div className="max-w-sm w-full mx-auto">
          <Card className="p-5">
            <div className="mb-5 text-center">
              <h2 className="font-display text-lg font-bold">تسجيل الدخول</h2>
              <p className="text-sm text-muted-foreground mt-1">
                أدخلي رقم الدخول والرمز السري للمتابعة
              </p>
            </div>

            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertTriangle width={18} height={18} />
                <AlertDescription className="font-semibold">{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Field>
                <FieldLabel htmlFor={loginIdInputId}>رقم الدخول</FieldLabel>
                <Input
                  id={loginIdInputId}
                  name="loginId"
                  inputMode="text"
                  autoComplete="username"
                  dir="ltr"
                  placeholder="STU-1042"
                  value={loginId}
                  onValueChange={setLoginId}
                  required
                  aria-invalid={!!error}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={pinInputId}>الرمز السري</FieldLabel>
                <Input
                  id={pinInputId}
                  name="pin"
                  type="password"
                  inputMode="numeric"
                  autoComplete="current-password"
                  dir="ltr"
                  placeholder="••••"
                  value={pin}
                  onValueChange={setPin}
                  required
                  aria-invalid={!!error}
                />
              </Field>
              <Button size="lg" type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? '...جارٍ الدخول' : 'تسجيل الدخول'}
              </Button>
            </form>

            <div className="gold-rule my-4 opacity-60" />
            <p className="text-center text-xs text-muted-foreground leading-relaxed">
              نسيتِ الرمز السري؟ تواصلي مع إدارة المدرسة لإعادة تعيينه — لأسباب أمنية لا
              يمكن إعادة التعيين ذاتيًا.
            </p>
          </Card>

          <p className="mt-6 text-center text-xs text-muted-foreground/80">
            بوابة الطالبات والمعلمين والإدارة · العام الدراسي {currentAcademicYearLabel()}
          </p>
        </div>
      </div>
    </div>
  )
}
