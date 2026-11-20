'use server';

import { revalidatePath } from 'next/cache';
import { randomUUID } from 'node:crypto';
import { getAdminAuthorization } from '@/lib/supabase/admin-auth';
import { createClient } from '@/lib/supabase/server';
import { toKwdNumeric } from '@/lib/supabase/cms/mappers';
import { mapCmsSnapshotToLocalShape } from '@/lib/supabase/cms/mappers';
import { readAdminCmsSnapshot } from '@/lib/supabase/cms/repository';
import type { AdminCategory, AdminProduct, HomepageSection, StoreSettings } from '@/lib/admin-repository';
import type { AdminBanner } from '@/lib/admin-repository';

const stagingProjectRef = 'ncjtivoghlbbqlkfxrzs';

function writesEnabled(): boolean {
  return process.env.KDEALS_ADMIN_REMOTE_WRITES === 'staging'
    && process.env.NEXT_PUBLIC_SUPABASE_URL === `https://${stagingProjectRef}.supabase.co`;
}

async function requireStagingAdmin() {
  if (!writesEnabled()) throw new Error('Remote CMS writes are disabled outside the explicitly configured staging project.');
  const authorization = await getAdminAuthorization();
  if (authorization.status !== 'authorized') throw new Error('An active administrator session is required.');
  return createClient();
}

export async function loadRemoteAdminStore() {
  if (!writesEnabled()) throw new Error('Remote CMS mode is available only for the configured staging project.');
  await requireStagingAdmin();
  return mapCmsSnapshotToLocalShape(await readAdminCmsSnapshot());
}

export async function getRemoteCmsMode(): Promise<boolean> {
  return writesEnabled();
}

export async function listRemoteMedia(kind: 'image' | 'document' = 'image') {
  const client = await requireStagingAdmin();
  const { data, error } = await client.from('media_assets').select('id,kind,mime_type,original_filename,alt_text,storage_bucket,storage_path,created_at').eq('kind', kind).order('created_at', { ascending: false });
  if (error) throw new Error('Could not load remote media.');
  return data ?? [];
}

export async function getRemoteMediaPreview(assetId: string): Promise<string> {
  const client = await requireStagingAdmin();
  const { data: asset, error } = await client.from('media_assets').select('storage_bucket,storage_path').eq('id', assetId).maybeSingle();
  if (error || !asset) throw new Error('Media asset was not found.');
  const { data, error: urlError } = await client.storage.from(asset.storage_bucket).createSignedUrl(asset.storage_path, 120);
  if (urlError || !data?.signedUrl) throw new Error('Could not create a private media preview.');
  return data.signedUrl;
}

export async function saveRemoteCategory(category: AdminCategory): Promise<void> {
  const client = await requireStagingAdmin();
  const { error } = await client.from('categories').upsert({
    legacy_id: category.id,
    slug: category.id,
    title_en: category.titleEn,
    title_ar: category.titleAr,
    description_en: category.descriptionEn ?? '',
    description_ar: category.descriptionAr ?? '',
    enabled: category.active,
    show_on_homepage: category.showOnHomepage,
    show_in_navigation: category.showInNavigation,
    display_order: category.displayOrder,
    nav_label_en: category.navLabelEn ?? null,
    nav_label_ar: category.navLabelAr ?? null,
    nav_destination: category.navDestination ?? `/categories/${category.id}`,
  }, { onConflict: 'legacy_id' });
  if (error) throw new Error('Could not save the category to Supabase.');
  revalidatePath('/');
}

