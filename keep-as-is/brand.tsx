// Official school logo (src/imports/image-2.png) with two treatments:
//  - <Logo> : gold shield knocked out over a dark purple ground (blend mode).
//  - <Crest>: the logo on a crafted dark plate with a gold hairline ring, for
//             placing the emblem on light surfaces.
import logoSrc from "../imports/image-2.png";
import { SCHOOL_NAME } from "../lib/mock";
import { cx } from "./ui";

/** Bare logo image; assumes it sits on a dark purple ground (blend removes black). */
export function Logo({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <img
      src={logoSrc}
      alt={SCHOOL_NAME}
      width={size}
      height={size}
      className={cx("logo-knockout object-contain select-none", className)}
      style={{ width: size, height: size }}
      draggable={false}
    />
  );
}

/** Logo on a dark crest plate with a gold ring — for light surfaces. */
export function Crest({ size = 64, className }: { size?: number; className?: string }) {
  return (
    <span
      className={cx(
        "brand-gradient gold-ring inline-flex items-center justify-center rounded-2xl shrink-0",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <Logo size={Math.round(size * 0.74)} />
    </span>
  );
}

/** Brand lockup: crest + school name, for headers and the login screen. */
export function BrandLockup({
  size = 56,
  onDark = false,
  align = "center",
}: {
  size?: number;
  onDark?: boolean;
  align?: "center" | "start";
}) {
  return (
    <div className={cx("flex items-center gap-3", align === "center" ? "flex-col text-center" : "flex-row text-start")}>
      {onDark ? <Logo size={size} /> : <Crest size={size} />}
      <div>
        <p className={cx("font-display font-extrabold leading-tight", onDark ? "text-white" : "text-primary", align === "center" ? "text-lg" : "text-base")}>
          مدرسة ابن الجراح
        </p>
        <p className={cx("text-xs", onDark ? "text-white/70" : "text-muted-foreground")}>
          الثانوية الخاصة بنات
        </p>
      </div>
    </div>
  );
}
