import type { AdminCategory, AdminProduct, AdminStoreData, AdminVariant, HomepageSection, StoreSettings } from '@/lib/admin-repository';
import type { CmsAdminSnapshot, CmsProductTranslationRow, CmsPublicSnapshot, KwdNumeric } from './types';

const fallbackImage = '/images/product-hub.svg';

export function toKwdNumber(value: KwdNumeric | null): number {
  if (value === null) return 0;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`Invalid KWD value: ${value}`);
  return parsed;
}

/** Converts local numeric values to a database-safe numeric(10,3) string. */
export function toKwdNumeric(value: number | string): KwdNumeric {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed >= 10_000_000) throw new Error('KWD values must be between 0.000 and 9999999.999.');
  return parsed.toFixed(3);
}

function translationFor(translations: CmsProductTranslationRow[], productId: string, locale: 'en' | 'ar'): CmsProductTranslationRow | undefined {
  return translations.find((translation) => translation.product_id === productId && translation.locale === locale);
}

function productMediaUrl(productId: string, assetId: string, document = false): string {
  const search = document ? '?kind=document' : '';
  return `/api/media/product/${encodeURIComponent(productId)}/${encodeURIComponent(assetId)}${search}`;
}

function categoryMediaUrl(categoryId: string, assetId: string): string {
  return `/api/media/category/${encodeURIComponent(categoryId)}/${encodeURIComponent(assetId)}`;
}

function bannerMediaUrl(bannerId: string, assetId: string): string {
  return `/api/media/banner/${encodeURIComponent(bannerId)}/${encodeURIComponent(assetId)}`;
}

/**
 * Compatibility mapping used by the feature-gated Supabase storefront. Product
 * assets point to a local signing endpoint rather than directly exposing
 * private Storage paths; local IndexedDB references continue to use `media:`.
 */
