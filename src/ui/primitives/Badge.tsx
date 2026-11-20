import { type ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?:
    | 'sale'
    | 'new'
    | 'bestseller'
    | 'trending'
    | 'primary'
    | 'secondary'
    | 'success'
    | 'outline';
  className?: string;
}

export function Badge({
  children,
  variant = 'primary',
  className = '',
}: BadgeProps) {
  const variantClasses = {
    sale: 'bg-red-500/10 text-red-600 border-red-500/30',
    new: 'bg-yellow-400/15 text-yellow-600 border-yellow-500/30',
    bestseller: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
    trending: 'bg-green-500/10 text-green-600 border-green-500/30',
    primary:
      'bg-orange-500/10 text-orange-600 border-orange-500/30',
    secondary:
      'bg-purple-500/10 text-purple-600 border-purple-500/30',
    success:
      'bg-green-500/10 text-green-600 border-green-500/30',
    outline:
      'bg-transparent text-muted-foreground border-border',
  };

  return (
    <span
      className={`
        inline-flex items-center gap-1 px-2.5 py-1 rounded-full
        text-xs font-semibold uppercase tracking-wide
        border
        ${variantClasses[variant]}
        ${className}
      `}
    >
      {children}
    </span>
  );
}
