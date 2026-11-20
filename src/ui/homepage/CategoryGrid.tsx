import { Camera, Gamepad2, Headphones, House, Laptop, Monitor, Package, Smartphone, Watch } from 'lucide-react';
import Link from 'next/link';
import type { ComponentType } from 'react';

interface CategoryGridProps { categories: { id: string; titleEn: string; titleAr: string; image: string; badge?: string }[]; locale: 'en' | 'ar'; }

const categoryIcons: Record<string, ComponentType<{ className?: string; strokeWidth?: number }>> = {
  mobiles: Smartphone,
  laptops: Laptop,
  gadgets: Camera,
  bags: Package,
  smartwatches: Watch,
  headphones: Headphones,
  accessories: Monitor,
  gaming: Gamepad2,
  'home-electronics': House,
};

export function CategoryGrid({ categories, locale }: CategoryGridProps) {
  const isArabic = locale === 'ar';

  return (
    <section className="bg-slate-50 py-7 sm:py-12">
      <div className="container">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-2 sm:mb-7">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-orange-600 sm:text-sm">{isArabic ? 'تسوّق بسهولة' : 'Browse with ease'}</p>
            <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{isArabic ? 'تسوّق حسب الفئة' : 'Shop by category'}</h2>
          </div>
          <p className="max-w-xs text-xs leading-5 text-slate-500 sm:text-sm">{isArabic ? 'اكتشف الأجهزة والاحتياجات اليومية في مكان واحد.' : 'Discover devices and essentials in one place.'}</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
          {categories.map((category, index) => {
            const Icon = categoryIcons[category.id] ?? Package;
            const tones = [
              'from-purple-50 to-violet-100 border-purple-100 text-purple-700',
              'from-orange-50 to-amber-100 border-orange-100 text-orange-700',
              'from-sky-50 to-indigo-100 border-sky-100 text-indigo-700',
            ];
            return (
              <Link key={category.id} href={`/${locale}/categories/${category.id}`} className={`group relative min-h-36 overflow-hidden rounded-2xl border bg-gradient-to-br p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600 sm:min-h-40 ${tones[index % tones.length]}`}>
                <div className="absolute -end-5 -top-5 h-20 w-20 rounded-full bg-white/50" />
                <Icon aria-hidden="true" className="absolute end-3 top-3 h-11 w-11 opacity-80 transition duration-200 group-hover:scale-110 sm:h-14 sm:w-14" strokeWidth={1.5} />
                <div className="relative flex h-full flex-col justify-end">
                  {category.badge && <span className="mb-2 w-fit rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-extrabold text-slate-600">{category.badge}</span>}
                  <h3 className="max-w-[70%] text-sm font-extrabold leading-5 text-slate-900 sm:text-base">{isArabic ? category.titleAr : category.titleEn}</h3>
                  <p className="mt-0.5 text-[11px] font-medium text-slate-500">{isArabic ? category.titleEn : category.titleAr}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
