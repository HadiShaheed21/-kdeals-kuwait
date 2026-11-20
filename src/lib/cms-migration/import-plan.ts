import type { AdminCategory, AdminProduct, AdminStoreData, HomepageSection } from '@/lib/admin-repository';
import { validatePortableCmsExport, type MigrationValidationIssue, type PortableCmsExport, type PortableMediaRecord } from './portable';

export type ImportEntityType = 'product' | 'category' | 'variant' | 'banner' | 'media' | 'homepage_section' | 'navigation_entry';
export type ImportStorageBucket = 'product-images' | 'product-documents' | 'site-banners';

export interface LegacyIdMapping {
  entityType: ImportEntityType;
  legacyId: string;
  databaseId: string;
}

export interface StorageUploadPlan {
  legacyMediaId: string;
  mediaAssetId: string;
  bucket: ImportStorageBucket;
  storagePath: string;
  mimeType: string;
  byteSize: number;
  sha256: string;
  referencedBy: string[];
  duplicateOfLegacyMediaId?: string;
}

export interface ImportPlanIssue extends MigrationValidationIssue {
  code: 'validation' | 'suspicious_price' | 'seed_data' | 'storage' | 'relationship' | 'duplicate_content';
}

export interface ImportPreparationManifest {
  format: 'kdeals-stage5-import-plan';
  version: 1;
  sourceFingerprint: string;
  sourceExportedAt: string;
  counts: {
    products: number;
    categories: number;
    translations: number;
    variants: number;
    banners: number;
    homepageSections: number;
    navigationEntries: number;
    media: number;
    documents: number;
  };
  mappings: LegacyIdMapping[];
  relationships: {
    categoryParents: Array<{ categoryLegacyId: string; parentCategoryLegacyId: string | null }>;
    productCategories: Array<{ productLegacyId: string; categoryLegacyId: string }>;
    translations: Array<{ productLegacyId: string; locale: 'en' | 'ar' }>;
    variants: Array<{ variantLegacyId: string; productLegacyId: string }>;
    homepageSelections: Array<{ sectionLegacyId: string; productLegacyId: string; displayOrder: number }>;
    navigation: Array<{ navigationLegacyId: string; categoryLegacyId: string; destination: string }>;
    storeSettings: { singleton: true };
  };
  storageUploads: StorageUploadPlan[];
  issues: ImportPlanIssue[];
}

export interface PreparedPortableImport {
  validationIssues: MigrationValidationIssue[];
  manifest: ImportPreparationManifest | null;
}

const uuidByte = (value: number) => value.toString(16).padStart(2, '0');

async function sha256Text(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), uuidByte).join('');
}

/**
 * A deterministic UUIDv8 derived from the immutable export fingerprint and
 * legacy identity. It is a planned identity only until a separately approved
 * import writes it and records it in legacy_id_map.
 */
