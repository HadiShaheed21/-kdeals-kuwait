import type { CmsAdminSnapshot } from './types';

export interface CmsRemotePreview {
  counts: { products: number; categories: number; variants: number; banners: number; navigation: number; homepageSections: number; mediaAssets: number };
  products: Array<{ id: string; legacyId: string | null; slug: string; status: string; stock: number; price: string | number }>;
  categories: Array<{ id: string; legacyId: string | null; slug: string; enabled: boolean }>;
  variants: Array<{ id: string; productId: string; legacyId: string | null; enabled: boolean; stock: number }>;
  banners: Array<{ id: string; legacyId: string | null; enabled: boolean; destination: string }>;
  navigation: Array<{ id: string; enabled: boolean; destination: string; labelEn: string; labelAr: string }>;
  homepageSections: Array<{ id: string; key: string; enabled: boolean; displayOrder: number; theme: string }>;
  settings: { configured: boolean; displayName?: string; announcementVisible?: boolean };
  media: Array<{ id: string; legacyId: string | null; kind: string; mimeType: string; byteSize: number }>;
}

/** Sanitizes remote admin data for the protected preview UI: no storage paths or signed URLs. */
export function createCmsRemotePreview(snapshot: CmsAdminSnapshot): CmsRemotePreview {
  return {
    counts: { products: snapshot.products.length, categories: snapshot.categories.length, variants: snapshot.variants.length, banners: snapshot.banners.length, navigation: snapshot.navigation.length, homepageSections: snapshot.homepageSections.length, mediaAssets: snapshot.mediaAssets.length },
    products: snapshot.products.map((product) => ({ id: product.id, legacyId: product.legacy_id, slug: product.slug, status: product.status, stock: product.stock, price: product.price })),
    categories: snapshot.categories.map((category) => ({ id: category.id, legacyId: category.legacy_id, slug: category.slug, enabled: category.enabled })),
    variants: snapshot.variants.map((variant) => ({ id: variant.id, productId: variant.product_id, legacyId: variant.legacy_variant_id, enabled: variant.enabled, stock: variant.stock })),
    banners: snapshot.banners.map((banner) => ({ id: banner.id, legacyId: banner.legacy_id, enabled: banner.enabled, destination: banner.destination })),
    navigation: snapshot.navigation.map((item) => ({ id: item.id, enabled: item.enabled, destination: item.destination, labelEn: item.label_en, labelAr: item.label_ar })),
    homepageSections: snapshot.homepageSections.map((section) => ({ id: section.id, key: section.section_key, enabled: section.enabled, displayOrder: section.display_order, theme: section.theme })),
    settings: snapshot.storeSettings ? { configured: true, displayName: snapshot.storeSettings.display_name, announcementVisible: snapshot.storeSettings.announcement_visible } : { configured: false },
    media: snapshot.mediaAssets.map((asset) => ({ id: asset.id, legacyId: asset.legacy_media_id, kind: asset.kind, mimeType: asset.mime_type, byteSize: asset.byte_size })),
  };
}