export async function saveRemoteProduct(product: AdminProduct): Promise<void> {
  const client = await requireStagingAdmin();
  const { data: category, error: categoryError } = await client.from('categories').select('id').eq('legacy_id', product.categoryId).maybeSingle();
  if (categoryError || !category) throw new Error('Save the selected category to Supabase before saving this product.');
  const { data: saved, error } = await client.from('products').upsert({
    legacy_id: product.id,
    category_id: category.id,
    slug: product.slug,
    sku: product.sku ?? null,
    status: product.active ? 'published' : 'draft',
    price: toKwdNumeric(product.price),
    original_price: toKwdNumeric(Math.max(product.originalPrice, product.price)),
    discount_percent: toKwdNumeric(product.discountPercent),
    stock: product.stock,
    featured: Boolean(product.featured),
    bestseller: Boolean(product.isBestseller),
    trending: Boolean(product.trending),
    new_arrival: Boolean(product.isNew),
    flash_sale: Boolean(product.flashSale),
    display_order: product.displayOrder ?? 0,
  }, { onConflict: 'legacy_id' }).select('id').single();
  if (error || !saved) throw new Error('Could not save the product to Supabase.');
  const { error: translationsError } = await client.from('product_translations').upsert([
    { product_id: saved.id, locale: 'en', name: product.nameEn, description: product.descriptionEn ?? '', badge_label: product.badgeLabel ?? null },
    { product_id: saved.id, locale: 'ar', name: product.nameAr, description: product.descriptionAr ?? '', badge_label: null },
  ], { onConflict: 'product_id,locale' });
  if (translationsError) throw new Error('The product was saved, but its translations could not be saved.');
  const variants = (product.variants ?? []).map((variant, index) => ({
    product_id: saved.id, legacy_variant_id: variant.id, sku: variant.sku ?? null,
    name_en: variant.nameEn ?? '', name_ar: variant.nameAr ?? '', attributes: variant.attributes,
    price_adjustment: toKwdNumeric(Math.max(0, variant.priceAdjustment)), stock: variant.stock,
    enabled: variant.active, display_order: index,
  }));
  if (variants.length) {
    const { error: variantsError } = await client.from('product_variants').upsert(variants, { onConflict: 'product_id,legacy_variant_id' });
    if (variantsError) throw new Error('The product was saved, but its variants could not be saved.');
  }
  revalidatePath('/'); revalidatePath('/products');
}

export async function saveRemoteStoreSettings(settings: StoreSettings, whatsappNumber: string): Promise<void> {
  const client = await requireStagingAdmin();
  const { error } = await client.from('store_settings').upsert({ singleton: true, display_name: settings.displayName, contact_phone: settings.contactPhone, contact_email: settings.contactEmail, whatsapp_number: whatsappNumber, delivery_info: settings.deliveryInfo, delivery_message_en: settings.deliveryMessageEn, delivery_message_ar: settings.deliveryMessageAr, announcement_en: settings.announcementEn, announcement_ar: settings.announcementAr, announcement_visible: settings.announcementVisible, free_delivery_threshold: settings.freeDeliveryThreshold === undefined ? null : toKwdNumeric(settings.freeDeliveryThreshold) }, { onConflict: 'singleton' });
  if (error) throw new Error('Could not save store settings to Supabase.');
  revalidatePath('/');
}

export async function saveRemoteHomepageSection(section: HomepageSection): Promise<void> {
  const client = await requireStagingAdmin();
  const { error } = await client.from('homepage_sections').upsert({ section_key: section.id, enabled: section.visible, display_order: section.displayOrder, title_en: section.titleEn ?? '', title_ar: section.titleAr ?? '', subtitle_en: section.subtitleEn ?? '', subtitle_ar: section.subtitleAr ?? '', max_products: section.maxProducts ?? null, theme: section.theme ?? 'default' }, { onConflict: 'section_key' });
  if (error) throw new Error('Could not save the homepage section to Supabase.');
  revalidatePath('/');
}

export async function saveRemoteBanner(banner: AdminBanner): Promise<void> {
  const client = await requireStagingAdmin();
  const { data: existing } = await client.from('banners').select('desktop_image_asset_id,mobile_image_asset_id').eq('legacy_id', banner.id).maybeSingle();
  const { error } = await client.from('banners').upsert({ legacy_id: banner.id, title_en: banner.titleEn, title_ar: banner.titleAr, subtitle_en: banner.subtitleEn, subtitle_ar: banner.subtitleAr, cta_label_en: banner.ctaLabelEn, cta_label_ar: banner.ctaLabelAr, destination: banner.destination, enabled: banner.enabled, display_order: banner.displayOrder, desktop_image_asset_id: existing?.desktop_image_asset_id ?? null, mobile_image_asset_id: existing?.mobile_image_asset_id ?? null }, { onConflict: 'legacy_id' });
  if (error) throw new Error('Could not save the banner to Supabase.');
  revalidatePath('/');
}