export function mapCmsSnapshotToLocalShape(snapshot: CmsPublicSnapshot | CmsAdminSnapshot): AdminStoreData {
  const categoryIds = new Map(snapshot.categories.map((category) => [category.id, category.legacy_id || category.id]));
  const productIds = new Map(snapshot.products.map((product) => [product.id, product.legacy_id || product.id]));

  const categories: AdminCategory[] = snapshot.categories.map((category) => ({
    id: category.legacy_id || category.id,
    titleEn: category.title_en,
    titleAr: category.title_ar,
    image: category.image_asset_id ? categoryMediaUrl(category.id, category.image_asset_id) : fallbackImage,
    descriptionEn: category.description_en,
    descriptionAr: category.description_ar,
    active: category.enabled,
    showOnHomepage: category.show_on_homepage,
    showInNavigation: category.show_in_navigation,
    displayOrder: category.display_order,
    parentId: category.parent_id ? categoryIds.get(category.parent_id) || category.parent_id : undefined,
    navLabelEn: category.nav_label_en || undefined,
    navLabelAr: category.nav_label_ar || undefined,
    navDestination: category.nav_destination || undefined,
  }));

  const products: AdminProduct[] = snapshot.products.map((product) => {
    const english = translationFor(snapshot.translations, product.id, 'en');
    const arabic = translationFor(snapshot.translations, product.id, 'ar');
    const variants: AdminVariant[] = snapshot.variants.filter((variant) => variant.product_id === product.id).map((variant) => ({
      id: variant.legacy_variant_id || variant.id,
      nameEn: variant.name_en || undefined,
      nameAr: variant.name_ar || undefined,
      attributes: variant.attributes,
      sku: variant.sku || undefined,
      priceAdjustment: toKwdNumber(variant.price_adjustment),
      stock: variant.stock,
      active: variant.enabled,
    }));
    const media = snapshot.productMedia
      .filter((item) => item.product_id === product.id)
      .sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.display_order - b.display_order);
    const mediaIds = media.map((item) => productMediaUrl(product.id, item.media_asset_id));
    const documents = snapshot.documents
      .filter((document) => document.product_id === product.id)
      .sort((a, b) => a.display_order - b.display_order)
      .map((document) => ({ mediaId: productMediaUrl(product.id, document.media_asset_id, true), label: document.label_en }));
    return {
      id: product.legacy_id || product.id,
      slug: product.slug,
      categoryId: product.category_id ? categoryIds.get(product.category_id) || product.category_id : '',
      nameEn: english?.name || product.slug,
      nameAr: arabic?.name || english?.name || product.slug,
      descriptionEn: english?.description || undefined,
      descriptionAr: arabic?.description || undefined,
      image: mediaIds[0] || fallbackImage,
      originalPrice: toKwdNumber(product.original_price) || toKwdNumber(product.price),
      price: toKwdNumber(product.price),
      discountPercent: toKwdNumber(product.discount_percent),
      isBestseller: product.bestseller,
      isNew: product.new_arrival,
      badgeLabel: english?.badge_label || undefined,
      sku: product.sku || undefined,
      active: product.status === 'published',
      featured: product.featured,
      trending: product.trending,
      flashSale: product.flash_sale,
      displayOrder: product.display_order,
      stock: product.stock,
      mediaIds,
      documents,
      variants,
    };
  });

  const homepageSections: HomepageSection[] = snapshot.homepageSections.map((section) => ({
    id: section.section_key,
    visible: section.enabled,
    displayOrder: section.display_order,
    titleEn: section.title_en || undefined,
    titleAr: section.title_ar || undefined,
    subtitleEn: section.subtitle_en || undefined,
    subtitleAr: section.subtitle_ar || undefined,
    maxProducts: section.max_products || undefined,
    theme: section.theme,
    productIds: snapshot.homepageSectionProducts.filter((item) => item.section_id === section.id).sort((a, b) => a.display_order - b.display_order).map((item) => productIds.get(item.product_id) || item.product_id),
  }));

  const storeSettings: StoreSettings = snapshot.storeSettings ? {
    displayName: snapshot.storeSettings.display_name,
    contactPhone: snapshot.storeSettings.contact_phone,
    contactEmail: snapshot.storeSettings.contact_email,
    deliveryInfo: snapshot.storeSettings.delivery_info,
    deliveryMessageEn: snapshot.storeSettings.delivery_message_en,
    deliveryMessageAr: snapshot.storeSettings.delivery_message_ar,
    announcementEn: snapshot.storeSettings.announcement_en,
    announcementAr: snapshot.storeSettings.announcement_ar,
    announcementVisible: snapshot.storeSettings.announcement_visible,
    freeDeliveryThreshold: snapshot.storeSettings.free_delivery_threshold ? toKwdNumber(snapshot.storeSettings.free_delivery_threshold) : undefined,
  } : { displayName: 'K DEALS', contactPhone: '', contactEmail: '', deliveryInfo: '', deliveryMessageEn: '', deliveryMessageAr: '', announcementEn: '', announcementAr: '', announcementVisible: true };

  return {
    version: 2,
    categories,
    products,
    banners: snapshot.banners.map((banner) => ({ id: banner.legacy_id || banner.id, titleEn: banner.title_en, titleAr: banner.title_ar, subtitleEn: banner.subtitle_en, subtitleAr: banner.subtitle_ar, ctaLabelEn: banner.cta_label_en, ctaLabelAr: banner.cta_label_ar, destination: banner.destination, desktopImage: banner.desktop_image_asset_id ? bannerMediaUrl(banner.id, banner.desktop_image_asset_id) : fallbackImage, mobileImage: banner.mobile_image_asset_id ? bannerMediaUrl(banner.id, banner.mobile_image_asset_id) : fallbackImage, enabled: banner.enabled, displayOrder: banner.display_order })),
    homepageSections,
    whatsappNumber: snapshot.storeSettings?.whatsapp_number || '',
    storeSettings,
    updatedAt: snapshot.storeSettings?.updated_at || '',
  };
}
