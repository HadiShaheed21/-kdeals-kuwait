import type { AdminProduct } from '@/lib/admin-repository';
import type { ImportPreparationManifest, LegacyIdMapping, StorageUploadPlan } from './import-plan';
import type { PortableCmsExport, PortableMediaRecord } from './portable';

export interface NormalizedImportPayload {
  media_assets: Array<Record<string, unknown>>;
  categories: Array<Record<string, unknown>>;
  products: Array<Record<string, unknown>>;
  translations: Array<Record<string, unknown>>;
  variants: Array<Record<string, unknown>>;
  product_media: Array<Record<string, unknown>>;
  documents: Array<Record<string, unknown>>;
  sections: Array<Record<string, unknown>>;
  section_products: Array<Record<string, unknown>>;
  banners: Array<Record<string, unknown>>;
  navigation: Array<Record<string, unknown>>;
  settings: Record<string, unknown>;
  mappings: Array<{ entity_type: string; legacy_id: string; entity_id: string }>;
}

function mediaIdFromRef(value: string | undefined): string | null {
  return value?.startsWith('media:') ? value.slice('media:'.length) : null;
}

function mappedId(mappings: Map<string, string>, entityType: LegacyIdMapping['entityType'], legacyId: string): string {
  const id = mappings.get(`${entityType}:${legacyId}`);
  if (!id) throw new Error(`Missing deterministic mapping for ${entityType}:${legacyId}.`);
  return id;
}

function toKwd(value: number): string {
  if (!Number.isFinite(value) || value < 0 || value >= 10_000_000) throw new Error('KWD values must be between 0.000 and 9999999.999.');
  return value.toFixed(3);
}

function productImageReferences(product: AdminProduct): Array<{ mediaId: string; primary: boolean; alt: string }> {
  const ordered = [mediaIdFromRef(product.image), ...(product.mediaIds ?? []).map(mediaIdFromRef)].filter((id): id is string => Boolean(id));
  return [...new Set(ordered)].map((mediaId, index) => ({ mediaId, primary: index === 0, alt: product.nameEn }));
}

function hex(bytes: Uint8Array): string {
  return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
}