export async function saveRemoteNavigation(category: AdminCategory): Promise<void> {
  const client = await requireStagingAdmin();
  const { data: remoteCategory, error: categoryError } = await client.from('categories').select('id').eq('legacy_id', category.id).maybeSingle();
  if (categoryError || !remoteCategory) throw new Error('Save the category to Supabase before saving its navigation entry.');
  const values = { category_id: remoteCategory.id, label_en: category.navLabelEn || category.titleEn, label_ar: category.navLabelAr || category.titleAr, destination: category.navDestination || `/categories/${category.id}`, enabled: category.active && category.showInNavigation, display_order: category.displayOrder };
  const { data: existing, error: readError } = await client.from('navigation_entries').select('id').eq('category_id', remoteCategory.id).maybeSingle();
  if (readError) throw new Error('Could not load the navigation entry.');
  const { error } = existing ? await client.from('navigation_entries').update(values).eq('id', existing.id) : await client.from('navigation_entries').insert(values);
  if (error) throw new Error('Could not save navigation to Supabase.');
  revalidatePath('/');
}

const imageMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

function hasExpectedSignature(bytes: Uint8Array, mimeType: string): boolean {
  if (mimeType === 'image/jpeg') return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mimeType === 'image/png') return bytes.length >= 8 && bytes.slice(0, 8).every((value, index) => value === [137, 80, 78, 71, 13, 10, 26, 10][index]);
  return bytes.length >= 12 && new TextDecoder().decode(bytes.slice(0, 4)) === 'RIFF' && new TextDecoder().decode(bytes.slice(8, 12)) === 'WEBP';
}

