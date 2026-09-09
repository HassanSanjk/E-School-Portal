import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { AlertTriangle, Search, Clock, Copy, Check } from '@/components/icons'
import { num, currency, FEE_STATUS_LABEL, type FeeStatus } from '@/lib/format'
import { copyToClipboard } from '@/lib/utils'
import { fetchFeesWithStatus, buildReminderMessage, type FeeRow } from '@/lib/fees'

// C5 (list) + C6 ("copy reminder text"). Per AGENTS.md this is the most
// important screen in the app (it's the entire replacement for automated
// reminders), and per figma_make_prompt.md admin screens need both a
// mobile and a desktop treatment, with true tables reserved for the wider
// admin view and card-based lists on mobile — so this renders two markups
// from the same sorted/filtered data rather than one cramped table at
// every width. The copy button fills the clipboard only — nothing is ever
// sent by the system itself, per the no-automated-messaging rule.
type SortKey = 'dueDate' | 'amount' | 'name'
type SortDir = 'asc' | 'desc'
type StatusFilter = 'all' | FeeStatus

const STATUS_TONE: Record<FeeStatus, string> = {
  paid: 'bg-paid-bg text-paid',
  due: 'bg-due-bg text-due',
  overdue: 'bg-overdue-bg text-overdue',
}

function relativeDueText(row: FeeRow): string {
  if (row.status === 'paid') return ''
  if (row.status === 'overdue') return `متأخرة منذ ${num(Math.abs(row.daysUntilDue))} يوم`
  if (row.daysUntilDue === 0) return 'تستحق اليوم'
  return `خلال ${num(row.daysUntilDue)} يوم`
}

