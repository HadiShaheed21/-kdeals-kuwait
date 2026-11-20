'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ManagedImage } from '@/ui/media/ManagedImage';

interface HeroSectionProps {
  t: (path: string) => string;
  locale: 'en' | 'ar';
  banner?: { titleEn: string; titleAr: string; subtitleEn: string; subtitleAr: string; ctaLabelEn: string; ctaLabelAr: string; destination: string; desktopImage: string; mobileImage: string };
}

export function HeroSection({ t, locale, banner }: HeroSectionProps) {
  const ar = locale === 'ar';
  const title = banner ? (ar ? banner.titleAr : banner.titleEn) : t('homepage.hero_title');
  const subtitle = banner ? (ar ? banner.subtitleAr : banner.subtitleEn) : t('homepage.hero_subtitle');
  const cta = banner ? (ar ? banner.ctaLabelAr : banner.ctaLabelEn) : t('homepage.hero_cta');
  const destination = banner?.destination || '/products';
  const [mobile, setMobile] = useState(false);
  useEffect(() => { const media = window.matchMedia('(max-width: 640px)'); const sync = () => setMobile(media.matches); sync(); media.addEventListener('change', sync); return () => media.removeEventListener('change', sync); }, []);
  const image = mobile ? banner?.mobileImage || banner?.desktopImage || '/images/kdeals-hero-electronics.png' : banner?.desktopImage || '/images/kdeals-hero-electronics.png';
  return (
    <section className="bg-slate-50 pb-6 pt-4 sm:pb-10 sm:pt-7">
      <div className="container">
        <div className="relative isolate min-h-[338px] overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-[#35106f] via-[#6d28d9] to-[#f97316] shadow-[0_20px_45px_-24px_rgba(76,29,149,.75)] sm:min-h-[390px] sm:rounded-[2rem] lg:min-h-[420px]">
          <div className="absolute inset-y-0 end-0 w-[72%] opacity-90 sm:w-[62%]">
            <ManagedImage src={image} alt={title} fill sizes="(max-width: 640px) 82vw, (max-width: 1024px) 65vw, 760px" className="object-cover object-[72%_center]" />
          </div>
          <div className="absolute inset-0 bg-[linear-gradient(90deg,#35106f_0%,#4c1d95_39%,rgba(91,33,182,.72)_54%,rgba(91,33,182,.05)_80%)] rtl:bg-[linear-gradient(270deg,#35106f_0%,#4c1d95_39%,rgba(91,33,182,.72)_54%,rgba(91,33,182,.05)_80%)]" />
          <div className="absolute -start-24 -top-28 h-72 w-72 rounded-full bg-fuchsia-400/20 blur-3xl" />
          <div className="relative z-10 flex min-h-[338px] max-w-xl flex-col justify-center px-5 py-8 sm:min-h-[390px] sm:px-10 sm:py-10 lg:min-h-[420px] lg:w-[48%] lg:px-14">
            <span className="w-fit rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-white/95 backdrop-blur">K DEALS Kuwait</span>
            <h1 className="mt-4 max-w-md text-3xl font-black leading-[1.02] tracking-tight text-white sm:text-5xl lg:text-[3.4rem]">{title}</h1>
            <p className="mt-3 max-w-sm text-sm leading-6 text-white/90 sm:mt-4 sm:text-base">{subtitle}</p>
            <div className="mt-5 flex flex-wrap gap-2.5 sm:mt-7 sm:gap-3">
              <Link href={`/${locale}${destination}`} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-white px-5 py-2.5 text-sm font-extrabold text-purple-800 shadow-lg transition hover:-translate-y-0.5 hover:bg-amber-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">{cta}</Link>
              <Link href={`/${locale}/products?category=mobiles`} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/40 bg-white/10 px-4 py-2.5 text-sm font-bold text-white backdrop-blur transition hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">{t('homepage.hero_see_all')}</Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
