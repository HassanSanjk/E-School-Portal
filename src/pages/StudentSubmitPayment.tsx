import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { AppBar, BottomNav } from '@/components/shell'
import { STUDENT_NAV_ITEMS } from '@/lib/studentNav'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle, CheckCircle, Clock, Upload, Wallet } from '@/components/icons'
import { currency, shortDate } from '@/lib/format'
import { fetchFeesWithStatus, parseDateOnly, type FeeRow } from '@/lib/fees'
import {
  validatePaymentScreenshot,
  compressImage,
  uploadAndRecordPayment,
  enqueuePayment,
  queuedPaymentFeeIds,
} from '@/lib/paymentSubmission'

function loadFailureMessage(isOnline: boolean, onlineMessage: string): string {
  return isOnline
    ? onlineMessage
    : 'لا يوجد اتصال بالإنترنت ولا تتوفر بيانات محفوظة لعرضها الآن. ستُحدَّث تلقائيًا فور عودة الاتصال.'
}

export function StudentSubmitPayment() {
  const { profile } = useAuth()
  const isOnline = useOnlineStatus()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const preselectedFeeId = searchParams.get('feeId')
  const studentId = profile?.id

  const feesQuery = useQuery({
    queryKey: ['fees', studentId],
    queryFn: fetchFeesWithStatus,
    enabled: !!studentId,
  })

  const [queuedFeeIds, setQueuedFeeIds] = useState<Set<string>>(new Set())
  useEffect(() => {
    queuedPaymentFeeIds().then(setQueuedFeeIds)
  }, [])

  // Eligible to pay against: not already paid, not already awaiting review
  // (a rejected payment's fee still shows up here — hasPendingPayment only
  // reflects a 'pending' row, so resubmitting after a rejection is fine),
  // and not already sitting in the local offline queue waiting to go out.
  const eligibleFees = useMemo(
    () =>
      (feesQuery.data ?? []).filter(
        (f) => f.status !== 'paid' && !f.hasPendingPayment && !queuedFeeIds.has(f.id),
      ),
    [feesQuery.data, queuedFeeIds],
  )

  const [selectedFeeId, setSelectedFeeId] = useState<string | null>(null)
  useEffect(() => {
    if (selectedFeeId) return
    if (preselectedFeeId && eligibleFees.some((f) => f.id === preselectedFeeId)) {
      setSelectedFeeId(preselectedFeeId)
    } else if (eligibleFees.length === 1) {
      setSelectedFeeId(eligibleFees[0].id)
    }
  }, [preselectedFeeId, eligibleFees, selectedFeeId])

  const selectedFee = eligibleFees.find((f) => f.id === selectedFeeId) ?? null

  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const [fileError, setFileError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [queuedLocally, setQueuedLocally] = useState(false)

  function handleFileChange(selected: File | null) {
    setSubmitError(null)
    if (!selected) {
      setFile(null)
      setFileError(null)
      return
    }
    const error = validatePaymentScreenshot(selected)
    if (error) {
      setFile(null)
      setFileError(error)
      return
    }
    setFileError(null)
    setFile(selected)
  }

  async function handleSubmit() {
    if (!studentId || !selectedFee || !file) return
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      const blob = await compressImage(file)
      try {
        await uploadAndRecordPayment(studentId, selectedFee.id, blob)
        await queryClient.invalidateQueries({ queryKey: ['fees', studentId] })
        await queryClient.invalidateQueries({ queryKey: ['feeHeadline', studentId] })
        setSubmitted(true)
      } catch (err) {
        // Offline is the expected reason this fails — queue it locally
        // instead of treating it as a real error; E2's whole point is that
        // this doesn't just fail on a bad connection.
        if (!isOnline) {
          await enqueuePayment(studentId, selectedFee.id, blob)
          setQueuedLocally(true)
          setSubmitted(true)
        } else {
          throw err
        }
      }
    } catch (err) {
      console.error('payment submission failed', err)
      setSubmitError('تعذّر إرسال الإيصال. حاولي مرة أخرى.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-dvh flex flex-col bg-background page-tint">
        <AppBar title="دفع الرسوم" onBack={() => navigate('/student/fees')} />
        <main className="flex-1 p-4 max-w-xl w-full mx-auto flex items-center">
          <Card className="w-full p-6 flex flex-col items-center gap-3 text-center">
            <span
              className={`flex h-14 w-14 items-center justify-center rounded-full ${
                queuedLocally ? 'bg-due-bg text-due' : 'bg-paid-bg text-paid'
              }`}
            >
              {queuedLocally ? <Clock width={28} height={28} /> : <CheckCircle width={28} height={28} />}
            </span>
            <h2 className="font-display text-lg font-bold">
              {queuedLocally ? 'تم حفظ الإيصال، بانتظار الاتصال' : 'تم إرسال الإيصال بنجاح'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {queuedLocally
                ? 'لا يوجد اتصال بالإنترنت حاليًا. تم حفظ الإيصال على جهازكِ وسيتم إرساله تلقائيًا فور عودة الاتصال.'
                : 'سيتم مراجعته من قِبل الإدارة، ويمكنكِ متابعة حالته من صفحة الرسوم.'}
            </p>
            <div className="flex flex-col gap-2 w-full mt-2">
              <Button size="lg" onClick={() => navigate('/student/fees')} className="w-full">
                العودة إلى الرسوم
              </Button>
              <Button size="lg" variant="ghost" onClick={() => navigate('/student')} className="w-full">
                العودة إلى الرئيسية
              </Button>
            </div>
          </Card>
        </main>
        <BottomNav items={STUDENT_NAV_ITEMS} />
      </div>
    )
  }

  return (
    <div className="min-h-dvh flex flex-col bg-background page-tint">
      <AppBar title="دفع الرسوم" onBack={() => navigate('/student/fees')} />

      <main className="flex-1 p-4 space-y-4 pb-24 max-w-xl w-full mx-auto">
        {feesQuery.isPending ? (
          <>
            <Skeleton className="h-20 w-full rounded-2xl" />
            <Skeleton className="h-40 w-full rounded-2xl" />
          </>
        ) : feesQuery.isError ? (
          <Alert variant="destructive">
            <AlertTriangle />
            <AlertDescription>{loadFailureMessage(isOnline, 'تعذّر تحميل الرسوم.')}</AlertDescription>
          </Alert>
        ) : eligibleFees.length === 0 ? (
          <Card className="p-6 flex flex-col items-center gap-2 text-center">
            <Wallet width={24} height={24} className="text-muted-foreground/60" />
            <p className="text-sm text-muted-foreground">
              لا توجد رسوم بحاجة إلى الدفع حاليًا.
            </p>
            <Link to="/student/fees" className="text-sm font-semibold text-primary hover:underline mt-1">
              عرض كل الرسوم
            </Link>
          </Card>
        ) : (
          <>
            <div>
              <h2 className="font-display text-[15px] font-bold text-foreground mb-2">اختاري الرسوم</h2>
              <div className="space-y-2">
                {eligibleFees.map((fee: FeeRow) => {
                  const isSelected = fee.id === selectedFeeId
                  return (
                    <button
                      key={fee.id}
                      type="button"
                      onClick={() => setSelectedFeeId(fee.id)}
                      aria-pressed={isSelected}
                      className={`w-full text-start rounded-xl border p-3 transition-colors ${
                        isSelected
                          ? 'border-primary bg-secondary'
                          : 'border-border bg-card hover:bg-muted'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-sm truncate">
                          {fee.installmentLabel ?? `رسوم العام ${fee.academicYear}`}
                        </span>
                        <span className="font-bold text-sm shrink-0">{currency(fee.amountDue)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        تاريخ الاستحقاق {shortDate(parseDateOnly(fee.dueDate))}
                        {fee.status === 'overdue' ? ' · متأخرة' : ''}
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>

            <Card className="p-4 space-y-3">
              <h2 className="font-display text-[15px] font-bold text-foreground">صورة إيصال الدفع</h2>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
              />

              {previewUrl ? (
                <div className="space-y-2">
                  <img
                    src={previewUrl}
                    alt="معاينة إيصال الدفع"
                    className="w-full max-h-64 object-contain rounded-lg border border-border bg-muted"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-sm font-semibold text-primary hover:underline"
                  >
                    اختيار صورة أخرى
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-32 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 text-muted-foreground hover:bg-muted transition-colors"
                >
                  <Upload width={22} height={22} />
                  <span className="text-sm font-semibold">اضغطي لإرفاق صورة الإيصال</span>
                </button>
              )}

              {fileError && <p className="text-sm font-medium text-destructive">{fileError}</p>}
            </Card>

            {submitError && (
              <Alert variant="destructive">
                <AlertTriangle />
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            )}

            <Button size="lg" onClick={handleSubmit} disabled={!selectedFee || !file || isSubmitting} className="w-full">
              {isSubmitting ? '...جارٍ الإرسال' : 'إرسال الإيصال'}
            </Button>
          </>
        )}
      </main>

      <BottomNav items={STUDENT_NAV_ITEMS} />
    </div>
  )
}
