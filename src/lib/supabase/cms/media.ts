import 'server-only';

import { createClient as createServiceClient } from '@supabase/supabase-js';
import { connection } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { CmsMediaAssetRow, SignedMediaUrl } from './types';

const maximumSignedUrlSeconds = 300;

function getServerSigningClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey || url.includes('<') || serviceRoleKey.includes('<')) {
    throw new Error('Private media signing is not configured.');
  }
  return createServiceClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}

async function readPublishedProductAsset(productId: string, assetId: string, document: boolean): Promise<void> {
  await connection();
  const publicClient = await createClient();
  const { data: product, error: productError } = await publicClient
    .from('products')
    .select('id, category_id')
    .eq('id', productId)
    .eq('status', 'published')
    .maybeSingle();
  if (productError || !product?.category_id) throw new Error('Product is not published.');
  const { data: category, error: categoryError } = await publicClient
    .from('categories')
    .select('id')
    .eq('id', product.category_id)
    .eq('enabled', true)
    .maybeSingle();
  if (categoryError || !category) throw new Error('Product category is not publicly available.');
  const relationship = document
    ? await publicClient.from('product_documents').select('media_asset_id').eq('product_id', productId).eq('media_asset_id', assetId).maybeSingle()
    : await publicClient.from('product_media').select('media_asset_id').eq('product_id', productId).eq('media_asset_id', assetId).maybeSingle();
  if (relationship.error || !relationship.data) throw new Error('Media is not available for a published product.');
}

/**
 * Signs an image only after the caller's public RLS view proves the product and
 * media relationship are published. The service-role key stays server-only and
 * is never returned; only a short-lived object URL is returned to the caller.
 */
export async function signPublishedProductImage(productId: string, assetId: string, expiresInSeconds = 120): Promise<SignedMediaUrl> {
  await readPublishedProductAsset(productId, assetId, false);
  return signVerifiedAsset(assetId, 'image', ['product-images'], expiresInSeconds);
}

/** Equivalent published-content guard for product PDF documents. */
export async function signPublishedProductDocument(productId: string, assetId: string, expiresInSeconds = 120): Promise<SignedMediaUrl> {
  await readPublishedProductAsset(productId, assetId, true);
  return signVerifiedAsset(assetId, 'document', ['product-documents'], expiresInSeconds);
}

/** Signs an enabled category's configured image without exposing its bucket path. */
export async function signPublishedCategoryImage(categoryId: string, assetId: string, expiresInSeconds = 120): Promise<SignedMediaUrl> {
  await connection();
  const publicClient = await createClient();
  const { data, error } = await publicClient
    .from('categories')
    .select('id')
    .eq('id', categoryId)
    .eq('image_asset_id', assetId)
    .eq('enabled', true)
    .maybeSingle();
  if (error || !data) throw new Error('Category media is not publicly available.');
  return signVerifiedAsset(assetId, 'image', ['product-images', 'site-banners'], expiresInSeconds);
}

/** Signs only a currently active banner's configured image. */
export async function signPublishedBannerImage(bannerId: string, assetId: string, expiresInSeconds = 120): Promise<SignedMediaUrl> {
  await connection();
  const publicClient = await createClient();
  const now = new Date().toISOString();
  const { data, error } = await publicClient
    .from('banners')
    .select('id')
    .eq('id', bannerId)
    .eq('enabled', true)
    .or(`desktop_image_asset_id.eq.${assetId},mobile_image_asset_id.eq.${assetId}`)
    .or(`starts_at.is.null,starts_at.lte.${now}`)
    .or(`ends_at.is.null,ends_at.gt.${now}`)
    .maybeSingle();
  if (error || !data) throw new Error('Banner media is not publicly available.');
  return signVerifiedAsset(assetId, 'image', ['site-banners'], expiresInSeconds);
}

async function signVerifiedAsset(
  assetId: string,
  expectedKind: CmsMediaAssetRow['kind'],
  allowedBuckets: CmsMediaAssetRow['storage_bucket'][],
  requestedSeconds: number,
): Promise<SignedMediaUrl> {
  const signer = getServerSigningClient();
  const { data: asset, error: assetError } = await signer.from('media_assets').select('*').eq('id', assetId).maybeSingle();
  if (assetError || !asset) throw new Error('Media asset was not found.');
  const media = asset as CmsMediaAssetRow;
  if (media.kind !== expectedKind) throw new Error('Media type does not match the requested delivery method.');
  if (!allowedBuckets.includes(media.storage_bucket)) throw new Error('Media is stored in an invalid bucket for this delivery method.');
  const expiresInSeconds = Math.max(1, Math.min(Math.floor(requestedSeconds), maximumSignedUrlSeconds));
  const { data, error } = await signer.storage.from(media.storage_bucket).createSignedUrl(media.storage_path, expiresInSeconds);
  if (error || !data?.signedUrl) throw new Error('Could not create a private media URL.');
  return { assetId, url: data.signedUrl, expiresInSeconds };
}
