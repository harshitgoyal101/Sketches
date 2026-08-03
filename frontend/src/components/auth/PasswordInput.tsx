import { useState, type ComponentPropsWithoutRef } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

const defaultInputClass =
  'w-full rounded-btn border border-border bg-surface py-2.5 pl-3 pr-11 text-sm text-foreground outline-none focus:border-primary'

type PasswordInputProps = Omit<
  ComponentPropsWithoutRef<'input'>,
  'type' | 'className'
> & {
  className?: string
}

export function PasswordInput({ className, id, ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <input
        {...props}
        id={id}
        type={visible ? 'text' : 'password'}
        className={cn(defaultInputClass, className)}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute inset-y-0 right-0 inline-flex w-11 cursor-pointer items-center justify-center text-muted hover:text-foreground"
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        tabIndex={-1}
      >
        {visible ? (
          <EyeOff size={16} strokeWidth={2} aria-hidden />
        ) : (
          <Eye size={16} strokeWidth={2} aria-hidden />
        )}
      </button>
    </div>
  )
}
