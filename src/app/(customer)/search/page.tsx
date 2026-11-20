'use client';

import { useI18n } from '@/lib/i18n';
import { ProductCard } from '@/ui/products/ProductCard';
import { Button } from '@/ui/primitives/Button';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { useStorefrontData } from '@/context/StorefrontDataContext';

export default function SearchPage() {
  const { t, locale } = useI18n();
  const store = useStorefrontData();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get('q')?.trim() || '';
  const categoryFilter = searchParams.get('category');
  const sortBy = searchParams.get('sort') || 'featured';
  const page = Number(searchParams.get('page')) || 1;
  const pageSize = 12;

  const { add } = useCart();
  const { toggle } = useWishlist();

  const updateSearchParams = (
    updates: Record<string, string | null>,
    resetPage = false,
  ) => {
    const params = new URLSearchParams(searchParams.toString());

    for (const [key, value] of Object.entries(updates)) {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    }

    if (resetPage) {
      params.delete('page');
    }

    const queryString = params.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname);
  };

  let results = store.products.filter((product) => product.active && [product.nameEn, product.nameAr, product.id].some((value) => value.toLowerCase().includes(query.toLowerCase())));

  if (categoryFilter) {
    const cats = store.categories.filter((category) => category.active).map((category) => category.id);
    if (cats.includes(categoryFilter)) {
      results = results.filter((p) => p.categoryId === categoryFilter);
    }
  }

  switch (sortBy) {
    case 'price_low_to_high':
      results.sort((a, b) => a.price - b.price);
      break;
    case 'price_high_to_low':
      results.sort((a, b) => b.price - a.price);
      break;
    case 'newest':
      results.sort((a, b) => Number(b.isNew) - Number(a.isNew));
      break;
    case 'best_selling':
      results.sort((a, b) => Number(b.isBestseller) - Number(a.isBestseller));
      break;
    default:
      results.sort((a, b) => Number(b.isBestseller) - Number(a.isBestseller));
  }

  const totalResults = results.length;
  const totalPages = Math.ceil(totalResults / pageSize);
  const paginatedResults = results.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="container py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900">
            {query ? `Results for "${query}"` : 'Products'}
          </h1>
        </div>
        {query && (
          <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-xl">
            <p className="text-sm text-orange-800">
              Searching: <strong>{query}</strong>
            </p>
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Filter by Category</label>
              <select
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500"
                value={categoryFilter || ''}
                onChange={(event) =>
                  updateSearchParams({ category: event.target.value || null }, true)
                }
              >
                <option value="">All Categories</option>
                {store.categories.filter((category) => category.active).sort((a, b) => a.displayOrder - b.displayOrder).map((category) => (
                  <option key={category.id} value={category.id}>{locale === 'ar' ? category.titleAr : category.titleEn}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Sort by</label>
              <select
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500"
                value={sortBy}
                onChange={(event) =>
                  updateSearchParams(
                    { sort: event.target.value === 'featured' ? null : event.target.value },
                    true,
                  )
                }
              >
                <option value="featured">Featured</option>
                <option value="price_low_to_high">Price: Low to High</option>
                <option value="price_high_to_low">Price: High to Low</option>
                <option value="newest">Newest</option>
                <option value="best_selling">Best Selling</option>
              </select>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <p className="text-sm text-slate-500">{t('products.results')} <span className="font-semibold text-slate-900">{totalResults}</span></p>
        </div>

        {paginatedResults.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {paginatedResults.map((product) => (
              <ProductCard
                key={product.id}
                image={product.image}
                name={locale === 'ar' ? product.nameAr : product.nameEn}
                nameAr={product.nameAr}
                originalPrice={product.originalPrice}
                price={product.price}
                discountPercent={product.discountPercent}
                isBestseller={product.isBestseller}
                isNew={product.isNew}
                badgeLabel={product.badgeLabel}
                href={`/products/${product.slug}`}
                onAddToCart={() => add({ productId: product.id, name: product.nameEn, nameAr: product.nameAr, price: product.price, quantity: 1, image: product.image, variantId: undefined, attributes: undefined })}
                onWishlist={() => toggle(product.id)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">🔍</div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">No Results Found</h3>
            <p className="text-slate-500 mb-4">No products match <span className="font-semibold text-slate-700">{query}</span></p>
            <Button
              variant="outline"
              onClick={() => updateSearchParams({ category: null, sort: null }, true)}
            >
              <span className="flex items-center gap-2">Clear Filters</span>
            </Button>
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-8 flex justify-center gap-2">
            <Button
              variant="outline"
              disabled={page <= 1}
              onClick={() => updateSearchParams({ page: String(page - 1) })}
            >
              Previous
            </Button>
            <span className="text-sm text-slate-500 px-2">Page {page} of {totalPages}</span>
            <Button
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => updateSearchParams({ page: String(page + 1) })}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
