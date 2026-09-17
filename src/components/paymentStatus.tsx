import { CheckCircle, Clock, X } from './icons'
import { PAYMENT_STATUS_LABEL, type PaymentStatus } from '@/lib/format'

/** Also used directly (not through the pill below) by AdminPaymentReview's
 * filter-chip buttons, which need the tone classes merged into a button
 * rather than rendered as a standalone badge. */
export const PAYMENT_STATUS_TONE: Record<PaymentStatus, string> = {
  pending: 'bg-due-bg text-due',
  confirmed: 'bg-paid-bg text-paid',
  rejected: 'bg-overdue-bg text-overdue',
}

const PAYMENT_STATUS_ICON: Record<PaymentStatus, typeof CheckCircle> = {
  pending: Clock,
  confirmed: CheckCircle,
  rejected: X,
}

export function PaymentStatusPill({ status }: { status: PaymentStatus }) {
  const Icon = PAYMENT_STATUS_ICON[status]
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 h-7 text-xs font-bold ${PAYMENT_STATUS_TONE[status]}`}
    >
      <Icon width={14} height={14} />
      {PAYMENT_STATUS_LABEL[status]}
    </span>
  )
}