async function deterministicUuid(sourceFingerprint: string, entityType: ImportEntityType, legacyId: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`kdeals-stage5:${sourceFingerprint}:${entityType}:${legacyId}`));
  const bytes = new Uint8Array(digest.slice(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x80;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, uuidByte).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function refToMediaId(value: string | undefined): string | null {
  return value?.startsWith('media:') ? value.slice('media:'.length) : null;
}

function extensionFor(media: PortableMediaRecord): string {
  const extension = media.name.split('.').pop()?.toLowerCase();
  if (extension && /^[a-z0-9]{1,8}$/.test(extension)) return extension;
  return media.type === 'application/pdf' ? 'pdf' : media.type === 'image/png' ? 'png' : media.type === 'image/webp' ? 'webp' : 'jpg';
}

function countDocuments(products: AdminProduct[]): number {
  return products.reduce((total, product) => total + (product.documents?.length ?? 0), 0);
}

function addIssue(issues: ImportPlanIssue[], severity: ImportPlanIssue['severity'], code: ImportPlanIssue['code'], path: string, message: string): void {
  issues.push({ severity, code, path, message });
}

async function mappingFor(sourceFingerprint: string, entityType: ImportEntityType, legacyId: string): Promise<LegacyIdMapping> {
  return { entityType, legacyId, databaseId: await deterministicUuid(sourceFingerprint, entityType, legacyId) };
}

function gatherMediaUsage(cms: AdminStoreData, media: PortableMediaRecord[], mappings: LegacyIdMapping[], issues: ImportPlanIssue[]): StorageUploadPlan[] {
  const mapped = new Map(mappings.filter((item) => item.entityType === 'media').map((item) => [item.legacyId, item.databaseId]));
  const uses = new Map<string, Array<{ bucket: ImportStorageBucket; ownerId: string; label: string }>>();
  const addUse = (mediaId: string | null, bucket: ImportStorageBucket, ownerId: string, label: string) => {
    if (!mediaId) return;
    const items = uses.get(mediaId) ?? [];
    items.push({ bucket, ownerId, label });
    uses.set(mediaId, items);
  };

  for (const category of cms.categories) addUse(refToMediaId(category.image), 'product-images', category.id, `category:${category.id}`);
  for (const product of cms.products) {
    addUse(refToMediaId(product.image), 'product-images', product.id, `product:${product.id}:primary`);
    for (const image of product.mediaIds ?? []) addUse(refToMediaId(image), 'product-images', product.id, `product:${product.id}:gallery`);
    for (const variant of product.variants ?? []) addUse(refToMediaId(variant.image), 'product-images', product.id, `product:${product.id}:variant:${variant.id}`);
    for (const document of product.documents ?? []) addUse(document.mediaId, 'product-documents', product.id, `product:${product.id}:document`);
  }
  for (const banner of cms.banners) {
    addUse(refToMediaId(banner.desktopImage), 'site-banners', banner.id, `banner:${banner.id}:desktop`);
    addUse(refToMediaId(banner.mobileImage), 'site-banners', banner.id, `banner:${banner.id}:mobile`);
  }

  const checksumFirst = new Map<string, string>();
  const plans: StorageUploadPlan[] = [];
  for (const item of media) {
    const references = uses.get(item.id) ?? [];
    const buckets = [...new Set(references.map((reference) => reference.bucket))];
    if (buckets.length === 0) {
      addIssue(issues, 'warning', 'storage', `media.${item.id}`, 'Media is not referenced by a product, category, variant, banner, or PDF document. It will not be uploaded until a destination is selected.');
      continue;
    }
    if (buckets.length > 1) {
      addIssue(issues, 'error', 'storage', `media.${item.id}`, 'One legacy media item is used across incompatible private Storage buckets. Split or replace the references before importing.');
      continue;
    }
    const bucket = buckets[0];
    const ownerId = references[0]?.ownerId;
    const ownerMapping = mappings.find((mapping) => mapping.legacyId === ownerId && (mapping.entityType === 'product' || mapping.entityType === 'category' || mapping.entityType === 'banner'));
    const mediaAssetId = mapped.get(item.id);
    if (!ownerMapping || !mediaAssetId) {
      addIssue(issues, 'error', 'relationship', `media.${item.id}`, 'The media item could not be connected to a planned owner mapping.');
      continue;
    }
    const duplicateOfLegacyMediaId = checksumFirst.get(item.sha256.toLowerCase());
    if (!duplicateOfLegacyMediaId) checksumFirst.set(item.sha256.toLowerCase(), item.id);
    else addIssue(issues, 'warning', 'duplicate_content', `media.${item.id}`, `Same SHA-256 content as media ${duplicateOfLegacyMediaId}; review before uploading duplicate bytes.`);
    plans.push({
      legacyMediaId: item.id,
      mediaAssetId,
      bucket,
      storagePath: `${ownerMapping.databaseId}/${mediaAssetId}.${extensionFor(item)}`,
      mimeType: item.type,
      byteSize: item.size,
      sha256: item.sha256.toLowerCase(),
      referencedBy: references.map((reference) => reference.label),
      ...(duplicateOfLegacyMediaId ? { duplicateOfLegacyMediaId } : {}),
    });
  }
  return plans;
}

function assessProducts(products: AdminProduct[], categories: AdminCategory[], issues: ImportPlanIssue[]): void {
  const categoryIds = new Set(categories.map((category) => category.id));
  for (const product of products) {
    if (!categoryIds.has(product.categoryId)) addIssue(issues, 'error', 'relationship', `products.${product.id}.categoryId`, 'Product references a category that is not included in this export.');
    if (product.originalPrice !== undefined && product.originalPrice < product.price) addIssue(issues, 'warning', 'suspicious_price', `products.${product.id}.originalPrice`, `Original price (${product.originalPrice.toFixed(3)} KWD) is lower than selling price (${product.price.toFixed(3)} KWD). Review before import; the database constraint will reject it.`);
    if (/^p\d+$/i.test(product.id)) addIssue(issues, 'warning', 'seed_data', `products.${product.id}`, 'Identifier matches the bundled demo/seed pattern and should be reviewed before a production import.');
    if (!Number.isInteger(product.stock) || product.stock < 0) addIssue(issues, 'error', 'relationship', `products.${product.id}.stock`, 'Product stock must be a non-negative whole number.');
    for (const variant of product.variants ?? []) {
      if (!Number.isInteger(variant.stock) || variant.stock < 0) addIssue(issues, 'error', 'relationship', `products.${product.id}.variants.${variant.id}.stock`, 'Variant stock must be a non-negative whole number.');
    }
  }
  for (const category of categories) if (/^(mobiles|laptops|gadgets|bags|headphones|accessories|gaming|home-electronics|smart-watches)$/i.test(category.id)) addIssue(issues, 'warning', 'seed_data', `categories.${category.id}`, 'Identifier matches a bundled catalog category; confirm it is not demo data before importing.');
}

function prepareRelationships(cms: AdminStoreData): ImportPreparationManifest['relationships'] {
  return {
    categoryParents: cms.categories.map((category) => ({ categoryLegacyId: category.id, parentCategoryLegacyId: category.parentId ?? null })),
    productCategories: cms.products.map((product) => ({ productLegacyId: product.id, categoryLegacyId: product.categoryId })),
    // product_translations has a composite key, so its durable target identity
    // is the mapped product UUID plus locale rather than legacy_id_map row.
    translations: cms.products.flatMap((product) => [{ productLegacyId: product.id, locale: 'en' as const }, { productLegacyId: product.id, locale: 'ar' as const }]),
    variants: cms.products.flatMap((product) => (product.variants ?? []).map((variant) => ({ variantLegacyId: variant.id, productLegacyId: product.id }))),
    homepageSelections: cms.homepageSections.flatMap((section) => (section.productIds ?? []).map((productLegacyId, displayOrder) => ({ sectionLegacyId: section.id, productLegacyId, displayOrder }))),
    navigation: cms.categories.filter((category) => category.showInNavigation).map((category) => ({ navigationLegacyId: `category:${category.id}`, categoryLegacyId: category.id, destination: category.navDestination || `/categories/${category.id}` })),
    storeSettings: { singleton: true },
  };
}

function assessBanners(banners: AdminStoreData['banners'], issues: ImportPlanIssue[]): void {
  for (const banner of banners) {
    if (banner.id === 'hero-default') addIssue(issues, 'warning', 'seed_data', `banners.${banner.id}`, 'This is the bundled default hero banner. Review it before importing as production content.');
    for (const [field, value] of Object.entries({ desktopImage: banner.desktopImage, mobileImage: banner.mobileImage })) {
      if (value.startsWith('/')) addIssue(issues, 'warning', 'storage', `banners.${banner.id}.${field}`, 'This banner uses a bundled static path, not portable media. It will remain a code asset unless replaced with uploaded media.');
    }
  }
}

async function createMappings(cms: AdminStoreData, media: PortableMediaRecord[], sourceFingerprint: string): Promise<LegacyIdMapping[]> {
  const inputs: Array<{ entityType: ImportEntityType; legacyId: string }> = [];
  for (const category of cms.categories) inputs.push({ entityType: 'category', legacyId: category.id });
  for (const product of cms.products) {
    inputs.push({ entityType: 'product', legacyId: product.id });
    for (const variant of product.variants ?? []) inputs.push({ entityType: 'variant', legacyId: variant.id });
  }
  for (const banner of cms.banners) inputs.push({ entityType: 'banner', legacyId: banner.id });
  for (const section of cms.homepageSections) inputs.push({ entityType: 'homepage_section', legacyId: section.id });
  for (const category of cms.categories.filter((item) => item.showInNavigation)) inputs.push({ entityType: 'navigation_entry', legacyId: `category:${category.id}` });
  for (const item of media) inputs.push({ entityType: 'media', legacyId: item.id });
  return Promise.all(inputs.map((input) => mappingFor(sourceFingerprint, input.entityType, input.legacyId)));
}

function selectedSectionProductCount(sections: HomepageSection[]): number {
  return sections.reduce((total, section) => total + (section.productIds?.length ?? 0), 0);
}

/**
 * Builds a portable, inspectable import manifest only. This function never
 * writes local data, calls Supabase, uploads media, or changes the source file.
 */
export async function preparePortableImport(jsonText: string): Promise<PreparedPortableImport> {
  let parsed: unknown;
  try { parsed = JSON.parse(jsonText) as unknown; }
  catch { return { validationIssues: [{ severity: 'error', path: 'file', message: 'The selected file is not valid JSON.' }], manifest: null }; }
  const validation = await validatePortableCmsExport(parsed);
  if (!validation.valid) return { validationIssues: validation.issues, manifest: null };
  const source = parsed as PortableCmsExport;
  const sourceFingerprint = await sha256Text(jsonText);
  const mappings = await createMappings(source.cms, source.media, sourceFingerprint);
  const issues: ImportPlanIssue[] = validation.issues.map((issue) => ({ ...issue, code: 'validation' }));
  assessProducts(source.cms.products, source.cms.categories, issues);
  assessBanners(source.cms.banners, issues);
  const storageUploads = gatherMediaUsage(source.cms, source.media, mappings, issues);
  return {
    validationIssues: validation.issues,
    manifest: {
      format: 'kdeals-stage5-import-plan', version: 1, sourceFingerprint, sourceExportedAt: source.exportedAt,
      counts: {
        products: source.cms.products.length, categories: source.cms.categories.length, translations: source.cms.products.length * 2,
        variants: source.cms.products.reduce((total, product) => total + (product.variants?.length ?? 0), 0), banners: source.cms.banners.length,
        homepageSections: source.cms.homepageSections.length, navigationEntries: source.cms.categories.filter((category) => category.showInNavigation).length,
        media: source.media.length, documents: countDocuments(source.cms.products),
      },
      mappings,
      relationships: prepareRelationships(source.cms),
      storageUploads,
      issues,
    },
  };
}

export function canSubmitImportDryRun(manifest: ImportPreparationManifest): boolean {
  return !manifest.issues.some((issue) => issue.severity === 'error');
}

export function plannedManualSectionSelections(section: HomepageSection): number {
  return section.productIds?.length ?? 0;
}

export function plannedSectionProductCount(sections: HomepageSection[]): number {
  return selectedSectionProductCount(sections);
}
