'use client';

import { useWishlist } from '@/context/WishlistContext';
import { useCart } from '@/context/CartContext';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/ui/primitives/Button';
import { formatKwd } from '@/lib/currency';
import { allProducts } from '@/services/products';
import { Heart } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default function WishlistPage() {
  const { t, locale } = useI18n();
  const { ids, count } = useWishlist();
  const { add } = useCart();

  const wishlistItems = ids
    .map((id) => allProducts.find((p) => p.id === id))
    .filter(Boolean) as typeof allProducts[0][];

  return (
    <div className='container py-6 sm:py-8'>
      <div className='max-w-4xl mx-auto'>
        <div className='mb-6'>
          <h1 className='text-2xl lg:text-3xl font-extrabold text-slate-900'>{t('wishlist.title')}</h1>
          <p className='text-sm text-slate-500 mt-1'>{count} {count === 1 ? 'item' : 'items'}</p>
        </div>

        {wishlistItems.length === 0 ? (
          <div className='py-12 text-center'>
            <Heart aria-hidden='true' className='mx-auto mb-3 h-10 w-10 text-purple-600' strokeWidth={1.5} />
            <h3 className='text-xl font-bold text-slate-900 mb-2'>Your wishlist is empty</h3>
            <p className='text-slate-500 mb-4'>Save products you love and we will remind you.</p>
            <Link href={`/${locale}/products`} className='inline-flex min-h-11 items-center justify-center rounded-xl bg-orange-500 px-4 text-sm font-bold text-white transition hover:bg-orange-600'>
              {t('wishlist.start_shopping')}
            </Link>
          </div>
        ) : (
          <>
            <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4'>
              {wishlistItems.map((item) => (
                <div key={item.id} className='rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4'>
                  <div className='flex items-start gap-3'>
                    <div className='relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-slate-100 bg-slate-50 sm:h-28 sm:w-28'>
                      <Image src={item.image} alt={item.nameEn} fill sizes='(max-width: 640px) 96px, 112px' className='object-contain p-2' />
                    </div>
                    <div className='min-w-0 flex-1'>
                      <h3 className='line-clamp-2 text-sm font-bold leading-5 text-slate-900'>{item.nameEn}</h3>
                      <p className='mt-1 line-clamp-1 text-xs text-slate-500'>{item.nameAr}</p>
                      <p className='mt-2 font-bold text-slate-900'>{formatKwd(item.price)}</p>
                      <Button size='sm' className='mt-3 min-h-10 w-full bg-orange-500 hover:bg-orange-600' onClick={() => add({ productId: item.id, name: item.nameEn, nameAr: item.nameAr, price: item.price, quantity: 1, image: item.image })}>
                        <span className='flex items-center justify-center gap-2'>Add to Cart</span>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
