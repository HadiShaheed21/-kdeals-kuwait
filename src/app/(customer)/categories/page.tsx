
'use client';

import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { useStorefrontData } from '@/context/StorefrontDataContext';
import { CategoryCard } from '@/ui/primitives/CategoryCard';

export default function CategoriesPage() {
  const { t, locale } = useI18n();
  const { categories } = useStorefrontData();
  const visibleCategories = categories.filter((category) => category.active).sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <div className="container py-8">
      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900">{t('products.categories')}</h1>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {visibleCategories.map((category) => (
          <Link key={category.id} href={`/categories/${category.id}`} className="block">
            <CategoryCard
              image={category.image}
              title={locale === 'ar' ? category.titleAr : category.titleEn}
              badge={category.badge}
            />
          </Link>
        ))}
      </div>
    </div>
  );
}
