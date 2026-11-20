import { type ReactNode } from 'react';

interface ContainerProps {
  children: ReactNode;
  className?: string;
  maxWidth?: string;
}

export function Container({
  children,
  className = '',
  maxWidth = '1280px',
}: ContainerProps) {
  return (
    <div
      className={`mx-auto w-full px-4 sm:px-6 lg:px-8 max-w-[${maxWidth}] ${className}`}
    >
      {children}
    </div>
  );
}
