'use client';

import { Filter, SlidersHorizontal, X } from 'lucide-react';
import { useState } from 'react';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { useI18n } from '@/lib/i18n';
import { useStorefrontData } from '@/context/StorefrontDataContext';
import { ProductCard } from '@/ui/products/ProductCard';

export default function ProductsPage() {
  const { locale } = useI18n();
  const { add } = useCart();
  const { toggle } = useWishlist();
  const store = useStorefrontData();
  const [category, setCategory] = useState('all');
  const [sortBy, setSortBy] = useState('featured');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const ar = locale === 'ar';
  const text = ar
    ? { title: 'اكتشف جميع العروض', subtitle: 'تصفح الإلكترونيات والأدوات المختارة لك.', category: 'الفئة', sort: 'الترتيب', min: 'أقل سعر (د.ك)', max: 'أعلى سعر (د.ك)', clear: 'مسح الفلاتر', all: 'كل الفئات', results: 'منتجاً متاحاً', filters: 'الفلاتر', price: 'السعر' }
    : { title: 'Explore All Deals', subtitle: 'Browse electronics and gadgets selected for you.', category: 'Category', sort: 'Sort by', min: 'Min price (KWD)', max: 'Max price (KWD)', clear: 'Clear filters', all: 'All categories', results: 'products available', filters: 'Filters', price: 'Price' };
  const min = Number(minPrice) || 0;
  const max = Number(maxPrice) || Infinity;
  const categories = store.categories.filter((item) => item.active).sort((a, b) => a.displayOrder - b.displayOrder);
  const products = store.products
    .filter((product) => product.active)
    .filter((product) => (category === 'all' || product.categoryId === category) && product.price >= min && product.price <= max)
    .sort((a, b) => sortBy === 'price_low_to_high' ? a.price - b.price : sortBy === 'price_high_to_low' ? b.price - a.price : sortBy === 'newest' ? Number(b.isNew) - Number(a.isNew) : sortBy === 'best_selling' ? Number(b.isBestseller) - Number(a.isBestseller) : (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
  const clearFilters = () => { setCategory('all'); setSortBy('featured'); setMinPrice(''); setMaxPrice(''); };
  const selectedCategory = categories.find((item) => item.id === category);
  const hasFilters = category !== 'all' || minPrice || maxPrice || sortBy !== 'featured';

  return (
    <main className="bg-slate-50 py-5 sm:py-10">
      <div className="container">
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-700 via-purple-600 to-orange-500 px-5 py-6 text-white shadow-lg sm:rounded-3xl sm:px-10 sm:py-10">
          <div className="absolute -end-10 -top-12 h-36 w-36 rounded-full bg-yellow-300/30 blur-2xl" />
          <div className="relative max-w-2xl"><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-yellow-100">K DEALS</p><h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-5xl">{text.title}</h1><p className="mt-2 text-sm leading-6 text-white/90 sm:mt-3 sm:text-base">{text.subtitle}</p></div>
        </section>

        <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:mt-6 sm:p-5">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setFiltersOpen((open) => !open)} aria-expanded={filtersOpen} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-purple-200 bg-purple-50 px-3 text-sm font-bold text-purple-700 sm:flex-none"><Filter aria-hidden="true" className="h-4 w-4" />{text.filters}</button>
            <label className="relative min-w-0 flex-1"><span className="sr-only">{text.sort}</span><SlidersHorizontal aria-hidden="true" className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 ps-9 pe-3 text-sm font-semibold text-slate-700 outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"><option value="featured">{ar ? 'مميز' : 'Featured'}</option><option value="price_low_to_high">{ar ? 'السعر: الأقل أولاً' : 'Price: Low to High'}</option><option value="price_high_to_low">{ar ? 'السعر: الأعلى أولاً' : 'Price: High to Low'}</option><option value="newest">{ar ? 'الأحدث' : 'Newest'}</option><option value="best_selling">{ar ? 'الأكثر مبيعاً' : 'Best Selling'}</option></select></label>
          </div>
          {filtersOpen && <div className="mt-3 grid gap-3 border-t border-slate-100 pt-3 sm:grid-cols-3">
            <label className="block text-xs font-bold text-slate-600">{text.category}<select value={category} onChange={(event) => setCategory(event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"><option value="all">{text.all}</option>{categories.map((item) => <option key={item.id} value={item.id}>{ar ? item.titleAr : item.titleEn}</option>)}</select></label>
            <label className="block text-xs font-bold text-slate-600">{text.min}<input type="number" min="0" inputMode="decimal" value={minPrice} onChange={(event) => setMinPrice(event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100" /></label>
            <label className="block text-xs font-bold text-slate-600">{text.max}<input type="number" min="0" inputMode="decimal" value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100" /></label>
          </div>}
          {hasFilters && <div className="mt-3 flex flex-wrap items-center gap-2">{selectedCategory && <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-bold text-purple-700">{ar ? selectedCategory.titleAr : selectedCategory.titleEn}</span>}{(minPrice || maxPrice) && <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700">{text.price}: {minPrice || '0'}–{maxPrice || '∞'} KWD</span>}<button type="button" onClick={clearFilters} className="inline-flex min-h-8 items-center gap-1 rounded-full px-2 text-xs font-bold text-slate-600 hover:bg-slate-100"><X aria-hidden="true" className="h-3.5 w-3.5" />{text.clear}</button></div>}
        </section>

        <div className="mt-5 flex items-center justify-between gap-3"><p className="text-sm font-medium text-slate-600"><span className="text-xl font-extrabold text-slate-900">{products.length}</span> {text.results}</p>{hasFilters && <button type="button" onClick={clearFilters} className="text-xs font-bold text-purple-700 sm:hidden">{text.clear}</button>}</div>
        {products.length > 0 ? <div className="mt-3 grid grid-cols-2 gap-3 sm:mt-4 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">{products.map((product) => <ProductCard key={product.id} image={product.image} name={ar ? product.nameAr : product.nameEn} nameAr={product.nameAr} productId={product.id} originalPrice={product.originalPrice} price={product.price} discountPercent={product.discountPercent} isBestseller={product.isBestseller} isNew={product.isNew} badgeLabel={product.badgeLabel} href={`/products/${product.id}`} onWishlist={() => toggle(product.id)} onAddToCart={() => add({ productId: product.id, name: product.nameEn, nameAr: product.nameAr, price: product.price, quantity: 1, image: product.image })} />)}</div> : <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center text-sm text-slate-600">{ar ? 'لا توجد منتجات تطابق هذه الفلاتر.' : 'No products match these filters.'}</div>}
      </div>
    </main>
  );
}
