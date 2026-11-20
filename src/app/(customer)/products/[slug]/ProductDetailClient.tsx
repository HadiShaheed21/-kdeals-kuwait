
'use client';

import { Heart, Minus, Plus, ShoppingCart } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';

import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { useI18n } from '@/lib/i18n';
import { formatKwd } from '@/lib/currency';
import { getProductBySlug } from '@/services/products-extended';
import { useStorefrontData } from '@/context/StorefrontDataContext';
import { mediaRef } from '@/lib/media-repository';
import { ManagedDownload, ManagedImage } from '@/ui/media/ManagedImage';

type Product = NonNullable<ReturnType<typeof getProductBySlug>>;

interface ProductDetailClientProps {
  product: Product;
  initialVariantId?: string;
}

export default function ProductDetailClient({
  product,
  initialVariantId,
}: ProductDetailClientProps) {
  const { t, locale } = useI18n();
  const store = useStorefrontData();
  const { add } = useCart();
  const { toggle, isIn } = useWishlist();

  const managedProduct = store.products.find((item) => item.id === product.id || item.slug === product.slug);
  const displayProduct = managedProduct ? { ...product, ...managedProduct, variants: managedProduct.variants ?? product.variants } : product;
  const unavailable = Boolean(managedProduct && !managedProduct.active);
  const [quantity, setQuantity] = useState(1);

  const allImages = managedProduct?.mediaIds?.length
    ? managedProduct.mediaIds.map((mediaId) => mediaId.startsWith('/') || mediaId.startsWith('http') ? mediaId : mediaRef(mediaId))
    : product.images ?? [displayProduct.image];
  const images = allImages.length > 0 ? allImages : [displayProduct.image];

  const [selectedImage, setSelectedImage] = useState(images[0]);

  const [selectedVariantId, setSelectedVariantId] = useState(
    initialVariantId || ''
  );

  const selectedVariant = displayProduct.variants?.find(
    (variant) => variant.id === selectedVariantId
  );

  const effectivePrice = selectedVariant
    ? displayProduct.price + selectedVariant.priceAdjustment
    : displayProduct.price;

  const effectiveStock = selectedVariant
    ? selectedVariant.stock
    : displayProduct.stock;

  const isOutOfStock = unavailable || effectiveStock <= 0;
  const isInWishlist = isIn(product.id);

  const displayOriginalPrice =
    displayProduct.originalPrice > displayProduct.price
      ? formatKwd(displayProduct.originalPrice)
      : null;

  const handleQuantityChange = (delta: number) => {
    setQuantity((current) =>
      Math.min(
        effectiveStock,
        Math.max(1, current + delta)
      )
    );
  };

  const handleVariantChange = (variantId: string) => {
    setSelectedVariantId(variantId);
    setQuantity(1);
  };

  const handleAddToCart = () => {
    if (isOutOfStock) return;

    add({
      productId: displayProduct.id,
      variantId: selectedVariant?.id,
      name: displayProduct.nameEn,
      nameAr: displayProduct.nameAr,
      price: effectivePrice,
      quantity,
      image: displayProduct.image,
      attributes: selectedVariant?.attributes,
    });
  };

  const handleWishlistToggle = () => {
    toggle(displayProduct.id);
  };

  return (
    <div className="container py-5 sm:py-8">
      <nav className="mb-4 flex min-w-0 items-center gap-2 overflow-hidden text-sm text-slate-500 sm:mb-6">
        <Link href={`/${locale}`} className="hover:text-orange-600">
          {t('common.home')}
        </Link>

        <span>/</span>

        <span className="truncate text-slate-900">
          {locale === 'ar' ? displayProduct.nameAr : displayProduct.nameEn}
        </span>
      </nav>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">

        {/* Product image gallery */}
        <div className="flex flex-col gap-3 sm:gap-4">
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm sm:aspect-square">
            <ManagedImage src={selectedImage} alt={displayProduct.nameEn} fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-contain p-5 sm:p-8" />
          </div>

          {images.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {images.map((img, index) => (
                <button
                  key={`${img}-${index}`}
                  type="button"
                  onClick={() => setSelectedImage(img)}
                  aria-label={`View product image ${index + 1}`}
                  aria-pressed={selectedImage === img}
                  className={`relative aspect-square rounded-xl overflow-hidden border-2 ${
                    selectedImage === img
                      ? 'border-orange-500'
                      : 'border-slate-200'
                  }`}
                >
                  <ManagedImage src={img} alt={`${displayProduct.nameEn} image ${index + 1}`} fill sizes="120px" className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product information */}
        <div className="flex flex-col gap-4 sm:gap-5">
          <div>
            <h1 className="text-2xl font-extrabold leading-tight text-slate-900 lg:text-3xl">
              {locale === 'ar' ? displayProduct.nameAr : displayProduct.nameEn}
            </h1>

            <p className="mt-1 text-sm text-slate-500 sm:mt-2">
              {locale === 'ar' ? displayProduct.nameEn : displayProduct.nameAr}
            </p>
          </div>

          {/* Price */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-2xl font-extrabold text-orange-600 sm:text-3xl">
              {formatKwd(effectivePrice)}
            </span>

            {displayOriginalPrice && (
              <span className="text-lg text-slate-400 line-through">
                {displayOriginalPrice}
              </span>
            )}
          </div>

          {/* Description */}
          {displayProduct.descriptionEn && (
            <p className="text-slate-600 leading-relaxed">
              {locale === 'ar' ? displayProduct.descriptionAr || displayProduct.descriptionEn : displayProduct.descriptionEn}
            </p>
          )}

          {managedProduct?.documents?.length ? <section><h3 className="font-semibold text-slate-900">Documents</h3><div className="mt-3 flex flex-wrap gap-2">{managedProduct.documents.map((document) => <ManagedDownload key={document.mediaId} mediaId={document.mediaId} label={document.label} />)}</div></section> : null}

          {/* Variants */}
          {displayProduct.variants && displayProduct.variants.length > 0 && (
            <div>
              <h3 className="font-semibold text-slate-900 mb-3">
                Choose an option
              </h3>

              <div className="flex flex-wrap gap-2">
                {displayProduct.variants.filter((variant) => 'active' in variant ? variant.active : true).map((variant, index) => (
                  <button
                    key={variant.id}
                    type="button"
                    onClick={() => handleVariantChange(variant.id)}
                    aria-pressed={selectedVariantId === variant.id}
                  className={`min-h-10 rounded-xl border px-4 py-2 text-sm font-medium ${
                      selectedVariantId === variant.id
                        ? 'border-orange-500 bg-orange-50 text-orange-700'
                        : 'border-slate-200 hover:border-orange-400'
                    }`}
                  >
                    Option {index + 1}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Stock */}
          <div>
            {isOutOfStock ? (
              <span className="text-red-600 font-semibold">
                Out of stock
              </span>
            ) : (
              <span className="text-green-600 font-semibold">
                In stock
              </span>
            )}
          </div>

          {/* Quantity */}
          {!isOutOfStock && (
            <div>
              <h3 className="font-semibold text-slate-900 mb-3">
                Quantity
              </h3>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleQuantityChange(-1)}
                  disabled={quantity <= 1}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 disabled:opacity-40"
                  aria-label="Decrease quantity"
                >
                  <Minus aria-hidden="true" className="h-4 w-4" />
                </button>

                <span className="w-10 text-center font-semibold">
                  {quantity}
                </span>

                <button
                  type="button"
                  onClick={() => handleQuantityChange(1)}
                  disabled={quantity >= effectiveStock}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 disabled:opacity-40"
                  aria-label="Increase quantity"
                >
                  <Plus aria-hidden="true" className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="sticky bottom-3 z-10 flex flex-col gap-2 rounded-2xl border border-slate-100 bg-white/95 p-2 shadow-lg backdrop-blur sm:static sm:flex-row sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={isOutOfStock}
              className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-orange-500 px-6 py-3 font-bold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ShoppingCart aria-hidden="true" className="h-5 w-5" />
              {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
            </button>

            <button
              type="button"
              onClick={handleWishlistToggle}
              aria-pressed={isInWishlist}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-3 font-semibold hover:border-orange-500"
            >
              <Heart aria-hidden="true" className="h-5 w-5" fill={isInWishlist ? 'currentColor' : 'none'} />
              {isInWishlist ? 'Saved' : 'Add to Wishlist'}
            </button>
          </div>

          {/* Total */}
          {!isOutOfStock && (
            <div className="border-t border-slate-200 pt-4 flex justify-between">
              <span className="font-semibold text-slate-700">
                Total
              </span>

              <span className="font-extrabold text-xl text-slate-900">
                {formatKwd(effectivePrice * quantity)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
