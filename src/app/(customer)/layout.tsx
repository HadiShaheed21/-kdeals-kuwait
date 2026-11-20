import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { cookies, headers } from 'next/headers';
import { I18nProvider } from '@/lib/i18n';
import { Navbar } from '@/ui/common/Navbar';
import { Footer } from '@/ui/common/Footer';
import { CartProvider } from '@/context/CartContext';
import { WishlistProvider } from '@/context/WishlistContext';
import { StorefrontDataProvider } from '@/context/StorefrontDataContext';
import { createSeedStore } from '@/lib/admin-repository';
import { isSupabaseStorefrontEnabled } from '@/lib/storefront-data-source';
import { mapCmsSnapshotToLocalShape } from '@/lib/supabase/cms/mappers';
import { readPublicCmsSnapshot } from '@/lib/supabase/cms/repository';

export const instant = false;

export const metadata: Metadata = {
  title: 'K DEALS — Electronics & Gadgets Marketplace Kuwait',
  description:
    'Shop colourful electronics and general gadgets in Kuwait. Fast, secure, and promotional.',
  icons: [
    {
      rel: 'icon',
      type: 'image/png',
      sizes: 'any',
      url: '/images/kdeals-logo.png',
    },
    {
      rel: 'apple-touch-icon',
      type: 'image/png',
      url: '/images/kdeals-logo.png',
    },
  ],
};

export default async function CustomerLayout({
  children,
}: {
  children: ReactNode;
}) {
  const cookieStore = await cookies();
  const requestHeaders = await headers();
  const headerLocale = requestHeaders.get('x-kdeals-locale');
  const locale = (headerLocale === 'en' || headerLocale === 'ar'
    ? headerLocale
    : cookieStore.get('locale')?.value) as 'en' | 'ar' | undefined || 'en';
  let initialStore = createSeedStore();
  let storefrontSource: 'local' | 'supabase' = 'local';
  if (isSupabaseStorefrontEnabled()) {
    try {
      initialStore = mapCmsSnapshotToLocalShape(await readPublicCmsSnapshot());
      storefrontSource = 'supabase';
    } catch {
      // Fail closed to the established local CMS rather than exposing a partial
      // remote catalog or breaking customer navigation during a rollout.
    }
  }

  return (
    <CartProvider>
      <WishlistProvider>
        <StorefrontDataProvider initialStore={initialStore} source={storefrontSource}>
        <I18nProvider locale={locale}>
          <div className="min-h-full flex flex-col bg-white text-slate-900">
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </I18nProvider>
        </StorefrontDataProvider>
      </WishlistProvider>
    </CartProvider>
  );
}
