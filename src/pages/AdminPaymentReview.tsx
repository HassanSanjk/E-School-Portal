import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { AlertTriangle, Search, X, ImageOff } from '@/components/icons'
import { longDate, currency, PAYMENT_STATUS_LABEL, type PaymentStatus } from '@/lib/format'
import { useAuth } from '@/hooks/useAuth'
import {
  fetchPayments,
  createSignedScreenshotUrl,
  reconcilePayment,
  type PaymentRow,
} from '@/lib/paymentReview'

// C7 (list + full-size view) + C8 (approve/reject). Approve is one click —
// it's the common, expected case for a correctly-submitted payment. Reject
// asks for a confirm first: there's no dedicated "reason" field in the
// schema and no undo in this UI, so it's the action most worth a pause.
type StatusFilter = 'all' | PaymentStatus
type ActionState = 'idle' | 'confirmingReject' | 'submitting'

const STATUS_TONE: Record<PaymentStatus, string> = {
  pending: 'bg-due-bg text-due',
  confirmed: 'bg-paid-bg text-paid',
  rejected: 'bg-overdue-bg text-overdue',
}

export function AdminPaymentReview() {
  const { session } = useAuth()
  const adminId = session?.user.id

  const [payments, setPayments] = useState<PaymentRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [signedUrls, setSignedUrls] = useState<Record<string, string | null>>({})

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending')
  const [search, setSearch] = useState('')
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  const [actionState, setActionState] = useState<Record<string, ActionState>>({})
  const [actionError, setActionError] = useState<Record<string, string | null>>({})

  function setOneActionState(id: string, state: ActionState) {
    setActionState((prev) => ({ ...prev, [id]: state }))
  }

  async function handleApprove(id: string) {
    if (!adminId) {
      setActionError((prev) => ({ ...prev, [id]: 'تعذّر تحديد هوية المسؤول الحالي — أعيدي تسجيل الدخول.' }))
      return
    }
    setOneActionState(id, 'submitting')
    setActionError((prev) => ({ ...prev, [id]: null }))
    try {
      await reconcilePayment(id, 'confirmed', adminId)
      const reconciledAt = new Date().toISOString()
      setPayments((prev) => prev.map((p) => (p.id === id ? { ...p, status: 'confirmed', reconciledAt } : p)))
      setOneActionState(id, 'idle')
    } catch (e) {
      setActionError((prev) => ({
        ...prev,
        [id]: e instanceof Error ? e.message : 'تعذّر تأكيد الدفع.',
      }))
      setOneActionState(id, 'idle')
    }
  }

  async function handleRejectConfirm(id: string) {
    if (!adminId) {
      setActionError((prev) => ({ ...prev, [id]: 'تعذّر تحديد هوية المسؤول الحالي — أعيدي تسجيل الدخول.' }))
      return
    }
    setOneActionState(id, 'submitting')
    setActionError((prev) => ({ ...prev, [id]: null }))
    try {
      await reconcilePayment(id, 'rejected', adminId)
      const reconciledAt = new Date().toISOString()
      setPayments((prev) => prev.map((p) => (p.id === id ? { ...p, status: 'rejected', reconciledAt } : p)))
      setOneActionState(id, 'idle')
    } catch (e) {
      setActionError((prev) => ({
        ...prev,
        [id]: e instanceof Error ? e.message : 'تعذّر رفض الدفع.',
      }))
      setOneActionState(id, 'idle')
    }
  }

  useEffect(() => {
    let cancelled = false
    async function load() {
      setIsLoading(true)
      setLoadError(null)
      try {
        const data = await fetchPayments()
        if (cancelled) return
        setPayments(data)
        // Small dataset (one school, occasional submissions) — generating
        // every visible row's signed URL up front is simpler than doing it
        // lazily per click, and one failure doesn't block the others.
        const entries = await Promise.all(
          data.map(async (p) => [p.id, await createSignedScreenshotUrl(p.screenshotPath)] as const),
        )
        if (!cancelled) setSignedUrls(Object.fromEntries(entries))
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'تعذّر تحميل طلبات الدفع.')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const counts = useMemo(
    () => ({
      all: payments.length,
      pending: payments.filter((p) => p.status === 'pending').length,
      confirmed: payments.filter((p) => p.status === 'confirmed').length,
      rejected: payments.filter((p) => p.status === 'rejected').length,
    }),
    [payments],
  )

  const visiblePayments = useMemo(() => {
    const q = search.trim().toLowerCase()
    return payments
      .filter((p) => statusFilter === 'all' || p.status === statusFilter)
      .filter((p) => !q || p.fullName.toLowerCase().includes(q) || p.studentNumber.toLowerCase().includes(q))
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)) // newest submission first
  }, [payments, statusFilter, search])

  return (
    <div className="min-h-dvh bg-background p-5">
      <div className="max-w-5xl w-full mx-auto space-y-4">
        <div>
          <Link to="/admin" className="text-sm text-primary-soft hover:underline">
            ← لوحة الإدارة
          </Link>
          <h1 className="font-display text-xl font-bold mt-2">مراجعة طلبات الدفع</h1>
          <p className="text-sm text-muted-foreground mt-1">
            إيصالات الدفع المُرسلة من الطالبات، بانتظار المطابقة.
          </p>
        </div>

        {loadError && (
          <Alert variant="destructive">
            <AlertTriangle />
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <p className="text-sm text-muted-foreground">...جارٍ تحميل طلبات الدفع</p>
        ) : payments.length === 0 ? (
          <Card className="p-6 text-center">
            <p className="text-sm text-muted-foreground">لا توجد طلبات دفع لعرضها حاليًا.</p>
          </Card>
        ) : (
          <>
            <Card className="p-4">
              <CardContent className="p-0 space-y-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto text-muted-foreground size-4" />
                  <Input
                    value={search}
                    onValueChange={setSearch}
                    placeholder="ابحثي بالاسم أو الرقم الأكاديمي"
                    className="ps-9"
                  />
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  {(
                    [
                      ['pending', 'قيد المراجعة', counts.pending],
                      ['confirmed', 'مؤكَّدة', counts.confirmed],
                      ['rejected', 'مرفوضة', counts.rejected],
                      ['all', 'الكل', counts.all],
                    ] as [StatusFilter, string, number][]
                  ).map(([key, label, count]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setStatusFilter(key)}
                      className={`rounded-full px-3 py-1 font-medium transition-colors ${
                        statusFilter === key
                          ? key === 'all'
                            ? 'bg-primary text-primary-foreground'
                            : STATUS_TONE[key as PaymentStatus]
                          : 'bg-muted text-muted-foreground hover:bg-muted/70'
                      }`}
                    >
                      {label} · {count}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {visiblePayments.length === 0 ? (
              <Card className="p-6 text-center">
                <p className="text-sm text-muted-foreground">لا توجد نتائج مطابقة.</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {visiblePayments.map((p) => {
                  const url = signedUrls[p.id]
                  return (
                    <Card key={p.id} className="p-3">
                      <CardContent className="p-0 space-y-2">
                        <button
                          type="button"
                          onClick={() => url && setLightboxUrl(url)}
                          disabled={!url}
                          className="block w-full aspect-video rounded-lg overflow-hidden bg-muted"
                        >
                          {url ? (
                            <img
                              src={url}
                              alt={`إيصال دفع الطالبة ${p.fullName}`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="flex h-full flex-col items-center justify-center gap-1 text-xs text-muted-foreground">
                              <ImageOff className="size-5" />
                              تعذّر تحميل الصورة
                            </span>
                          )}
                        </button>

                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-medium text-sm">{p.fullName}</div>
                            <div className="text-xs text-muted-foreground">
                              {p.studentNumber}
                              {p.gradeLevel ? ` · ${p.gradeLevel}${p.classSection ? ` ${p.classSection}` : ''}` : ''}
                            </div>
                          </div>
                          <span
                            className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_TONE[p.status]}`}
                          >
                            {PAYMENT_STATUS_LABEL[p.status]}
                          </span>
                        </div>

                        <div className="text-xs text-muted-foreground">
                          {p.installmentLabel ? `${p.installmentLabel} — ${p.academicYear}` : `رسوم ${p.academicYear}`}
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{currency(p.amountDue)}</span>
                          <span className="text-xs text-muted-foreground">
                            أُرسلت {longDate(new Date(p.submittedAt))}
                          </span>
                        </div>
                        {p.status !== 'pending' && p.reconciledAt && (
                          <div className="text-xs text-muted-foreground">
                            تمت المراجعة {longDate(new Date(p.reconciledAt))}
                          </div>
                        )}

                        {p.status === 'pending' && (
                          <div className="pt-1 space-y-1.5">
                            {actionState[p.id] === 'confirmingReject' ? (
                              <div className="space-y-1.5">
                                <p className="text-xs text-muted-foreground">هل تريدين رفض هذا الطلب؟</p>
                                <div className="flex gap-2">
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    className="flex-1"
                                    onClick={() => handleRejectConfirm(p.id)}
                                    disabled={actionState[p.id] === 'submitting'}
                                  >
                                    {actionState[p.id] === 'submitting' ? '...' : 'نعم، ارفضي'}
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="flex-1"
                                    onClick={() => setOneActionState(p.id, 'idle')}
                                    disabled={actionState[p.id] === 'submitting'}
                                  >
                                    تراجع
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  className="flex-1"
                                  onClick={() => handleApprove(p.id)}
                                  disabled={actionState[p.id] === 'submitting'}
                                >
                                  {actionState[p.id] === 'submitting' ? '...' : 'قبول'}
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="flex-1"
                                  onClick={() => setOneActionState(p.id, 'confirmingReject')}
                                  disabled={actionState[p.id] === 'submitting'}
                                >
                                  رفض
                                </Button>
                              </div>
                            )}
                            {actionError[p.id] && (
                              <p className="text-xs text-destructive">{actionError[p.id]}</p>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>

      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxUrl(null)}
            aria-label="إغلاق"
            className="absolute top-4 end-4 rounded-full bg-black/40 p-2 text-white hover:bg-black/60"
          >
            <X />
          </button>
          <img
            src={lightboxUrl}
            alt="إيصال دفع بالحجم الكامل"
            className="max-h-full max-w-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
