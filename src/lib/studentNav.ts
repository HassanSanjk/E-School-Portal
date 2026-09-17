import { Home, ChartBar, FileText, Wallet, Upload } from '@/components/icons'
import type { NavItem } from '@/components/shell'

/** D1 (home), D2 (marks), D3 (tutorial papers), D4 (fees) and D5 (submit
 * payment) are real routes. There's no separate nav tab for D6 (Payment
 * History) — it's reached from the Fees screen instead, matching the
 * figma brief's own screen list (Payment History isn't one of the five
 * bottom-nav destinations). */
export const STUDENT_NAV_ITEMS: NavItem[] = [
  { key: 'home', label: 'الرئيسية', icon: Home, to: '/student', enabled: true },
  { key: 'marks', label: 'النتائج', icon: ChartBar, to: '/student/marks', enabled: true },
  { key: 'papers', label: 'المذكّرات', icon: FileText, to: '/student/papers', enabled: true },
  { key: 'fees', label: 'الرسوم', icon: Wallet, to: '/student/fees', enabled: true },
  { key: 'pay', label: 'الدفع', icon: Upload, to: '/student/pay', enabled: true },
]
