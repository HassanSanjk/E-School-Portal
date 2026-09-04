import { useId, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { Field, FieldLabel } from '@/components/ui/field'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface FoundProfile {
  id: string
  login_id: string
  full_name: string
  role: 'student' | 'teacher' | 'admin'
}

const roleLabel: Record<FoundProfile['role'], string> = {
  student: 'طالبة',
  teacher: 'معلّم',
  admin: 'إدارة',
}

export function AdminPinReset() {
  const [searchId, setSearchId] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [found, setFound] = useState<FoundProfile | null>(null)

  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [isResetting, setIsResetting] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)
  const [resetSuccessFor, setResetSuccessFor] = useState<string | null>(null)

  const searchInputId = useId()
  const newPinId = useId()
  const confirmPinId = useId()

  async function handleSearch(e: FormEvent) {
    e.preventDefault()
    const trimmed = searchId.trim()
    if (!trimmed) return

    setIsSearching(true)
    setSearchError(null)
    setFound(null)
    setResetSuccessFor(null)
    setResetError(null)

    const { data, error } = await supabase
      .from('profiles')
      .select('id, login_id, full_name, role')
      .eq('login_id', trimmed)
      .maybeSingle()

    if (error) {
      setSearchError('حدث خطأ أثناء البحث. حاول مرة أخرى.')
    } else if (!data) {
      setSearchError('لا يوجد مستخدم بهذا رقم الدخول.')
    } else {
      setFound(data)
      setNewPin('')
      setConfirmPin('')
    }
    setIsSearching(false)
  }

  async function handleReset(e: FormEvent) {
    e.preventDefault()
    if (!found) return

    setResetError(null)

    if (newPin.length < 6) {
      setResetError('يجب أن يتكون الرمز السري من 6 خانات على الأقل.')
      return
    }
    if (newPin !== confirmPin) {
      setResetError('الرمزان السريان غير متطابقين.')
      return
    }

    setIsResetting(true)
    try {
      const { data, error } = await supabase.functions.invoke('admin-reset-pin', {
        body: { loginId: found.login_id, newPin },
      })

      if (error) {
        // error.context is a raw, unconsumed Response object (per Supabase's
        // own docs) - NOT already-parsed JSON. Reading error.context.error
        // directly (as this used to) silently returns undefined, which is
        // why only the SDK's generic "non-2xx status code" message ever
        // showed here instead of the server's real error text.
        let serverMessage: string | undefined
        if (error instanceof FunctionsHttpError) {
          try {
            const body = await error.context.json()
            if (typeof body?.error === 'string') serverMessage = body.error
          } catch {
            // context wasn't valid JSON - fall through to the generic message
          }
        }
        setResetError(serverMessage || 'تعذّرت إعادة تعيين الرمز السري.')
        return
      }

      setResetSuccessFor(data?.resetFor?.fullName ?? found.full_name)
      setFound(null)
      setSearchId('')
      setNewPin('')
      setConfirmPin('')
    } catch (e) {
      setResetError(e instanceof Error ? e.message : 'حدث خطأ غير متوقع.')
    } finally {
      setIsResetting(false)
    }
  }

  return (
    <div className="min-h-dvh bg-background p-5">
      <div className="max-w-sm w-full mx-auto space-y-4">
        <div>
          <Link to="/admin" className="text-sm text-primary-soft hover:underline">
            ← لوحة الإدارة
          </Link>
          <h1 className="font-display text-xl font-bold mt-2">إعادة تعيين رمز سري</h1>
          <p className="text-sm text-muted-foreground mt-1">
            ابحثي برقم الدخول، تأكدي من الاسم قبل المتابعة، ثم عيّني رمزًا سريًا جديدًا.
          </p>
        </div>

        {resetSuccessFor && (
          <Alert>
            <AlertDescription className="font-semibold">
              تم إعادة تعيين الرمز السري بنجاح لـ {resetSuccessFor}.
            </AlertDescription>
          </Alert>
        )}

        <Card className="p-5">
          <form onSubmit={handleSearch} className="space-y-3">
            <Field>
              <FieldLabel htmlFor={searchInputId}>رقم الدخول</FieldLabel>
              <Input
                id={searchInputId}
                dir="ltr"
                placeholder="STU-1042"
                value={searchId}
                onValueChange={setSearchId}
                required
              />
            </Field>
            <Button type="submit" className="w-full" disabled={isSearching}>
              {isSearching ? '...جارٍ البحث' : 'بحث'}
            </Button>
            {searchError && (
              <Alert variant="destructive">
                <AlertDescription>{searchError}</AlertDescription>
              </Alert>
            )}
          </form>
        </Card>

        {found && (
          <Card className="p-5">
            <CardHeader className="p-0 mb-3">
              <CardTitle className="text-base">
                {found.full_name}
                <span className="text-muted-foreground font-normal text-sm">
                  {' '}
                  · {roleLabel[found.role]} · {found.login_id}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <form onSubmit={handleReset} className="space-y-3">
                <Field>
                  <FieldLabel htmlFor={newPinId}>الرمز السري الجديد</FieldLabel>
                  <PasswordInput
                    id={newPinId}
                    dir="ltr"
                    value={newPin}
                    onValueChange={setNewPin}
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={confirmPinId}>تأكيد الرمز السري</FieldLabel>
                  <PasswordInput
                    id={confirmPinId}
                    dir="ltr"
                    value={confirmPin}
                    onValueChange={setConfirmPin}
                    required
                  />
                </Field>
                <Button type="submit" className="w-full" disabled={isResetting}>
                  {isResetting ? '...جارٍ الحفظ' : 'حفظ الرمز السري الجديد'}
                </Button>
                {resetError && (
                  <Alert variant="destructive">
                    <AlertDescription>{resetError}</AlertDescription>
                  </Alert>
                )}
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
