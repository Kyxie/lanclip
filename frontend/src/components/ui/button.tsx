import { cn } from '@/lib/utils'
import { ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost'
  size?: 'sm' | 'md'
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-1.5 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stripe-blue disabled:pointer-events-none disabled:opacity-40',
          {
            'bg-stripe-text text-white hover:bg-[#2d3352] active:bg-[#1a1f36]':
              variant === 'primary',
            'border border-stripe-border bg-white text-stripe-text hover:bg-stripe-bg active:bg-[#eef2f7]':
              variant === 'outline',
            'text-stripe-muted hover:text-stripe-text hover:bg-stripe-bg':
              variant === 'ghost',
          },
          {
            'h-8 px-3 text-[13px] rounded': size === 'sm',
            'h-9 px-4 text-sm rounded': size === 'md',
          },
          className,
        )}
        {...props}
      />
    )
  },
)
Button.displayName = 'Button'

export { Button }
