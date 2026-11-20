import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const instant = false;

export const metadata: Metadata = {
  title: 'Search — K DEALS',
  description: 'Search for electronics and gadgets in Kuwait',
};

export default function SearchLayout({ children }: { children: ReactNode }) {
  return children;
}
