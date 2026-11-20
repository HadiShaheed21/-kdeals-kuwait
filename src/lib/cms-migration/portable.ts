import type { AdminStoreData } from '@/lib/admin-repository';
import type { MediaRecord } from '@/lib/media-repository';

const FORMAT = 'kdeals-stage5-cms-export';
const VERSION = 1;
const maxMediaBytes = 8 * 1024 * 1024;
const supportedMediaTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);

export interface PortableMediaRecord {
  id: string;
  name: string;
  type: string;
  size: number;
  alt: string;
  createdAt: string;
  sha256: string;
  dataBase64: string;
}

export interface PortableCmsExport {
  format: typeof FORMAT;
  version: typeof VERSION;
  exportedAt: string;
  cms: AdminStoreData;
  media: PortableMediaRecord[];
}

export interface MigrationValidationIssue {
  severity: 'error' | 'warning';
  path: string;
  message: string;
}

export interface MigrationValidationResult {
  valid: boolean;
  issues: MigrationValidationIssue[];
  summary: { products: number; categories: number; banners: number; media: number; variants: number };
}

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

function fromBase64(value: string): ArrayBuffer {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes.buffer;
}

async function sha256(buffer: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function createPortableCmsExport(cms: AdminStoreData, media: MediaRecord[]): Promise<PortableCmsExport> {
  const exportedMedia = await Promise.all(media.map(async (item) => {
    const buffer = await item.blob.arrayBuffer();
    return { id: item.id, name: item.name, type: item.type, size: item.size, alt: item.alt, createdAt: item.createdAt, sha256: await sha256(buffer), dataBase64: toBase64(buffer) };
  }));
  return { format: FORMAT, version: VERSION, exportedAt: new Date().toISOString(), cms, media: exportedMedia };
}

export function downloadPortableCmsExport(payload: PortableCmsExport): void {
  const file = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(file);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `kdeals-cms-export-${payload.exportedAt.slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function stringField(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function numberField(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function mediaIdFromRef(value: unknown): string | null {
  return typeof value === 'string' && value.startsWith('media:') ? value.slice(6) : null;
}

function addDuplicateIssues(values: unknown[], path: string, issues: MigrationValidationIssue[]): Set<string> {
  const ids = new Set<string>();
  for (const [index, value] of values.entries()) {
    const id = isRecord(value) && stringField(value.id) ? value.id : '';
    if (!id) issues.push({ severity: 'error', path: `${path}[${index}].id`, message: 'A non-empty identifier is required.' });
    else if (ids.has(id)) issues.push({ severity: 'error', path: `${path}[${index}].id`, message: `Duplicate identifier: ${id}.` });
    else ids.add(id);
  }
  return ids;
}

function validKwd(value: unknown): boolean {
  if (!numberField(value) || value < 0 || value >= 10_000_000) return false;
  const decimals = String(value).split('.')[1];
  return !decimals || decimals.length <= 3;
}

/**
 * Read-only import validation. It deliberately produces issues for every
 * unsupported or inconsistent record and never drops or repairs input data.
 */
export async function validatePortableCmsExport(value: unknown): Promise<MigrationValidationResult> {
  const issues: MigrationValidationIssue[] = [];
  if (!isRecord(value) || value.format !== FORMAT || value.version !== VERSION || !isRecord(value.cms) || !Array.isArray(value.media)) {
    return { valid: false, issues: [{ severity: 'error', path: 'root', message: 'This is not a supported K DEALS portable CMS export.' }], summary: { products: 0, categories: 0, banners: 0, media: 0, variants: 0 } };
  }
  const cms = value.cms;
  const products = Array.isArray(cms.products) ? cms.products : [];
  const categories = Array.isArray(cms.categories) ? cms.categories : [];
  const banners = Array.isArray(cms.banners) ? cms.banners : [];
  const sections = Array.isArray(cms.homepageSections) ? cms.homepageSections : [];
  if (!Array.isArray(cms.products)) issues.push({ severity: 'error', path: 'cms.products', message: 'Products must be an array.' });
  if (!Array.isArray(cms.categories)) issues.push({ severity: 'error', path: 'cms.categories', message: 'Categories must be an array.' });
  if (!Array.isArray(cms.banners)) issues.push({ severity: 'error', path: 'cms.banners', message: 'Banners must be an array.' });
  if (!Array.isArray(cms.homepageSections)) issues.push({ severity: 'error', path: 'cms.homepageSections', message: 'Homepage sections must be an array.' });

  const productIds = addDuplicateIssues(products, 'cms.products', issues);
  const categoryIds = addDuplicateIssues(categories, 'cms.categories', issues);
  addDuplicateIssues(banners, 'cms.banners', issues);
  const mediaIds = addDuplicateIssues(value.media, 'media', issues);
  const mediaTypes = new Map(value.media.filter(isRecord).filter((media): media is Record<string, unknown> & { id: string; type: string } => stringField(media.id) && stringField(media.type)).map((media) => [media.id, media.type]));
  let variants = 0;

  for (const [index, product] of products.entries()) {
    if (!isRecord(product)) { issues.push({ severity: 'error', path: `cms.products[${index}]`, message: 'Product must be an object.' }); continue; }
    if (!stringField(product.nameEn) || !stringField(product.nameAr)) issues.push({ severity: 'error', path: `cms.products[${index}]`, message: 'English and Arabic product names are required.' });
    if (!stringField(product.slug)) issues.push({ severity: 'error', path: `cms.products[${index}].slug`, message: 'A product slug is required.' });
    if (!stringField(product.categoryId) || !categoryIds.has(product.categoryId)) issues.push({ severity: 'error', path: `cms.products[${index}].categoryId`, message: 'Product references a missing category.' });
    if (!validKwd(product.price)) issues.push({ severity: 'error', path: `cms.products[${index}].price`, message: 'Price must be a non-negative KWD amount with at most three decimals.' });
    if (product.originalPrice !== undefined && !validKwd(product.originalPrice)) issues.push({ severity: 'error', path: `cms.products[${index}].originalPrice`, message: 'Original price must be a non-negative KWD amount with at most three decimals.' });
    const references = [mediaIdFromRef(product.image), ...(Array.isArray(product.mediaIds) ? product.mediaIds.filter((item): item is string => typeof item === 'string') : [])].filter((id): id is string => Boolean(id));
    for (const id of references) if (!mediaIds.has(id)) issues.push({ severity: 'error', path: `cms.products[${index}].media`, message: `Product references missing media ${id}.` });
    const productVariants = Array.isArray(product.variants) ? product.variants : [];
    const variantIds = addDuplicateIssues(productVariants, `cms.products[${index}].variants`, issues);
    variants += variantIds.size;
    for (const [variantIndex, variant] of productVariants.entries()) {
      if (!isRecord(variant) || !isRecord(variant.attributes) || !numberField(variant.priceAdjustment) || !numberField(variant.stock)) issues.push({ severity: 'error', path: `cms.products[${index}].variants[${variantIndex}]`, message: 'Variant attributes, price adjustment, and stock are required.' });
    }
    const documents = Array.isArray(product.documents) ? product.documents : [];
    for (const [documentIndex, document] of documents.entries()) {
      if (!isRecord(document) || !stringField(document.mediaId) || !mediaIds.has(document.mediaId)) issues.push({ severity: 'error', path: `cms.products[${index}].documents[${documentIndex}]`, message: 'Document references missing media.' });
      else if (mediaTypes.get(document.mediaId) !== 'application/pdf') issues.push({ severity: 'error', path: `cms.products[${index}].documents[${documentIndex}]`, message: 'Product documents must reference PDF media.' });
    }
  }

  for (const [index, category] of categories.entries()) {
    if (!isRecord(category) || !stringField(category.titleEn) || !stringField(category.titleAr)) issues.push({ severity: 'error', path: `cms.categories[${index}]`, message: 'English and Arabic category names are required.' });
  }
  for (const [index, banner] of banners.entries()) {
    if (!isRecord(banner) || !stringField(banner.titleEn) || !stringField(banner.titleAr) || !stringField(banner.destination) || !banner.destination.startsWith('/')) issues.push({ severity: 'error', path: `cms.banners[${index}]`, message: 'Banners require bilingual titles and an internal destination.' });
    if (isRecord(banner)) for (const key of ['desktopImage', 'mobileImage']) {
      const id = mediaIdFromRef(banner[key]);
      if (id && !mediaIds.has(id)) issues.push({ severity: 'error', path: `cms.banners[${index}].${key}`, message: `Banner references missing media ${id}.` });
    }
  }
  for (const [index, section] of sections.entries()) {
    if (!isRecord(section)) { issues.push({ severity: 'error', path: `cms.homepageSections[${index}]`, message: 'Homepage section must be an object.' }); continue; }
    const selected = Array.isArray(section.productIds) ? section.productIds : [];
    for (const productId of selected) if (typeof productId !== 'string' || !productIds.has(productId)) issues.push({ severity: 'error', path: `cms.homepageSections[${index}].productIds`, message: 'Homepage section references a missing product.' });
  }
  for (const [index, media] of value.media.entries()) {
    if (!isRecord(media) || !stringField(media.id) || !stringField(media.name) || !stringField(media.type) || !stringField(media.sha256) || !stringField(media.dataBase64) || !numberField(media.size)) { issues.push({ severity: 'error', path: `media[${index}]`, message: 'Media metadata, checksum, and data are required.' }); continue; }
    if (!supportedMediaTypes.has(media.type)) issues.push({ severity: 'error', path: `media[${index}].type`, message: `Unsupported media type ${media.type}.` });
    if (media.size > maxMediaBytes) issues.push({ severity: 'error', path: `media[${index}].size`, message: 'Media exceeds the Stage 4 8 MB source limit.' });
    try {
      const data = fromBase64(media.dataBase64);
      if (data.byteLength !== media.size) issues.push({ severity: 'error', path: `media[${index}].size`, message: 'Declared media size does not match export data.' });
      if (await sha256(data) !== media.sha256.toLowerCase()) issues.push({ severity: 'error', path: `media[${index}].sha256`, message: 'Media checksum does not match export data.' });
    } catch { issues.push({ severity: 'error', path: `media[${index}].dataBase64`, message: 'Media data is not valid base64.' }); }
  }
  return { valid: !issues.some((issue) => issue.severity === 'error'), issues, summary: { products: products.length, categories: categories.length, banners: banners.length, media: value.media.length, variants } };
}
