// Minimal stroke icon set (currentColor). Directional icons mirror under RTL
// automatically because the app root is dir="rtl"; we use a scaleX on chevrons.
import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;

const base = {
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export const Home = (p: P) => (
  <svg {...base} {...p}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /><path d="M9.5 21v-6h5v6" /></svg>
);
export const ChartBar = (p: P) => (
  <svg {...base} {...p}><path d="M4 20V10" /><path d="M10 20V4" /><path d="M16 20v-7" /><path d="M3 20h18" /></svg>
);
export const FileText = (p: P) => (
  <svg {...base} {...p}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /><path d="M9 13h6M9 17h6" /></svg>
);
export const Wallet = (p: P) => (
  <svg {...base} {...p}><path d="M3 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><path d="M16 12h4" /><path d="M3 9h14" /></svg>
);
export const Calendar = (p: P) => (
  <svg {...base} {...p}><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" /></svg>
);
export const Users = (p: P) => (
  <svg {...base} {...p}><circle cx="9" cy="8" r="3.2" /><path d="M3.5 20a5.5 5.5 0 0 1 11 0" /><path d="M16 5.2a3.2 3.2 0 0 1 0 6.1" /><path d="M17 14.5A5.5 5.5 0 0 1 20.5 20" /></svg>
);
export const Upload = (p: P) => (
  <svg {...base} {...p}><path d="M12 15V4" /><path d="m8 8 4-4 4 4" /><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" /></svg>
);
export const Bell = (p: P) => (
  <svg {...base} {...p}><path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6" /><path d="M10 20a2 2 0 0 0 4 0" /></svg>
);
export const Check = (p: P) => (
  <svg {...base} {...p}><path d="m5 12 5 5 9-11" /></svg>
);
export const CheckCircle = (p: P) => (
  <svg {...base} {...p}><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></svg>
);
export const AlertTriangle = (p: P) => (
  <svg {...base} {...p}><path d="M12 4 2.5 20h19z" /><path d="M12 10v5M12 18h.01" /></svg>
);
export const Clock = (p: P) => (
  <svg {...base} {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
);
export const WifiOff = (p: P) => (
  <svg {...base} {...p}><path d="m2 4 20 20" /><path d="M8.5 12.5a5 5 0 0 1 7 0" /><path d="M5 9a10 10 0 0 1 4-2.3M19 9a10 10 0 0 0-6-2.9" /><path d="M12 20h.01" /></svg>
);
// Chevron pointing to the "next/back" — in RTL the inline start is on the right.
export const ChevronEnd = (p: P) => (
  // points toward the end (left in RTL)
  <svg {...base} {...p}><path d="m14 6-6 6 6 6" /></svg>
);
export const Plus = (p: P) => (
  <svg {...base} {...p}><path d="M12 5v14M5 12h14" /></svg>
);
export const Search = (p: P) => (
  <svg {...base} {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
);
export const Copy = (p: P) => (
  <svg {...base} {...p}><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h8" /></svg>
);
export const X = (p: P) => (
  <svg {...base} {...p}><path d="M6 6l12 12M18 6 6 18" /></svg>
);
export const Key = (p: P) => (
  <svg {...base} {...p}><circle cx="8" cy="15" r="4" /><path d="m11 12 8-8 2 2M16 6l2 2" /></svg>
);
export const GraduationCap = (p: P) => (
  <svg {...base} {...p}><path d="m3 9 9-4 9 4-9 4z" /><path d="M7 11v4c0 1 2 2 5 2s5-1 5-2v-4" /><path d="M21 9v4" /></svg>
);
