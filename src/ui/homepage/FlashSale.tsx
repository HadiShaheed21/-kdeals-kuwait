import { ProductCard } from '@/ui/products/ProductCard';
import Link from 'next/link';

interface FlashSaleProps {
  t: (path: string) => string;
  products: { id: string; nameEn: string; nameAr: string; image: string; originalPrice: number; price: number; discountPercent: number; isBestseller: boolean; isNew: boolean; badgeLabel?: string }[];
}

export function FlashSale({ t, products }: FlashSaleProps) {
  return (
    <section className="bg-gradient-to-b from-orange-50 to-white py-8 sm:py-12">
      <div className="container">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
          {t('homepage.flash_sale')}
        </h2>
        <p className="text-slate-600 mt-1 max-w-xl">{t('homepage.flash_sale_subtitle')}</p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:mt-6 sm:gap-4 lg:grid-cols-4">
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
        <div className="text-center mt-6">
          <Link href="/products" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold transition-colors shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600">
            {t('homepage.flash_sale_cta')}
          </Link>
        </div>
      </div>
    </section>
  );
}
