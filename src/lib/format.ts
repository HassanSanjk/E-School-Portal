// Formatting helpers — Western numerals, LTR-embedded numbers inside RTL Arabic,
// and feminine-aware student labels. Single source so conventions never drift.

// Unicode isolates so digit runs render LTR inside an RTL sentence.
const LRI = "⁦"; // left-to-right isolate
const PDI = "⁩"; // pop directional isolate

/** Wrap a value so its digits render left-to-right within an Arabic sentence. */
export function ltr(value: string | number): string {
  return `${LRI}${value}${PDI}`;
}

/** Sudanese pound amount, e.g. "٤٥٬٠٠٠" avoided — Western numerals per brief. */
export function currency(amount: number): string {
  const n = new Intl.NumberFormat("en-US").format(amount);
  return ltr(`${n} ج.س`);
}

/** Short date dd/mm/yyyy with LTR isolation. */
export function shortDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return ltr(`${dd}/${mm}/${d.getFullYear()}`);
}

const ARABIC_MONTHS = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

export function longDate(d: Date): string {
  return `${ltr(d.getDate())} ${ARABIC_MONTHS[d.getMonth()]} ${ltr(d.getFullYear())}`;
}

/** Month + year only, no day — for a `date` column where the day is
 * always the 1st and meaningless to show (e.g. a salary's `month`).
 * Deliberately not `toLocaleDateString('ar', ...)`: that renders Eastern
 * Arabic-Indic digits by default, which is exactly the Western-numerals
 * rule this whole file exists to enforce. */
export function monthYear(d: Date): string {
  return `${ARABIC_MONTHS[d.getMonth()]} ${ltr(d.getFullYear())}`;
}

/** Percentage/score out of a max, digits LTR. */
export function score(value: number, max: number): string {
  return ltr(`${value} / ${max}`);
}

/** Plain number, LTR isolated. */
export function num(value: number): string {
  return ltr(new Intl.NumberFormat("en-US").format(value));
}

/** Phone number, kept LTR. */
export function phone(value: string): string {
  return ltr(value);
}

export type FeeStatus = "paid" | "due" | "overdue";

export const FEE_STATUS_LABEL: Record<FeeStatus, string> = {
  paid: "مدفوعة",
  due: "مستحقة قريبًا",
  overdue: "متأخرة",
};

export type PaymentStatus = "pending" | "confirmed" | "rejected";

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  pending: "قيد المراجعة",
  confirmed: "مؤكَّدة",
  rejected: "مرفوضة",
};

/** Days until a due date; negative = overdue. */
export function daysUntil(due: Date, from: Date = new Date()): number {
  const ms = due.getTime() - from.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export function deriveFeeStatus(due: Date, paid: boolean, from: Date = new Date()): FeeStatus {
  if (paid) return "paid";
  return daysUntil(due, from) < 0 ? "overdue" : "due";
}
