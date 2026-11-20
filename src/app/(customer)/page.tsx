'use client';

import { useI18n } from '@/lib/i18n';
import { useStorefrontData } from '@/context/StorefrontDataContext';
import { AnnouncementBar } from '@/ui/homepage/AnnouncementBar';
import { CategoryGrid } from '@/ui/homepage/CategoryGrid';
import { HeroSection } from '@/ui/homepage/HeroSection';
import { FlashSale } from '@/ui/homepage/FlashSale';
import { BestSellers } from '@/ui/homepage/BestSellers';
import { Trending } from '@/ui/homepage/Trending';
import { NewArrivals } from '@/ui/homepage/NewArrivals';
import { Electronics } from '@/ui/homepage/Electronics';
import { PromoBanners } from '@/ui/homepage/PromoBanners';
import type { ReactNode } from 'react';

export default function HomePage() {
  const { locale, t } = useI18n();
  const store = useStorefrontData();
  const products = store.products
    .filter((product) => product.active)
    .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
  const categories = store.categories
    .filter((category) => category.active && category.showOnHomepage)
    .sort((a, b) => a.displayOrder - b.displayOrder);
  const flashSaleProducts = products.filter((product) => product.flashSale ?? product.discountPercent > 0).slice(0, 5);
  const bestSellerProducts = products.filter((product) => product.isBestseller).slice(0, 5);
  const newArrivalProducts = products.filter((product) => product.isNew).slice(0, 5);
  const electronicsShowcase = products.filter((product) => product.trending ?? product.featured ?? product.isBestseller).slice(0, 5);
  const activeBanner = [...store.banners].filter((banner) => banner.enabled).sort((a, b) => a.displayOrder - b.displayOrder)[0];
  const sections = [...store.homepageSections].filter((section) => section.visible).sort((a, b) => a.displayOrder - b.displayOrder);
  const selected = (ids: string[] | undefined, fallback: typeof products) => ids?.length ? products.filter((product) => ids.includes(product.id)) : fallback;
  const renderSection = (id: string, productIds?: string[], maxProducts?: number, titleEn?: string, titleAr?: string, subtitleEn?: string, subtitleAr?: string, theme?: string) => {
    const limited = (items: typeof products) => maxProducts ? items.slice(0, maxProducts) : items;
    const managedHeader = (fallback: ReactNode) => (titleEn || titleAr || subtitleEn || subtitleAr) ? <div className={`container pt-6 ${theme === 'purple' ? 'text-purple-800' : theme === 'orange' ? 'text-orange-800' : theme === 'yellow' ? 'text-amber-800' : 'text-slate-900'}`}><h2 className="text-2xl font-extrabold">{locale === 'ar' ? titleAr || titleEn : titleEn || titleAr}</h2>{(subtitleEn || subtitleAr) && <p className="mt-1 text-sm text-slate-600">{locale === 'ar' ? subtitleAr || subtitleEn : subtitleEn || subtitleAr}</p>}{fallback}</div> : fallback;
    const themeClass = theme === 'purple' ? 'bg-purple-50/80' : theme === 'orange' ? 'bg-orange-50/80' : theme === 'yellow' ? 'bg-amber-50/80' : '';
    const themed = (content: ReactNode) => <section className={themeClass}>{managedHeader(content)}</section>;
    switch (id) {
      case 'categories': return <div key={id}>{themed(<CategoryGrid categories={categories} locale={locale} />)}</div>;
      case 'flash-sale': return <div key={id}>{themed(<FlashSale t={t} products={limited(selected(productIds, flashSaleProducts))} />)}</div>;
      case 'best-sellers': return <div key={id}>{themed(<BestSellers t={t} products={limited(selected(productIds, bestSellerProducts))} />)}</div>;
      case 'trending': return <div key={id}>{themed(<Trending t={t} products={limited(selected(productIds, electronicsShowcase))} />)}</div>;
      case 'new-arrivals': return <div key={id}>{themed(<NewArrivals t={t} products={limited(selected(productIds, newArrivalProducts))} />)}</div>;
      case 'electronics': return <div key={id}>{themed(<Electronics t={t} products={limited(selected(productIds, electronicsShowcase))} />)}</div>;
      case 'promotions': return <PromoBanners key={id} t={t} locale={locale} promotions={store.banners.filter((banner) => banner.enabled).slice(1)} />;
      default: return null;
    }
  };

  return (
    <>
      <AnnouncementBar t={t} />
      <HeroSection t={t} locale={locale} banner={activeBanner} />
      {sections.map((section) => renderSection(section.id, section.productIds, section.maxProducts, section.titleEn, section.titleAr, section.subtitleEn, section.subtitleAr, section.theme))}
    </>
  );
}
