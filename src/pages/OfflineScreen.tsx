import { WifiOff } from '@/components/icons'
import { BrandLockup } from '@/components/brand'
import { Button } from '@/components/ui/button'

export function OfflineScreen() {
  return (
    <div className="min-h-dvh page-tint flex flex-col items-center justify-center px-8 text-center">
      <div className="mb-5">
        <BrandLockup size={56} />
      </div>
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-primary-soft mb-4 ring-1 ring-[rgba(197,154,46,0.3)]">
        <WifiOff width={30} height={30} />
      </div>
      <h2 className="font-display text-lg font-bold">لا يوجد اتصال بالإنترنت</h2>
      <p className="mt-2 text-sm text-muted-foreground max-w-[300px] leading-relaxed">
        سيتم عرض المحتوى المحفوظ عند توفره. ستُحدَّث البيانات تلقائيًا فور عودة الاتصال — لا
        داعي للقلق.
      </p>
      <Button variant="outline" className="mt-6" onClick={() => window.location.reload()}>
        إعادة المحاولة
      </Button>
    </div>
  )
}
