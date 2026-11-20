import Image from 'next/image';
import Link from 'next/link';

interface PromoBannersProps {
  t: (path: string) => string;
  locale: 'en' | 'ar';
  promotions: { id: string; image?: string; desktopImage?: string; titleEn: string; titleAr?: string; subtitleEn: string; subtitleAr?: string; ctaLabelEn: string; ctaLabelAr?: string; destination?: string }[];
}

export function PromoBanners({ t, promotions, locale }: PromoBannersProps) {
  return (
    <section className="py-12">
      <div className="container">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {promotions.map((promo) => (
            <Link key={promo.id} href={`/${locale}${promo.destination || '/products'}`} className="relative block aspect-[4/3] rounded-2xl overflow-hidden group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600">
              <Image
                src={promo.desktopImage || promo.image || '/images/kdeals-hero-electronics.png'}
                alt={locale === 'ar' && promo.titleAr ? promo.titleAr : promo.titleEn}
                fill
                sizes="800px"
                className="object-cover group-hover:scale-110 transition-transform duration-500"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                <h3 className="text-lg font-bold">{locale === 'ar' && promo.titleAr ? promo.titleAr : promo.titleEn}</h3>
                <p className="text-sm opacity-90">{locale === 'ar' && promo.subtitleAr ? promo.subtitleAr : promo.subtitleEn || t('homepage.promo_subtitle')}</p>
                <span className="inline-flex mt-2 px-3 py-1.5 rounded-lg bg-white text-slate-900 text-sm font-semibold">{locale === 'ar' && promo.ctaLabelAr ? promo.ctaLabelAr : promo.ctaLabelEn || t('common.view_all')}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
