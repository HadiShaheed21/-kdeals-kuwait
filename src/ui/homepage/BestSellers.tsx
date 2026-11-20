import { ProductCard } from '@/ui/products/ProductCard';

interface BestSellersProps {
  t: (path: string) => string;
  products: { id: string; nameEn: string; nameAr: string; image: string; originalPrice: number; price: number; discountPercent: number; isBestseller: boolean; isNew: boolean; badgeLabel?: string }[];
}

export function BestSellers({ t, products }: BestSellersProps) {
  return (
    <section className="py-8 sm:py-12">
      <div className="container">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
          {t('homepage.best_sellers_title')}
        </h2>
        <p className="text-slate-600 mt-1 max-w-xl">{t('homepage.best_sellers_subtitle')}</p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:mt-6 sm:gap-4 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              image={product.image}
              name={product.nameEn}
              nameAr={product.nameAr}
              productId={product.id}
              originalPrice={product.originalPrice}
              price={product.price}
              discountPercent={product.discountPercent}
              isBestseller={product.isBestseller}
              isNew={product.isNew}
              badgeLabel={product.badgeLabel}
              href={`/products/${product.id}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