export function AdminFeesDueSoon() {
  const [rows, setRows] = useState<FeeRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [academicYear, setAcademicYear] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('dueDate')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [copiedRowId, setCopiedRowId] = useState<string | null>(null)

  function handleCopyReminder(row: FeeRow) {
    copyToClipboard(buildReminderMessage(row))
    setCopiedRowId(row.id)
    setTimeout(() => setCopiedRowId((id) => (id === row.id ? null : id)), 2000)
  }

  useEffect(() => {
    let cancelled = false
    async function load() {
      setIsLoading(true)
      setLoadError(null)
      try {
        const data = await fetchFeesWithStatus()
        if (cancelled) return
        setRows(data)
        // Default to the most recent academic year actually present —
        // "YYYY-YYYY" sorts correctly as a plain string as long as every
        // year is entered in that format (C4 enforces this on entry).
        const years = [...new Set(data.map((r) => r.academicYear))].sort()
        setAcademicYear((prev) => prev || years[years.length - 1] || '')
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'تعذّر تحميل بيانات الرسوم.')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const years = useMemo(() => [...new Set(rows.map((r) => r.academicYear))].sort(), [rows])

  const counts = useMemo(() => {
    const scoped = academicYear ? rows.filter((r) => r.academicYear === academicYear) : rows
    return {
      all: scoped.length,
      overdue: scoped.filter((r) => r.status === 'overdue').length,
      due: scoped.filter((r) => r.status === 'due').length,
      paid: scoped.filter((r) => r.status === 'paid').length,
    }
  }, [rows, academicYear])

  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = rows.filter((r) => {
      if (academicYear && r.academicYear !== academicYear) return false
      if (statusFilter !== 'all' && r.status !== statusFilter) return false
      if (q && !r.fullName.toLowerCase().includes(q) && !r.studentNumber.toLowerCase().includes(q)) {
        return false
      }
      return true
    })

    list = [...list].sort((a, b) => {
      let cmp = 0
      if (sortKey === 'dueDate') cmp = a.dueDate.localeCompare(b.dueDate)
      else if (sortKey === 'amount') cmp = a.amountDue - b.amountDue
      else cmp = a.fullName.localeCompare(b.fullName, 'ar')
      return sortDir === 'asc' ? cmp : -cmp
    })

    return list
  }, [rows, academicYear, statusFilter, search, sortKey, sortDir])

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const sortArrow = (key: SortKey) => (sortKey === key ? (sortDir === 'asc' ? '▲' : '▼') : '')

  return (
    <div className="min-h-dvh bg-background p-5">
      <div className="max-w-5xl w-full mx-auto space-y-4">
        <div>
          <Link to="/admin" className="text-sm text-primary-soft hover:underline">
            ← لوحة الإدارة
          </Link>
          <h1 className="font-display text-xl font-bold mt-2">الرسوم المستحقة قريبًا</h1>
          <p className="text-sm text-muted-foreground mt-1">
            كل طالبة مرتبة حسب قرب موعد الاستحقاق — هذه الشاشة تغني عن أي تذكير تلقائي.
          </p>
        </div>

        {loadError && (
          <Alert variant="destructive">
            <AlertTriangle />
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <p className="text-sm text-muted-foreground">...جارٍ تحميل بيانات الرسوم</p>
        ) : rows.length === 0 ? (
          <Card className="p-6 text-center space-y-2">
            <p className="text-sm text-muted-foreground">لم يتم إنشاء أي رسوم بعد.</p>
            <Link to="/admin/fee-schedule" className="text-sm text-primary-soft hover:underline">
              إنشاء جدول الرسوم →
            </Link>
          </Card>
        ) : (
          <>
            <Card className="p-4">
              <CardContent className="p-0 space-y-3">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto text-muted-foreground size-4" />
                    <Input
                      value={search}
                      onValueChange={setSearch}
                      placeholder="ابحثي بالاسم أو الرقم الأكاديمي"
                      className="ps-9"
                    />
                  </div>
                  <select
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    className="flex h-9 rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <option value="">كل الأعوام</option>
                    {years.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                  <select
                    value={sortKey}
                    onChange={(e) => setSortKey(e.target.value as SortKey)}
                    className="flex h-9 rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:hidden"
                    aria-label="الترتيب"
                  >
                    <option value="dueDate">الأقرب استحقاقًا</option>
                    <option value="amount">المبلغ</option>
                    <option value="name">الاسم</option>
                  </select>
                </div>

                <div className="flex flex-wrap gap-2 text-xs">
                  {(
                    [
                      ['all', 'الكل', counts.all],
                      ['overdue', 'متأخرة', counts.overdue],
                      ['due', 'مستحقة قريبًا', counts.due],
                      ['paid', 'مدفوعة', counts.paid],
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
                            : STATUS_TONE[key as FeeStatus]
                          : 'bg-muted text-muted-foreground hover:bg-muted/70'
                      }`}
                    >
                      {label} · {num(count)}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {visibleRows.length === 0 ? (
              <Card className="p-6 text-center">
                <p className="text-sm text-muted-foreground">لا توجد رسوم مطابقة لهذا التصفية.</p>
              </Card>
            ) : (
              <>
                {/* Mobile: card list */}
                <div className="sm:hidden space-y-2">
                  {visibleRows.map((r) => (
                    <FeeCard
                      key={r.id}
                      row={r}
                      isCopied={copiedRowId === r.id}
                      onCopyReminder={() => handleCopyReminder(r)}
                    />
                  ))}
                </div>

                {/* Desktop/tablet: sortable table */}
                <Card className="hidden sm:block p-0 overflow-hidden">
                  <div className="overflow-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead className="bg-muted">
                        <tr>
                          <SortableHeader label="الطالبة" active={sortArrow('name')} onClick={() => toggleSort('name')} />
                          <th className="text-start font-medium px-3 py-2 border-b border-border">الصف</th>
                          <th className="text-start font-medium px-3 py-2 border-b border-border">
                            العام / القسط
                          </th>
                          <SortableHeader
                            label="المبلغ"
                            active={sortArrow('amount')}
                            onClick={() => toggleSort('amount')}
                          />
                          <SortableHeader
                            label="تاريخ الاستحقاق"
                            active={sortArrow('dueDate')}
                            onClick={() => toggleSort('dueDate')}
                          />
                          <th className="text-start font-medium px-3 py-2 border-b border-border">الحالة</th>
                          <th className="text-start font-medium px-3 py-2 border-b border-border" />
                        </tr>
                      </thead>
                      <tbody>
                        {visibleRows.map((r) => (
                          <tr key={r.id} className="odd:bg-card even:bg-muted/30">
                            <td className="px-3 py-2 border-b border-border whitespace-nowrap">
                              <div className="font-medium">{r.fullName}</div>
                              <div className="text-xs text-muted-foreground">{r.studentNumber}</div>
                            </td>
                            <td className="px-3 py-2 border-b border-border whitespace-nowrap text-muted-foreground">
                              {r.gradeLevel}
                              {r.classSection ? ` ${r.classSection}` : ''}
                            </td>
                            <td className="px-3 py-2 border-b border-border whitespace-nowrap text-muted-foreground">
                              {r.academicYear}
                              {r.installmentLabel ? ` — ${r.installmentLabel}` : ''}
                            </td>
                            <td className="px-3 py-2 border-b border-border whitespace-nowrap">
                              {currency(r.amountDue)}
                            </td>
                            <td className="px-3 py-2 border-b border-border whitespace-nowrap">
                              <div>{r.dueDate}</div>
                              {r.status !== 'paid' && (
                                <div className="text-xs text-muted-foreground">{relativeDueText(r)}</div>
                              )}
                            </td>
                            <td className="px-3 py-2 border-b border-border whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_TONE[r.status]}`}
                                >
                                  {FEE_STATUS_LABEL[r.status]}
                                </span>
                                {r.hasPendingPayment && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                                    <Clock className="size-3" />
                                    قيد المراجعة
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-2 border-b border-border whitespace-nowrap">
                              {r.status !== 'paid' && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleCopyReminder(r)}
                                >
                                  {copiedRowId === r.id ? (
                                    <>
                                      <Check className="size-3.5" /> تم النسخ
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="size-3.5" /> نسخ نص التذكير
                                    </>
                                  )}
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function SortableHeader({ label, active, onClick }: { label: string; active: string; onClick: () => void }) {
  return (
    <th className="text-start font-medium px-3 py-2 border-b border-border">
      <button type="button" onClick={onClick} className="flex items-center gap-1 hover:text-primary-soft">
        {label} <span className="text-[10px]">{active}</span>
      </button>
    </th>
  )
}

function FeeCard({
  row,
  isCopied,
  onCopyReminder,
}: {
  row: FeeRow
  isCopied: boolean
  onCopyReminder: () => void
}) {
  return (
    <Card className="p-3">
      <CardContent className="p-0 space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="font-medium text-sm">{row.fullName}</div>
            <div className="text-xs text-muted-foreground">
              {row.studentNumber}
              {row.gradeLevel ? ` · ${row.gradeLevel}${row.classSection ? ` ${row.classSection}` : ''}` : ''}
            </div>
          </div>
          <span
            className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_TONE[row.status]}`}
          >
            {FEE_STATUS_LABEL[row.status]}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">{currency(row.amountDue)}</span>
          <span className="text-xs text-muted-foreground">
            {row.academicYear}
            {row.installmentLabel ? ` — ${row.installmentLabel}` : ''}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{row.dueDate}</span>
          <span>{relativeDueText(row)}</span>
        </div>
        {row.hasPendingPayment && (
          <div className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            <Clock className="size-3" />
            قيد المراجعة
          </div>
        )}
        {row.status !== 'paid' && (
          <Button type="button" variant="outline" size="sm" className="w-full" onClick={onCopyReminder}>
            {isCopied ? (
              <>
                <Check className="size-3.5" /> تم النسخ
              </>
            ) : (
              <>
                <Copy className="size-3.5" /> نسخ نص التذكير
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  )

}
