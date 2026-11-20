import { type ReactNode } from 'react';

interface ButtonProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  className?: string;
  onClick?: () => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  onClick,
  type = 'button',
  disabled = false,
}: ButtonProps) {
  const variantClasses = {
    primary:
      'bg-orange-500 text-white hover:bg-orange-600 focus-visible:ring-orange-500',
    secondary:
      'bg-purple-500 text-white hover:bg-purple-600 focus-visible:ring-purple-500',
    outline:
      'border border-orange-500 text-orange-600 hover:bg-orange-500 hover:text-white focus-visible:ring-orange-500',
    ghost:
      'text-orange-600 hover:bg-orange-50 focus-visible:ring-orange-500',
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        inline-flex items-center justify-center gap-2 font-semibold
        rounded-xl transition-all duration-200 ease-out
        focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-bg
        disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
    >
      {children}
    </button>
  );
}
