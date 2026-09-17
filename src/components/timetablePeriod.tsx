import { num } from '@/lib/format'
import type { MyTimetableEntry } from '@/lib/timetables'

/** One row in a teacher's timetable — used by the Dashboard's "today" list
 * (D7) and the full weekly Timetable screen (D8). */
export function TimetablePeriodRow({ entry }: { entry: MyTimetableEntry }) {
  return (
    <li className="flex items-center gap-3 rounded-xl bg-muted/70 p-3 ring-1 ring-inset ring-black/[0.03]">
      <div className="flex h-12 w-12 flex-col items-center justify-center rounded-lg brand-gradient text-primary-foreground shrink-0">
        <span className="text-[10px] leading-none text-white/70">الحصة</span>
        <span className="font-display text-lg font-extrabold leading-none mt-0.5">{num(entry.period)}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold truncate">{entry.subjectName}</p>
        <p className="text-sm text-muted-foreground truncate">
          {entry.gradeLevel} · {entry.classSection}
          {entry.room ? ` · ${entry.room}` : ''}
        </p>
      </div>
    </li>
  )
}