/** Uploads authenticated admin media into private Storage after server-side type, size and magic-byte validation. */
export async function uploadRemoteMedia(formData: FormData): Promise<{ assetId: string }> {
  const client = await requireStagingAdmin();
  const file = formData.get('file');
  const purpose = formData.get('purpose');
  if (!(file instanceof File) || (purpose !== 'product' && purpose !== 'category' && purpose !== 'banner' && purpose !== 'document')) throw new Error('Invalid media upload request.');
  const isDocument = purpose === 'document';
  const validMime = isDocument ? file.type === 'application/pdf' : imageMimeTypes.has(file.type);
  const maxBytes = isDocument ? 15 * 1024 * 1024 : 8 * 1024 * 1024;
  if (!validMime || file.size <= 0 || file.size > maxBytes) throw new Error('The selected file type or size is not allowed.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  const signatureValid = isDocument ? bytes.length >= 5 && new TextDecoder().decode(bytes.slice(0, 5)) === '%PDF-' : hasExpectedSignature(bytes, file.type);
  if (!signatureValid) throw new Error('The selected file does not match its declared type.');
  const assetId = randomUUID();
  const extension = file.type === 'image/jpeg' ? 'jpg' : file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'pdf';
  const bucket = isDocument ? 'product-documents' : purpose === 'banner' ? 'site-banners' : 'product-images';
  const path = `admin/${assetId}.${extension}`;
  const { error: uploadError } = await client.storage.from(bucket).upload(path, bytes, { contentType: file.type, upsert: false });
  if (uploadError) throw new Error('Could not upload the private media object.');
  const { error: assetError } = await client.from('media_assets').insert({ id: assetId, storage_bucket: bucket, storage_path: path, kind: isDocument ? 'document' : 'image', mime_type: file.type, byte_size: file.size, original_filename: file.name, alt_text: String(formData.get('alt') ?? '') });
  if (assetError) {
    await client.storage.from(bucket).remove([path]);
    throw new Error('The media record could not be created.');
  }
  return { assetId };
}

export async function attachRemoteProductMedia(productLegacyId: string, assetId: string, primary = false): Promise<void> {
  const client = await requireStagingAdmin();
  const { data: product } = await client.from('products').select('id').eq('legacy_id', productLegacyId).maybeSingle();
  if (!product) throw new Error('Save the product to Supabase before attaching media.');
  if (primary) {
    const { error } = await client.from('product_media').update({ is_primary: false }).eq('product_id', product.id);
    if (error) throw new Error('Could not update the primary product image.');
  }
  const { error } = await client.from('product_media').upsert({ product_id: product.id, media_asset_id: assetId, display_order: 0, is_primary: primary, alt_text: '' }, { onConflict: 'product_id,media_asset_id' });
  if (error) throw new Error('Could not attach media to the product.');
  revalidatePath('/'); revalidatePath(`/products/${productLegacyId}`);
}

export async function attachRemoteProductDocument(productLegacyId: string, assetId: string, labelEn: string, labelAr: string): Promise<void> {
  const client = await requireStagingAdmin();
  const { data: product } = await client.from('products').select('id').eq('legacy_id', productLegacyId).maybeSingle();
  if (!product) throw new Error('Save the product to Supabase before attaching a document.');
  const { error } = await client.from('product_documents').insert({ product_id: product.id, media_asset_id: assetId, label_en: labelEn, label_ar: labelAr, display_order: 0 });
  if (error) throw new Error('Could not attach the product document.');
}

export async function setRemoteCategoryImage(categoryLegacyId: string, assetId: string): Promise<void> {
  const client = await requireStagingAdmin();
  const { error } = await client.from('categories').update({ image_asset_id: assetId }).eq('legacy_id', categoryLegacyId);
  if (error) throw new Error('Could not update the category image.');
  revalidatePath('/');
}

export async function setRemoteBannerImage(bannerLegacyId: string, assetId: string, target: 'desktop' | 'mobile'): Promise<void> {
  const client = await requireStagingAdmin();
  const patch = target === 'desktop' ? { desktop_image_asset_id: assetId } : { mobile_image_asset_id: assetId };
  const { error } = await client.from('banners').update(patch).eq('legacy_id', bannerLegacyId);
  if (error) throw new Error('Could not update the banner image.');
  revalidatePath('/');
}

export async function updateRemoteProductGallery(productLegacyId: string, assetIds: string[], primaryAssetId?: string): Promise<void> {
  const client = await requireStagingAdmin();
  const { data: product } = await client.from('products').select('id').eq('legacy_id', productLegacyId).maybeSingle();
  if (!product) throw new Error('Product was not found in Supabase.');
  const { error: removeError } = await client.from('product_media').delete().eq('product_id', product.id);
  if (removeError) throw new Error('Could not replace the product gallery.');
  if (assetIds.length) {
    const { error } = await client.from('product_media').insert(assetIds.map((media_asset_id, display_order) => ({ product_id: product.id, media_asset_id, display_order, is_primary: media_asset_id === (primaryAssetId ?? assetIds[0]), alt_text: '' })));
    if (error) throw new Error('Could not save the product gallery.');
  }
  revalidatePath('/'); revalidatePath(`/products/${productLegacyId}`);
}

export async function archiveRemoteProduct(productLegacyId: string): Promise<void> {
  const client = await requireStagingAdmin();
  const { error } = await client.from('products').update({ status: 'archived' }).eq('legacy_id', productLegacyId);
  if (error) throw new Error('Could not archive the product.');
  revalidatePath('/'); revalidatePath('/products');
}

export async function deleteRemoteCategory(categoryLegacyId: string, replacementLegacyId: string): Promise<void> {
  const client = await requireStagingAdmin();
  const { data: source } = await client.from('categories').select('id').eq('legacy_id', categoryLegacyId).maybeSingle();
  const { data: replacement } = await client.from('categories').select('id').eq('legacy_id', replacementLegacyId).maybeSingle();
  if (!source || !replacement || source.id === replacement.id) throw new Error('Choose a valid replacement category.');
  const { error: reassignError } = await client.from('products').update({ category_id: replacement.id }).eq('category_id', source.id);
  if (reassignError) throw new Error('Could not reassign category products.');
  const { error } = await client.from('categories').delete().eq('id', source.id);
  if (error) throw new Error('Could not delete the category.');
  revalidatePath('/'); revalidatePath('/categories');
}

export async function saveRemoteHomepageProducts(sectionKey: HomepageSection['id'], productLegacyIds: string[]): Promise<void> {
  const client = await requireStagingAdmin();
  const { data: section } = await client.from('homepage_sections').select('id').eq('section_key', sectionKey).maybeSingle();
  if (!section) throw new Error('Save the homepage section before selecting products.');
  const { data: products } = await client.from('products').select('id,legacy_id,status').in('legacy_id', productLegacyIds);
  if ((products ?? []).length !== productLegacyIds.length || products?.some((product) => product.status !== 'published')) throw new Error('Only existing published products can be selected.');
  const byLegacyId = new Map((products ?? []).map((product) => [product.legacy_id, product.id]));
  const { error: removeError } = await client.from('homepage_section_products').delete().eq('section_id', section.id);
  if (removeError) throw new Error('Could not replace section products.');
  if (productLegacyIds.length) { const { error } = await client.from('homepage_section_products').insert(productLegacyIds.map((legacyId, display_order) => ({ section_id: section.id, product_id: byLegacyId.get(legacyId), display_order }))); if (error) throw new Error('Could not save section products.'); }
  revalidatePath('/');
}
