'use client';

import { MessageCircle, Truck } from 'lucide-react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { useStorefrontData } from '@/context/StorefrontDataContext';

export function Footer() {
  const { t, locale } = useI18n();
  const store = useStorefrontData();
  const categoryLinks = store.categories.filter((category) => category.active && category.showInNavigation).sort((a, b) => a.displayOrder - b.displayOrder).slice(0, 6);

  return (
    <footer className="mt-8 bg-slate-900 text-white sm:mt-12">
      <div className="container py-8 sm:py-10">
        <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          <section><p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-300">{store.storeSettings.displayName}</p><h2 className="mt-2 text-lg font-extrabold">About {store.storeSettings.displayName}</h2><p className="mt-2 text-sm leading-6 text-slate-400">{t('footer.about_text')}</p></section>
          <section><h2 className="text-base font-extrabold">Customer support</h2><p className="mt-2 text-sm leading-6 text-slate-400">{store.storeSettings.contactEmail || store.storeSettings.contactPhone || t('footer.contact_text')}</p><a href={`https://wa.me/${store.whatsappNumber}`} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl bg-emerald-500 px-3 text-sm font-bold text-white transition hover:bg-emerald-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"><MessageCircle aria-hidden="true" className="h-4 w-4" />{t('common.whatsapp')}</a></section>
          <section><h2 className="text-base font-extrabold">Categories</h2><ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 text-sm text-slate-400 sm:block sm:space-y-2">{categoryLinks.map((category) => <li key={category.id}><Link href={`/${locale}${category.navDestination || `/categories/${category.id}`}`} className="transition hover:text-white">{locale === 'ar' ? category.navLabelAr || category.titleAr : category.navLabelEn || category.titleEn}</Link></li>)}</ul></section>
          <section><div className="flex items-center gap-2"><Truck aria-hidden="true" className="h-5 w-5 text-orange-300" /><h2 className="text-base font-extrabold">Delivery</h2></div><p className="mt-2 text-sm leading-6 text-slate-400">{(locale === 'ar' ? store.storeSettings.deliveryMessageAr : store.storeSettings.deliveryMessageEn) || store.storeSettings.deliveryInfo || t('footer.delivery_text')}</p></section>
        </div>
        <div className="mt-7 border-t border-slate-800 pt-5 text-center text-xs text-slate-500 sm:mt-8">{t('footer.copyright')}</div>
      </div>
    </footer>
  );
}