async function deterministicDocumentId(sourceFingerprint: string, productLegacyId: string, mediaLegacyId: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`kdeals-stage6:${sourceFingerprint}:document:${productLegacyId}:${mediaLegacyId}`));
  const bytes = new Uint8Array(digest.slice(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x80;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const value = hex(bytes);
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
}

/**
 * Produces the UUID-only JSON contract consumed by the owner-only atomic apply
 * RPC. It is pure and performs no database, Storage, or browser-local writes.
 */
export async function createNormalizedImportPayload(source: PortableCmsExport, manifest: ImportPreparationManifest): Promise<NormalizedImportPayload> {
  const mappings = new Map(manifest.mappings.map((mapping) => [`${mapping.entityType}:${mapping.legacyId}`, mapping.databaseId]));
  const mediaPlans = new Map(manifest.storageUploads.map((plan) => [plan.legacyMediaId, plan]));
  const mediaRecords = new Map(source.media.map((media) => [media.id, media]));
  const mediaAssetId = (legacyId: string | null): string | null => legacyId ? mappedId(mappings, 'media', legacyId) : null;
  const mediaPlan = (legacyId: string): StorageUploadPlan => {
    const plan = mediaPlans.get(legacyId);
    if (!plan) throw new Error(`Missing verified Storage plan for media:${legacyId}.`);
    return plan;
  };
  const mediaRecord = (legacyId: string): PortableMediaRecord => {
    const record = mediaRecords.get(legacyId);
    if (!record) throw new Error(`Missing source media:${legacyId}.`);
    return record;
  };

  const media_assets = manifest.storageUploads.map((plan) => {
    const media = mediaRecord(plan.legacyMediaId);
    return {
      id: plan.mediaAssetId,
      legacy_id: plan.legacyMediaId,
      storage_bucket: plan.bucket,
      storage_path: plan.storagePath,
      kind: media.type === 'application/pdf' ? 'document' : 'image',
      mime_type: media.type,
      byte_size: plan.byteSize,
      original_filename: media.name,
      alt_text: media.alt,
      sha256: plan.sha256,
    };
  });

  const categories = source.cms.categories.map((category) => ({
    id: mappedId(mappings, 'category', category.id),
    legacy_id: category.id,
    parent_id: category.parentId ? mappedId(mappings, 'category', category.parentId) : null,
    slug: category.id,
    title_en: category.titleEn,
    title_ar: category.titleAr,
    description_en: category.descriptionEn ?? '',
    description_ar: category.descriptionAr ?? '',
    image_asset_id: mediaAssetId(mediaIdFromRef(category.image)),
    enabled: category.active,
    show_on_homepage: category.showOnHomepage,
    show_in_navigation: category.showInNavigation,
    display_order: category.displayOrder,
    nav_label_en: category.navLabelEn ?? null,
    nav_label_ar: category.navLabelAr ?? null,
    nav_destination: category.navDestination ?? null,
  }));

  const products = source.cms.products.map((product) => ({
    id: mappedId(mappings, 'product', product.id),
    legacy_id: product.id,
    category_id: mappedId(mappings, 'category', product.categoryId),
    slug: product.slug,
    sku: product.sku ?? null,
    price: toKwd(product.price),
    original_price: product.originalPrice === undefined ? null : toKwd(product.originalPrice),
    discount_percent: Number.isFinite(product.discountPercent) ? product.discountPercent.toFixed(2) : '0.00',
    stock: product.stock,
    featured: Boolean(product.featured),
    bestseller: product.isBestseller,
    trending: Boolean(product.trending),
    new_arrival: product.isNew,
    flash_sale: Boolean(product.flashSale),
    display_order: product.displayOrder ?? 0,
  }));

  const translations = source.cms.products.flatMap((product) => {
    const product_id = mappedId(mappings, 'product', product.id);
    return [
      { product_id, locale: 'en', name: product.nameEn, description: product.descriptionEn ?? '', badge_label: product.badgeLabel ?? null },
      { product_id, locale: 'ar', name: product.nameAr, description: product.descriptionAr ?? '', badge_label: product.badgeLabel ?? null },
    ];
  });

  const variants = source.cms.products.flatMap((product) => (product.variants ?? []).map((variant, display_order) => ({
    id: mappedId(mappings, 'variant', variant.id),
    product_id: mappedId(mappings, 'product', product.id),
    legacy_variant_id: variant.id,
    sku: variant.sku ?? null,
    name_en: variant.nameEn ?? '',
    name_ar: variant.nameAr ?? '',
    attributes: variant.attributes,
    price_adjustment: toKwd(variant.priceAdjustment),
    stock: variant.stock,
    enabled: variant.active,
    display_order,
    image_asset_id: mediaAssetId(mediaIdFromRef(variant.image)),
  })));

  const product_media = source.cms.products.flatMap((product) => productImageReferences(product).map((image, display_order) => {
    mediaPlan(image.mediaId);
    return {
      product_id: mappedId(mappings, 'product', product.id),
      media_asset_id: mappedId(mappings, 'media', image.mediaId),
      display_order,
      is_primary: image.primary,
      alt_text: image.alt,
    };
  }));

  const documents = (await Promise.all(source.cms.products.flatMap((product) => (product.documents ?? []).map(async (document, display_order) => {
    mediaPlan(document.mediaId);
    return {
      id: await deterministicDocumentId(manifest.sourceFingerprint, product.id, document.mediaId),
      product_id: mappedId(mappings, 'product', product.id),
      media_asset_id: mappedId(mappings, 'media', document.mediaId),
      label_en: document.label,
      label_ar: document.label,
      display_order,
    };
  }))));

  const sections = source.cms.homepageSections.map((section) => ({
    id: mappedId(mappings, 'homepage_section', section.id),
    section_key: section.id,
    enabled: section.visible,
    display_order: section.displayOrder,
    title_en: section.titleEn ?? '',
    title_ar: section.titleAr ?? '',
    subtitle_en: section.subtitleEn ?? '',
    subtitle_ar: section.subtitleAr ?? '',
    max_products: section.maxProducts ?? null,
    theme: section.theme ?? 'default',
  }));

  const section_products = source.cms.homepageSections.flatMap((section) => (section.productIds ?? []).map((productLegacyId, display_order) => ({
    section_id: mappedId(mappings, 'homepage_section', section.id),
    product_id: mappedId(mappings, 'product', productLegacyId),
    display_order,
  })));

  const banners = source.cms.banners.map((banner) => ({
    id: mappedId(mappings, 'banner', banner.id),
    legacy_id: banner.id,
    title_en: banner.titleEn,
    title_ar: banner.titleAr,
    subtitle_en: banner.subtitleEn,
    subtitle_ar: banner.subtitleAr,
    cta_label_en: banner.ctaLabelEn,
    cta_label_ar: banner.ctaLabelAr,
    destination: banner.destination,
    desktop_image_asset_id: mediaAssetId(mediaIdFromRef(banner.desktopImage)),
    mobile_image_asset_id: mediaAssetId(mediaIdFromRef(banner.mobileImage)),
    enabled: banner.enabled,
    display_order: banner.displayOrder,
    starts_at: null,
    ends_at: null,
  }));

  const navigation = source.cms.categories.filter((category) => category.showInNavigation).map((category) => ({
    id: mappedId(mappings, 'navigation_entry', `category:${category.id}`),
    category_id: mappedId(mappings, 'category', category.id),
    label_en: category.navLabelEn || category.titleEn,
    label_ar: category.navLabelAr || category.titleAr,
    destination: category.navDestination || `/categories/${category.id}`,
    enabled: true,
    display_order: category.displayOrder,
  }));

  return {
    media_assets, categories, products, translations, variants, product_media, documents,
    sections, section_products, banners, navigation,
    settings: {
      display_name: source.cms.storeSettings.displayName,
      contact_phone: source.cms.storeSettings.contactPhone,
      contact_email: source.cms.storeSettings.contactEmail,
      whatsapp_number: source.cms.whatsappNumber,
      delivery_info: source.cms.storeSettings.deliveryInfo,
      delivery_message_en: source.cms.storeSettings.deliveryMessageEn,
      delivery_message_ar: source.cms.storeSettings.deliveryMessageAr,
      announcement_en: source.cms.storeSettings.announcementEn,
      announcement_ar: source.cms.storeSettings.announcementAr,
      announcement_visible: source.cms.storeSettings.announcementVisible,
      free_delivery_threshold: source.cms.storeSettings.freeDeliveryThreshold === undefined ? null : toKwd(source.cms.storeSettings.freeDeliveryThreshold),
    },
    // Unreferenced browser media intentionally has no Storage upload plan and
    // therefore no media_assets row. Do not create a legacy mapping to a UUID
    // that does not exist in the database.
    mappings: manifest.mappings
      .filter((mapping) => mapping.entityType !== 'media' || mediaPlans.has(mapping.legacyId))
      .map((mapping) => ({ entity_type: mapping.entityType, legacy_id: mapping.legacyId, entity_id: mapping.databaseId })),
  };
}

/** Canonicalizes a payload before deriving the staged-payload SHA-256. */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export async function sha256CanonicalJson(value: unknown): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonicalJson(value)));
  return hex(new Uint8Array(digest));
}
