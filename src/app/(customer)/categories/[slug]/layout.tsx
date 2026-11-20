import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Products — K DEALS',
  description: 'Shop electronics and gadgets at K DEALS Kuwait',
};

export default function CategoryLayout({ children }: { children: ReactNode }) {
  return children;
}
