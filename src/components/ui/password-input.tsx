import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

import { Input } from './input'
import { cn } from '@/lib/utils'
import type { Input as InputPrimitive } from '@base-ui/react/input'

function PasswordInput({ className, ...props }: InputPrimitive.Props) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <Input
        type={visible ? 'text' : 'password'}
        className={cn('pe-9', className)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        // end-2 resolves to the trailing edge (left in our RTL layout)
        // rather than a hardcoded side, so this stays correct if this
        // component is ever reused in an LTR context too.
        className="absolute end-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        aria-label={visible ? 'إخفاء الرمز السري' : 'إظهار الرمز السري'}
        tabIndex={-1}
      >
        {visible ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  )
}

export { PasswordInput }
