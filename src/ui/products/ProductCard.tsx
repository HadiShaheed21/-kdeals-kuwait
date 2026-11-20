'use client';

import { Heart, Plus } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { formatKwd } from '@/lib/currency';
import { useI18n } from '@/lib/i18n';
import Link from 'next/link';
import { ManagedImage } from '@/ui/media/ManagedImage';

interface ProductCardProps {
  image: string;
  name: string;
  nameAr?: string;
  productId?: string;
  originalPrice: number;
  price: number;
  discountPercent: number;
  isBestseller?: boolean;
  isNew?: boolean;
  badgeLabel?: string;
  onWishlist?: () => void;
  onAddToCart?: () => void;
  className?: string;
  href?: string;
}

export function ProductCard({ image, name, nameAr, productId, originalPrice, price, discountPercent, isBestseller = false, isNew = false, badgeLabel, onWishlist, onAddToCart, className = '', href }: ProductCardProps) {
  const { add } = useCart();
  const { toggle, isIn } = useWishlist();
  const { locale } = useI18n();
  const inWishlist = productId ? isIn(productId) : false;
  const localizedHref = href && (href.startsWith('/en/') || href.startsWith('/ar/') || href === '/en' || href === '/ar') ? href : href ? `/${locale}${href}` : undefined;

  const addProduct = () => {
    if (onAddToCart) return onAddToCart();
    if (!productId) return;
    add({ productId, name, nameAr: nameAr ?? name, price, quantity: 1, image });
  };

  const toggleProductWishlist = () => {
    if (onWishlist) return onWishlist();
    if (productId) toggle(productId);
  };

  return (
    <article className={`group flex min-h-[306px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg sm:min-h-[360px] sm:p-3 ${className}`}>
      <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-violet-50 via-white to-orange-50 sm:aspect-[4/3]">
        {localizedHref && <Link href={localizedHref} aria-label={`View ${name}`} className="absolute inset-0 z-10" />}
        <ManagedImage src={image} alt={name} fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" className="object-contain p-3 transition duration-300 group-hover:scale-105 sm:p-5" />
        {discountPercent > 0 && <span className="absolute start-2 top-2 rounded-full bg-orange-500 px-2 py-1 text-[10px] font-extrabold text-white shadow-sm sm:text-xs">-{discountPercent}%</span>}
      </div>
      <div className="flex flex-1 flex-col px-0.5 pt-2.5 sm:pt-3">
        <div className="mb-1.5 flex min-h-4 flex-wrap gap-1">{isBestseller && <span className="rounded-full bg-purple-50 px-1.5 py-0.5 text-[9px] font-bold text-purple-700">Best Seller</span>}{isNew && <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">New</span>}{badgeLabel && <span className="rounded-full bg-orange-50 px-1.5 py-0.5 text-[9px] font-bold text-orange-700">{badgeLabel}</span>}</div>
        {localizedHref ? <Link href={localizedHref} className="line-clamp-2 min-h-9 text-sm font-bold leading-[1.2] text-slate-900 transition hover:text-purple-700 focus-visible:outline-2 focus-visible:outline-orange-600 sm:min-h-10 sm:text-base">{name}</Link> : <h3 className="line-clamp-2 min-h-9 text-sm font-bold leading-[1.2] text-slate-900 sm:min-h-10 sm:text-base">{name}</h3>}
        <div className="mt-2 flex flex-wrap items-baseline gap-x-1.5"><span className="text-base font-extrabold tracking-tight text-slate-900 sm:text-lg">{formatKwd(price)}</span>{originalPrice > price && <span className="text-[10px] text-slate-400 line-through sm:text-xs">{formatKwd(originalPrice)}</span>}</div>
        <div className="mt-auto grid grid-cols-[40px_1fr] gap-1.5 pt-2.5 sm:grid-cols-[44px_1fr] sm:gap-2 sm:pt-3">
          <button type="button" onClick={toggleProductWishlist} aria-label={`Toggle wishlist for ${name}`} aria-pressed={inWishlist} className={`inline-flex min-h-10 items-center justify-center rounded-xl border transition focus-visible:outline-2 focus-visible:outline-orange-600 ${inWishlist ? 'border-purple-200 bg-purple-50 text-purple-700' : 'border-slate-200 text-slate-600 hover:border-purple-300 hover:bg-purple-50 hover:text-purple-700'}`}><Heart aria-hidden="true" className="h-4 w-4" fill={inWishlist ? 'currentColor' : 'none'} strokeWidth={1.8} /></button>
          <button type="button" onClick={addProduct} className="inline-flex min-h-10 items-center justify-center gap-1 rounded-xl bg-orange-500 px-2 text-xs font-extrabold text-white transition hover:bg-orange-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600 sm:px-3 sm:text-sm"><Plus aria-hidden="true" className="h-3.5 w-3.5 sm:h-4 sm:w-4" />Add</button>
        </div>
      </div>
    </article>
  );
}
