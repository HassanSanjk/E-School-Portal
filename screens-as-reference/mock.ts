// Realistic Arabic sample data reused across screens and states.
import type { FeeStatus, PaymentStatus } from "./format";

export const SCHOOL_NAME = "مدرسة ابن الجراح الثانوية الخاصة بنات";
export const SCHOOL_SHORT = "ابن الجراح";
export const ACADEMIC_YEAR = "2025 / 2026";

export interface Mark {
  subject: string;
  assessments: { label: string; value: number; max: number }[];
}

export interface FeeItem {
  id: string;
  label: string;
  amount: number;
  due: Date;
  paid: boolean;
  status: FeeStatus;
}

export interface Child {
  id: string;
  name: string; // طالبة
  grade: string;
  avatarColor: string;
}

// النتائج — assessment counts vary (2 or 3) on purpose.
export const studentMarks: Mark[] = [
  {
    subject: "اللغة العربية",
    assessments: [
      { label: "التقويم الأول", value: 18, max: 20 },
      { label: "التقويم الثاني", value: 17, max: 20 },
      { label: "الامتحان النهائي", value: 55, max: 60 },
    ],
  },
  {
    subject: "الرياضيات",
    assessments: [
      { label: "التقويم الأول", value: 15, max: 20 },
      { label: "الامتحان النهائي", value: 48, max: 60 },
    ],
  },
  {
    subject: "الأحياء",
    assessments: [
      { label: "التقويم الأول", value: 19, max: 20 },
      { label: "التقويم الثاني", value: 16, max: 20 },
      { label: "الامتحان النهائي", value: 52, max: 60 },
    ],
  },
  {
    subject: "الكيمياء",
    assessments: [
      { label: "التقويم الأول", value: 14, max: 20 },
      { label: "الامتحان النهائي", value: 44, max: 60 },
    ],
  },
];

function d(offsetDays: number): Date {
  const base = new Date(2026, 7, 26); // 26 Aug 2026 (project "today")
  return new Date(base.getFullYear(), base.getMonth(), base.getDate() + offsetDays);
}

export const studentFees: FeeItem[] = [
  { id: "f1", label: "القسط الأول", amount: 120000, due: d(-40), paid: true, status: "paid" },
  { id: "f2", label: "القسط الثاني", amount: 120000, due: d(6), paid: false, status: "due" },
  { id: "f3", label: "القسط الثالث", amount: 120000, due: d(-3), paid: false, status: "overdue" },
];

export const tutorialSubjects = [
  { subject: "اللغة العربية", papers: 4 },
  { subject: "الرياضيات", papers: 6 },
  { subject: "الأحياء", papers: 3 },
  { subject: "الفيزياء", papers: 5 },
];

export const guardianChildren: Child[] = [
  { id: "c1", name: "رزان محمد الطيب", grade: "الصف الثالث الثانوي", avatarColor: "#441967" },
  { id: "c2", name: "سلمى عبد الله حسن", grade: "الصف الأول الثانوي", avatarColor: "#c79a2e" },
];

export const teacherToday = {
  day: "الأحد",
  periods: [
    { period: 1, subject: "الرياضيات", grade: "الثالث الثانوي", room: "قاعة 3", time: "08:00" },
    { period: 2, subject: "الرياضيات", grade: "الأول الثانوي", room: "قاعة 1", time: "09:00" },
    { period: 4, subject: "الرياضيات", grade: "الثاني الثانوي", room: "قاعة 2", time: "11:00" },
  ],
};

export const teacherSalary = {
  month: "أغسطس 2026",
  base: 450000,
  deductions: [{ label: "غياب يوم واحد", amount: 15000 }],
  get net() {
    return this.base - this.deductions.reduce((s, x) => s + x.amount, 0);
  },
  paid: false,
};

export interface QueueItem {
  id: string;
  studentName: string;
  guardianName: string;
  feeLabel: string;
  amount: number;
  submittedAt: Date;
  status: PaymentStatus;
}

export const paymentQueue: QueueItem[] = [
  { id: "p1", studentName: "رزان محمد الطيب", guardianName: "محمد الطيب", feeLabel: "القسط الثاني", amount: 120000, submittedAt: d(-1), status: "pending" },
  { id: "p2", studentName: "هبة إبراهيم آدم", guardianName: "إبراهيم آدم", feeLabel: "القسط الثاني", amount: 120000, submittedAt: d(-1), status: "pending" },
  { id: "p3", studentName: "مريم عثمان بابكر", guardianName: "عثمان بابكر", feeLabel: "القسط الثالث", amount: 120000, submittedAt: d(-2), status: "pending" },
];

export interface DueSoonRow {
  studentName: string;
  grade: string;
  feeLabel: string;
  amount: number;
  due: Date;
  status: FeeStatus;
}

export const feesDueSoon: DueSoonRow[] = [
  { studentName: "آلاء الصادق يوسف", grade: "الثالث الثانوي", feeLabel: "القسط الثالث", amount: 120000, due: d(-3), status: "overdue" },
  { studentName: "رزان محمد الطيب", grade: "الثالث الثانوي", feeLabel: "القسط الثاني", amount: 120000, due: d(6), status: "due" },
  { studentName: "سلمى عبد الله حسن", grade: "الأول الثانوي", feeLabel: "القسط الثاني", amount: 120000, due: d(9), status: "due" },
  { studentName: "نورا كمال إدريس", grade: "الثاني الثانوي", feeLabel: "القسط الثاني", amount: 120000, due: d(12), status: "due" },
];

export const adminOverview = {
  duesSoon: 7,
  pendingReviews: 3,
  totalStudents: 45,
  collectedThisMonth: 5400000,
};

export const studentProfile = {
  name: "رزان محمد الطيب",
  grade: "الصف الثالث الثانوي",
  id: "STU-1042",
};

export const guardianProfile = {
  name: "محمد الطيب",
  phone: "+249 91 365 6802",
};
