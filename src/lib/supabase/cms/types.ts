export type CmsId = string;
/** PostgREST numeric values may be serialized as strings or JSON numbers. */
export type KwdNumeric = string | number;
export type CmsLocale = 'en' | 'ar';
export type CmsProductStatus = 'draft' | 'published' | 'archived';
export type CmsMediaKind = 'image' | 'document';
export type CmsHomepageTheme = 'default' | 'purple' | 'orange' | 'yellow';

export interface CmsCategoryRow {
  id: CmsId;
  legacy_id: string | null;
  parent_id: CmsId | null;
  slug: string;
  title_en: string;
  title_ar: string;
  description_en: string;
  description_ar: string;
  image_asset_id: CmsId | null;
  enabled: boolean;
  show_on_homepage: boolean;
  show_in_navigation: boolean;
  display_order: number;
  nav_label_en: string | null;
  nav_label_ar: string | null;
  nav_destination: string | null;
  created_at: string;
  updated_at: string;
}

export interface CmsProductRow {
  id: CmsId;
  legacy_id: string | null;
  category_id: CmsId | null;
  slug: string;
  sku: string | null;
  status: CmsProductStatus;
  price: KwdNumeric;
  original_price: KwdNumeric | null;
  discount_percent: KwdNumeric;
  stock: number;
  featured: boolean;
  bestseller: boolean;
  trending: boolean;
  new_arrival: boolean;
  flash_sale: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface CmsProductTranslationRow {
  product_id: CmsId;
  locale: CmsLocale;
  name: string;
  description: string;
  badge_label: string | null;
}

export interface CmsProductVariantRow {
  id: CmsId;
  product_id: CmsId;
  legacy_variant_id: string | null;
  sku: string | null;
  name_en: string;
  name_ar: string;
  attributes: Record<string, string>;
  price_adjustment: KwdNumeric;
  stock: number;
  enabled: boolean;
  display_order: number;
  image_asset_id: CmsId | null;
  created_at: string;
  updated_at: string;
}

export interface CmsMediaAssetRow {
  id: CmsId;
  legacy_media_id: string | null;
  storage_bucket: 'product-images' | 'product-documents' | 'site-banners';
  storage_path: string;
  kind: CmsMediaKind;
  mime_type: string;
  byte_size: number;
  original_filename: string;
  alt_text: string;
  created_by: CmsId | null;
  created_at: string;
  updated_at: string;
}

export interface CmsProductMediaRow {
  product_id: CmsId;
  media_asset_id: CmsId;
  display_order: number;
  is_primary: boolean;
  alt_text: string;
}

export interface CmsProductDocumentRow {
  id: CmsId;
  product_id: CmsId;
  media_asset_id: CmsId;
  label_en: string;
  label_ar: string;
  display_order: number;
  created_at: string;
}

export interface CmsHomepageSectionRow {
  id: CmsId;
  section_key: 'categories' | 'flash-sale' | 'best-sellers' | 'trending' | 'new-arrivals' | 'electronics' | 'promotions';
  enabled: boolean;
  display_order: number;
  title_en: string;
  title_ar: string;
  subtitle_en: string;
  subtitle_ar: string;
  max_products: number | null;
  theme: CmsHomepageTheme;
  created_at: string;
  updated_at: string;
}

export interface CmsHomepageSectionProductRow {
  section_id: CmsId;
  product_id: CmsId;
  display_order: number;
}

export interface CmsBannerRow {
  id: CmsId;
  legacy_id: string | null;
  title_en: string;
  title_ar: string;
  subtitle_en: string;
  subtitle_ar: string;
  cta_label_en: string;
  cta_label_ar: string;
  destination: string;
  desktop_image_asset_id: CmsId | null;
  mobile_image_asset_id: CmsId | null;
  enabled: boolean;
  display_order: number;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CmsNavigationEntryRow {
  id: CmsId;
  category_id: CmsId | null;
  label_en: string;
  label_ar: string;
  destination: string;
  enabled: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface CmsStoreSettingsRow {
  singleton: boolean;
  display_name: string;
  contact_phone: string;
  contact_email: string;
  whatsapp_number: string;
  delivery_info: string;
  delivery_message_en: string;
  delivery_message_ar: string;
  announcement_en: string;
  announcement_ar: string;
  announcement_visible: boolean;
  free_delivery_threshold: KwdNumeric | null;
  updated_at: string;
}

/** Owner-only import bookkeeping. These records are never exposed to the storefront. */
export interface CmsLegacyIdMapRow {
  entity_type: 'product' | 'category' | 'variant' | 'banner' | 'media' | 'homepage_section' | 'navigation_entry';
  legacy_id: string;
  entity_id: CmsId;
  source_fingerprint: string;
  imported_at: string;
}

export interface CmsImportBatchRow {
  id: CmsId;
  source_name: string;
  source_fingerprint: string;
  status: 'started' | 'validated' | 'staged' | 'media_uploaded' | 'applying' | 'reconciling' | 'completed' | 'failed' | 'rolled_back';
  records_imported: number;
  details: Record<string, unknown>;
  created_at: string;
  completed_at: string | null;
}

export interface CmsOwnerImportState {
  legacyIdMap: CmsLegacyIdMapRow[];
  importBatches: CmsImportBatchRow[];
  mediaAssets: CmsMediaAssetRow[];
}

export interface CmsPublicSnapshot {
  categories: CmsCategoryRow[];
  products: CmsProductRow[];
  translations: CmsProductTranslationRow[];
  variants: CmsProductVariantRow[];
  productMedia: CmsProductMediaRow[];
  documents: CmsProductDocumentRow[];
  banners: CmsBannerRow[];
  homepageSections: CmsHomepageSectionRow[];
  homepageSectionProducts: CmsHomepageSectionProductRow[];
  navigation: CmsNavigationEntryRow[];
  storeSettings: CmsStoreSettingsRow | null;
}

export interface CmsAdminSnapshot extends CmsPublicSnapshot {
  mediaAssets: CmsMediaAssetRow[];
}

export type CmsCrudTable =
  | 'categories'
  | 'products'
  | 'product_translations'
  | 'product_variants'
  | 'product_media'
  | 'product_documents'
  | 'homepage_sections'
  | 'homepage_section_products'
  | 'banners'
  | 'navigation_entries'
  | 'store_settings'
  | 'media_assets';

export interface CmsCrudRowMap {
  categories: CmsCategoryRow;
  products: CmsProductRow;
  product_translations: CmsProductTranslationRow;
  product_variants: CmsProductVariantRow;
  product_media: CmsProductMediaRow;
  product_documents: CmsProductDocumentRow;
  homepage_sections: CmsHomepageSectionRow;
  homepage_section_products: CmsHomepageSectionProductRow;
  banners: CmsBannerRow;
  navigation_entries: CmsNavigationEntryRow;
  store_settings: CmsStoreSettingsRow;
  media_assets: CmsMediaAssetRow;
}

export type CmsCreateInput<T extends CmsCrudTable> = Omit<CmsCrudRowMap[T], 'id' | 'created_at' | 'updated_at'>;
export type CmsUpdateInput<T extends CmsCrudTable> = Partial<CmsCreateInput<T>>;

export interface SignedMediaUrl {
  assetId: CmsId;
  url: string;
  expiresInSeconds: number;
}
