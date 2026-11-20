'use client';

import { useState } from 'react';
import { useCart } from '@/context/CartContext';
import { useStorefrontData } from '@/context/StorefrontDataContext';
import { useWishlist } from '@/context/WishlistContext';
import { useI18n } from '@/lib/i18n';
import { ProductCard } from '@/ui/products/ProductCard';

type SortOption = 'featured' | 'price_low_to_high' | 'price_high_to_low' | 'newest' | 'best_selling';

export default function CategoryPageClient({ slug }: { slug: string }) {
  const { t, locale } = useI18n();
  const { add } = useCart();
  const { toggle } = useWishlist();
  const { products, categories } = useStorefrontData();
  const [sortBy, setSortBy] = useState<SortOption>('featured');
  const category = categories.find((item) => item.id === slug && item.active);
  const categoryProducts = products
    .filter((product) => product.active && product.categoryId === slug)
    .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
  const sortedProducts = [...categoryProducts];

  switch (sortBy) {
    case 'price_low_to_high': sortedProducts.sort((a, b) => a.price - b.price); break;
    case 'price_high_to_low': sortedProducts.sort((a, b) => b.price - a.price); break;
    case 'newest': sortedProducts.sort((a, b) => Number(b.isNew) - Number(a.isNew)); break;
    case 'best_selling': sortedProducts.sort((a, b) => Number(b.isBestseller) - Number(a.isBestseller)); break;
  }

  const categoryName = category ? (locale === 'ar' ? category.titleAr : category.titleEn) : t('products.categories');

  return (
    <div className="container py-8">
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <h1 className="text-2xl font-extrabold text-slate-900 lg:text-3xl">{categoryName}</h1>
        <span className="text-sm text-slate-500">{categoryProducts.length} products</span>
      </div>
      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
        <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="category-sort">Sort by</label>
        <select id="category-sort" className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500" value={sortBy} onChange={(event) => setSortBy(event.target.value as SortOption)}>
          <option value="featured">Featured</option><option value="price_low_to_high">Price: Low to High</option><option value="price_high_to_low">Price: High to Low</option><option value="newest">Newest</option><option value="best_selling">Best Selling</option>
        </select>
      </div>
      {!category ? <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center text-slate-600">This category is unavailable.</div> : categoryProducts.length === 0 ? <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center text-slate-600">No products are available in this category yet.</div> : <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {sortedProducts.map((product) => <ProductCard key={product.id} productId={product.id} image={product.image} name={locale === 'ar' ? product.nameAr : product.nameEn} nameAr={product.nameAr} originalPrice={product.originalPrice} price={product.price} discountPercent={product.discountPercent} isBestseller={product.isBestseller} isNew={product.isNew} badgeLabel={product.badgeLabel} href={`/products/${product.slug}`} onAddToCart={() => add({ productId: product.id, name: product.nameEn, nameAr: product.nameAr, price: product.price, quantity: 1, image: product.image })} onWishlist={() => toggle(product.id)} />)}
      </div>}
    </div>
  );
}
