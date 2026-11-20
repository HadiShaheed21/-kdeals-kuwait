'use client';
import { useI18n } from '@/lib/i18n';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';

interface HeaderProps {
  t: (path: string) => string;
}

export function Header({ t }: HeaderProps) {
  const { locale } = useI18n();
  const { count: cartCount } = useCart();
  const { count: wishlistCount } = useWishlist();
  const router = useRouter();

  const switchLocale = (nextLocale: 'en' | 'ar') => {
    const currentPath = window.location.pathname;
    const pathParts = currentPath.split('/').filter(Boolean);
    const newPath = `/${nextLocale}${pathParts.slice(1).join('/')}`;
    router.push(newPath);
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="container h-16 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          {/* Official K DEALS logo */}
          <div className="relative h-10 w-40 md:h-12 md:w-48 overflow-hidden rounded-lg">
            <Image
              src="/images/kdeals-logo.png"
              alt="K DEALS"
              fill
              sizes="(max-width: 768px) 100px, 150px"
              className="object-contain"
              loading="eager"
              priority
            />
          </div>
          <span className="hidden sm:inline text-sm text-slate-500">— Kuwait</span>
        </div>

        <div className="hidden sm:flex flex-1 max-w-xl mx-4 relative">
          <input
            type="text"
            placeholder={t('navbar.search_placeholder')}
            className="w-full px-4 py-2 rounded-full border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
          <button className="absolute right-2 top-1/2 -translate-y-1/2 px-2 text-slate-400 hover:text-slate-600" aria-label={t('common.search')}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => switchLocale(locale === 'en' ? 'ar' : 'en')}
            className="px-3 py-1.5 rounded-full text-sm font-medium bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            {locale === 'en' ? 'العربية' : 'English'}
          </button>
          <button
            className="relative p-2 rounded-full hover:bg-slate-100 transition-colors"
            aria-label={t('common.wishlist')}
          >
            <span className="text-xl">⭐</span>
            {wishlistCount > 0 && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 text-white text-xs rounded-full flex items-center justify-center">
                {wishlistCount}
              </span>
            )}
          </button>
          <button
            className="relative p-2 rounded-full hover:bg-slate-100 transition-colors"
            aria-label={t('common.cart')}
          >
            <span className="text-xl">🛒</span>
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 text-white text-xs rounded-full flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>
          <button className="text-sm font-semibold text-orange-600 hover:bg-orange-50 hover:text-orange-700 px-3 py-1.5 rounded-full transition-colors">
            <span className="flex items-center gap-1.5">
              <span className="text-lg">💬</span>
              <span className="hidden xs:inline">WhatsApp</span>
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
