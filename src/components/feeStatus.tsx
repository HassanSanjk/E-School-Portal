import { CheckCircle, Clock, AlertTriangle } from './icons'
import { FEE_STATUS_LABEL, type FeeStatus } from '@/lib/format'

/** Gradient used behind the hero-style fee card (D1's headline, admin's
 * per-row detail if it's ever needed there too). */
export const FEE_GRADIENT: Record<FeeStatus, string> = {
  paid: 'from-paid to-[#0f5c37]',
  due: 'from-[#8a5606] to-[#6d4405]',
  overdue: 'from-overdue to-[#8a271f]',
}

const FEE_ICON: Record<FeeStatus, typeof CheckCircle> = {
  paid: CheckCircle,
  due: Clock,
  overdue: AlertTriangle,
}

const FEE_PILL_TONE: Record<FeeStatus, string> = {
  paid: 'bg-paid-bg text-paid',
  due: 'bg-due-bg text-due',
  overdue: 'bg-overdue-bg text-overdue',
}

export function FeeStatusPill({ status }: { status: FeeStatus }) {
  const Icon = FEE_ICON[status]
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 h-7 text-xs font-bold ${FEE_PILL_TONE[status]}`}
    >
      <Icon width={14} height={14} />
      {FEE_STATUS_LABEL[status]}
    </span>
  )
}
