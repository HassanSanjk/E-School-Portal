import { Logo } from '@/components/brand'
import { SCHOOL_NAME_FULL } from '@/lib/constants'

export function SplashScreen() {
  return (
    <div className="min-h-dvh brand-gradient grain flex flex-col items-center justify-center text-primary-foreground px-6 text-center">
      <div className="relative z-10 flex flex-col items-center">
        <Logo size={112} className="drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)]" />
        <div className="ornament mt-6 w-40 opacity-80" />
        <h1 className="font-display text-xl font-extrabold leading-snug max-w-[260px] mt-5">
          {SCHOOL_NAME_FULL}
        </h1>
        <div className="mt-8 flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-2.5 w-2.5 rounded-full bg-accent/90 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
