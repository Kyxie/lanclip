import { cn } from '@/lib/utils'
import { TextareaHTMLAttributes, forwardRef } from 'react'

const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        'w-full resize-none rounded border border-stripe-border bg-white px-3 py-2.5 text-sm text-stripe-text placeholder:text-stripe-muted focus:outline-none focus:ring-2 focus:ring-stripe-blue focus:border-transparent transition-shadow',
        className,
      )}
      {...props}
    />
  )
})
Textarea.displayName = 'Textarea'

export { Textarea }
