import { Home, ChartBar, FileText, Wallet, Upload } from '@/components/icons'
import type { NavItem } from '@/components/shell'

/** D1 (home) and D2 (marks) are real routes. The rest are visible-but-
 * disabled until their screens exist (D3 tutorial papers, D4 fees, D5
 * submit payment) — flip `enabled: true` here the same task that adds
 * the route in App.tsx. */
export const STUDENT_NAV_ITEMS: NavItem[] = [
  { key: 'home', label: 'الرئيسية', icon: Home, to: '/student', enabled: true },
  { key: 'marks', label: 'النتائج', icon: ChartBar, to: '/student/marks', enabled: true },
  { key: 'papers', label: 'المذكّرات', icon: FileText, to: '/student/papers', enabled: false },
  { key: 'fees', label: 'الرسوم', icon: Wallet, to: '/student/fees', enabled: false },
  { key: 'pay', label: 'الدفع', icon: Upload, to: '/student/pay', enabled: false },
]
