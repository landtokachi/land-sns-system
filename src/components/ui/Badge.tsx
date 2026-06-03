import { clsx } from 'clsx'

interface BadgeProps {
  label: string
  colorClass: string
  size?: 'sm' | 'md'
}

export function Badge({ label, colorClass, size = 'md' }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs',
        colorClass
      )}
    >
      {label}
    </span>
  )
}
