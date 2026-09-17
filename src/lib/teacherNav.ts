import { Home, Calendar, Wallet } from '@/components/icons'
import type { NavItem } from '@/components/shell'

/** D7 (home), D8 (timetable) and D9 (salary) are all real routes — the
 * teacher portal from figma_make_prompt.md is now fully wired. */
export const TEACHER_NAV_ITEMS: NavItem[] = [
  { key: 'home', label: 'الرئيسية', icon: Home, to: '/teacher', enabled: true },
  { key: 'timetable', label: 'الجدول', icon: Calendar, to: '/teacher/timetable', enabled: true },
  { key: 'salary', label: 'الراتب', icon: Wallet, to: '/teacher/salary', enabled: true },
]
