'use client';

import { Heart, Search, ShoppingCart } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { useI18n } from '@/lib/i18n';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { FormEvent } from 'react';
import { useStorefrontData } from '@/context/StorefrontDataContext';

export function Navbar() {
  const { t, locale } = useI18n();
  const { count: cartCount } = useCart();
  const { count: wishlistCount } = useWishlist();
  const router = useRouter();
  const pathname = usePathname();
  const homeHref = `/${locale}`;
  const { categories } = useStorefrontData();
  const navigationCategories = categories.filter((category) => category.active && category.showInNavigation).sort((a, b) => a.displayOrder - b.displayOrder);

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const input = event.currentTarget.elements.namedItem('q') as HTMLInputElement;
    const query = input.value.trim();
    if (query) router.push(`/${locale}/search?q=${encodeURIComponent(query)}`);
  };

  const switchLocale = () => {
    const nextLocale = locale === 'en' ? 'ar' : 'en';
    const segments = pathname.split('/').filter(Boolean);
    const pathWithoutLocale = ['en', 'ar'].includes(segments[0]) ? segments.slice(1) : segments;
    router.push(`/${nextLocale}/${pathWithoutLocale.join('/')}`.replace(/\/$/, ''));
  };

  const iconButton = 'relative inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-700 transition hover:bg-purple-50 hover:text-purple-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600';

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
      <div className="container hidden h-[72px] items-center gap-5 md:flex">
        <Link href={homeHref} className="relative h-11 w-36 shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600">
          <Image src="/images/kdeals-logo.png" alt="K DEALS" fill sizes="144px" className="object-contain" priority />
        </Link>
        <span className="shrink-0 text-sm font-medium text-slate-500">— Kuwait</span>
        <form onSubmit={handleSearch} className="relative mx-auto w-full max-w-2xl">
          <label className="sr-only" htmlFor="desktop-search">{t('common.search')}</label>
          <input id="desktop-search" name="q" type="search" placeholder={t('navbar.search_placeholder')} className="h-11 w-full rounded-full border border-slate-200 bg-slate-50 px-5 pe-12 text-sm outline-none transition focus:border-purple-400 focus:bg-white focus:ring-4 focus:ring-purple-100" />
          <button type="submit" className="absolute inset-y-0 end-1.5 my-auto inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-purple-50 hover:text-purple-700" aria-label={t('common.search')}><Search size={19} strokeWidth={2} /></button>
        </form>
        <div className="flex shrink-0 items-center gap-1">
          <button type="button" onClick={switchLocale} className="h-10 rounded-full bg-slate-100 px-4 text-sm font-bold text-slate-700 transition hover:bg-purple-50 focus-visible:outline-2 focus-visible:outline-orange-600">{locale === 'en' ? 'العربية' : 'English'}</button>
          <Link href={`/${locale}/wishlist`} className={iconButton} aria-label={t('common.wishlist')}><Heart size={21} strokeWidth={2} />{wishlistCount > 0 && <CountBadge count={wishlistCount} />}</Link>
          <Link href={`/${locale}/cart`} className={iconButton} aria-label={t('common.cart')}><ShoppingCart size={21} strokeWidth={2} />{cartCount > 0 && <CountBadge count={cartCount} />}</Link>
        </div>
      </div>

      <div className="md:hidden">
        <div className="container flex h-16 items-center justify-between gap-2">
          <Link href={homeHref} className="relative h-10 w-28 shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600">
            <Image src="/images/kdeals-logo.png" alt="K DEALS" fill sizes="112px" className="object-contain" priority />
          </Link>
          <div className="flex shrink-0 items-center gap-0.5">
            <button type="button" onClick={switchLocale} className="inline-flex h-11 min-w-14 items-center justify-center rounded-xl bg-slate-100 px-2 text-xs font-bold text-slate-700 transition hover:bg-purple-50 focus-visible:outline-2 focus-visible:outline-orange-600">{locale === 'en' ? 'العربية' : 'EN'}</button>
            <Link href={`/${locale}/wishlist`} className={iconButton} aria-label={t('common.wishlist')}><Heart size={21} strokeWidth={2} />{wishlistCount > 0 && <CountBadge count={wishlistCount} />}</Link>
            <Link href={`/${locale}/cart`} className={iconButton} aria-label={t('common.cart')}><ShoppingCart size={21} strokeWidth={2} />{cartCount > 0 && <CountBadge count={cartCount} />}</Link>
          </div>
        </div>
        <form onSubmit={handleSearch} className="container pb-3">
          <label className="sr-only" htmlFor="mobile-search">{t('common.search')}</label>
          <div className="relative">
            <input id="mobile-search" name="q" type="search" placeholder={t('navbar.search_placeholder')} className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 pe-12 text-sm outline-none transition focus:border-purple-400 focus:bg-white focus:ring-4 focus:ring-purple-100" />
            <button type="submit" className="absolute inset-y-0 end-1 my-auto inline-flex h-10 w-10 items-center justify-center rounded-lg text-purple-700 hover:bg-purple-50" aria-label={t('common.search')}><Search size={20} strokeWidth={2} /></button>
          </div>
        </form>
        {navigationCategories.length > 0 && <nav aria-label="Product categories" className="container flex gap-2 overflow-x-auto pb-3">{navigationCategories.map((category) => <Link key={category.id} href={`/${locale}${category.navDestination || `/categories/${category.id}`}`} className="shrink-0 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-purple-50 hover:text-purple-700">{locale === 'ar' ? category.navLabelAr || category.titleAr : category.navLabelEn || category.titleEn}</Link>)}</nav>}
      </div>
      {navigationCategories.length > 0 && <nav aria-label="Product categories" className="hidden border-t border-slate-100 md:block"><div className="container flex h-10 items-center gap-5 overflow-x-auto">{navigationCategories.map((category) => <Link key={category.id} href={`/${locale}${category.navDestination || `/categories/${category.id}`}`} className="shrink-0 text-xs font-bold text-slate-600 hover:text-purple-700">{locale === 'ar' ? category.navLabelAr || category.titleAr : category.navLabelEn || category.titleEn}</Link>)}</div></nav>}
    </header>
  );
}

function CountBadge({ count }: { count: number }) {
  return <span className="absolute end-0.5 top-0.5 flex h-4 min-w-4 translate-x-1/4 -translate-y-1/4 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-extrabold leading-none text-white ring-2 ring-white">{count > 99 ? '99+' : count}</span>;
}
