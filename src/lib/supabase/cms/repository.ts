import 'server-only';

import { connection } from 'next/server';
import { getAdminAuthorization } from '@/lib/supabase/admin-auth';
import { createClient } from '@/lib/supabase/server';
import type {
  CmsAdminSnapshot,
  CmsCreateInput,
  CmsCrudRowMap,
  CmsCrudTable,
  CmsOwnerImportState,
  CmsPublicSnapshot,
  CmsStoreSettingsRow,
  CmsUpdateInput,
} from './types';

type ServerClient = Awaited<ReturnType<typeof createClient>>;

export class CmsDataAccessError extends Error {
  constructor(message: string, readonly code: 'forbidden' | 'unavailable' | 'query_failed') {
    super(message);
  }
}

const publicTables = {
  categories: 'categories',
  products: 'products',
  translations: 'product_translations',
  variants: 'product_variants',
  productMedia: 'product_media',
  documents: 'product_documents',
  banners: 'banners',
  homepageSections: 'homepage_sections',
  homepageSectionProducts: 'homepage_section_products',
  navigation: 'navigation_entries',
} as const;

async function selectRows<T>(client: ServerClient, table: string, orderBy?: string): Promise<T[]> {
  let query = client.from(table).select('*');
  if (orderBy) query = query.order(orderBy, { ascending: true });
  const { data, error } = await query;
  if (error) throw new CmsDataAccessError(`Could not read ${table}.`, 'query_failed');
  return Array.isArray(data) ? data as T[] : [];
}

async function selectSingle<T>(client: ServerClient, table: string): Promise<T | null> {
  const { data, error } = await client.from(table).select('*').maybeSingle();
  if (error) throw new CmsDataAccessError(`Could not read ${table}.`, 'query_failed');
  return data ? data as T : null;
}

async function requireAdminClient(): Promise<ServerClient> {
  await connection();
  const authorization = await getAdminAuthorization();
  if (authorization.status === 'unavailable') {
    throw new CmsDataAccessError('Supabase is not configured.', 'unavailable');
  }
  if (authorization.status !== 'authorized') {
    throw new CmsDataAccessError('An active admin session is required.', 'forbidden');
  }
  return createClient();
}

/**
 * Import planning is deliberately narrower than normal CMS access. The
 * database's owner-only RLS is still the final authority; this explicit
 * server-side role check prevents even an active editor from reaching import
 * bookkeeping through a Server Action.
 */
async function requireOwnerClient(): Promise<ServerClient> {
  await connection();
  const authorization = await getAdminAuthorization();
  if (authorization.status === 'unavailable') {
    throw new CmsDataAccessError('Supabase is not configured.', 'unavailable');
  }
  if (authorization.status !== 'authorized' || authorization.role !== 'owner') {
    throw new CmsDataAccessError('An active owner session is required.', 'forbidden');
  }
  return createClient();
}

/** Uses the public RLS surface only; it never accesses media asset paths. */
export async function readPublicCmsSnapshot(): Promise<CmsPublicSnapshot> {
  await connection();
  const client = await createClient();
  const [
    categories, products, translations, variants, productMedia, documents,
    banners, homepageSections, homepageSectionProducts, navigation, storeSettings,
  ] = await Promise.all([
    selectRows<CmsPublicSnapshot['categories'][number]>(client, publicTables.categories, 'display_order'),
    selectRows<CmsPublicSnapshot['products'][number]>(client, publicTables.products, 'display_order'),
    selectRows<CmsPublicSnapshot['translations'][number]>(client, publicTables.translations),
    selectRows<CmsPublicSnapshot['variants'][number]>(client, publicTables.variants, 'display_order'),
    selectRows<CmsPublicSnapshot['productMedia'][number]>(client, publicTables.productMedia, 'display_order'),
    selectRows<CmsPublicSnapshot['documents'][number]>(client, publicTables.documents, 'display_order'),
    selectRows<CmsPublicSnapshot['banners'][number]>(client, publicTables.banners, 'display_order'),
    selectRows<CmsPublicSnapshot['homepageSections'][number]>(client, publicTables.homepageSections, 'display_order'),
    selectRows<CmsPublicSnapshot['homepageSectionProducts'][number]>(client, publicTables.homepageSectionProducts, 'display_order'),
    selectRows<CmsPublicSnapshot['navigation'][number]>(client, publicTables.navigation, 'display_order'),
    selectSingle<CmsStoreSettingsRow>(client, 'store_settings'),
  ]);

  return { categories, products, translations, variants, productMedia, documents, banners, homepageSections, homepageSectionProducts, navigation, storeSettings };
}

/** Reads the full CMS surface after both server-side authorization and RLS. */
export async function readAdminCmsSnapshot(): Promise<CmsAdminSnapshot> {
  const client = await requireAdminClient();
  const [publicSnapshot, mediaAssets] = await Promise.all([
    readSnapshotWithClient(client),
    selectRows<CmsAdminSnapshot['mediaAssets'][number]>(client, 'media_assets', 'created_at'),
  ]);
  return { ...publicSnapshot, mediaAssets };
}

/**
 * Read-only state used to detect replayed imports and legacy-ID conflicts.
 * No import row, mapping, CMS record, or Storage object is created here.
 */
export async function readOwnerImportState(): Promise<CmsOwnerImportState> {
  const client = await requireOwnerClient();
  const [legacyIdMap, importBatches, mediaAssets] = await Promise.all([
    selectRows<CmsOwnerImportState['legacyIdMap'][number]>(client, 'legacy_id_map', 'imported_at'),
    selectRows<CmsOwnerImportState['importBatches'][number]>(client, 'import_batches', 'created_at'),
    selectRows<CmsOwnerImportState['mediaAssets'][number]>(client, 'media_assets', 'created_at'),
  ]);
  return { legacyIdMap, importBatches, mediaAssets };
}

async function readSnapshotWithClient(client: ServerClient): Promise<CmsPublicSnapshot> {
  const [
    categories, products, translations, variants, productMedia, documents,
    banners, homepageSections, homepageSectionProducts, navigation, storeSettings,
  ] = await Promise.all([
    selectRows<CmsPublicSnapshot['categories'][number]>(client, publicTables.categories, 'display_order'),
    selectRows<CmsPublicSnapshot['products'][number]>(client, publicTables.products, 'display_order'),
    selectRows<CmsPublicSnapshot['translations'][number]>(client, publicTables.translations),
    selectRows<CmsPublicSnapshot['variants'][number]>(client, publicTables.variants, 'display_order'),
    selectRows<CmsPublicSnapshot['productMedia'][number]>(client, publicTables.productMedia, 'display_order'),
    selectRows<CmsPublicSnapshot['documents'][number]>(client, publicTables.documents, 'display_order'),
    selectRows<CmsPublicSnapshot['banners'][number]>(client, publicTables.banners, 'display_order'),
    selectRows<CmsPublicSnapshot['homepageSections'][number]>(client, publicTables.homepageSections, 'display_order'),
    selectRows<CmsPublicSnapshot['homepageSectionProducts'][number]>(client, publicTables.homepageSectionProducts, 'display_order'),
    selectRows<CmsPublicSnapshot['navigation'][number]>(client, publicTables.navigation, 'display_order'),
    selectSingle<CmsStoreSettingsRow>(client, 'store_settings'),
  ]);
  return { categories, products, translations, variants, productMedia, documents, banners, homepageSections, homepageSectionProducts, navigation, storeSettings };
}

/**
 * Ordinary CMS CRUD. Import bookkeeping is intentionally excluded: its RLS is
 * owner-only and Phase 2A does not expose import tooling.
 */
export async function adminCreate<T extends CmsCrudTable>(table: T, values: CmsCreateInput<T>): Promise<CmsCrudRowMap[T]> {
  const client = await requireAdminClient();
  // The browser client is intentionally untyped at this boundary; retain the
  // table-specific input map here rather than widening callers to `any`.
  const row = values as unknown as CmsCrudRowMap[T];
  const { data, error } = await client.from(table).insert(row).select('*').single();
  if (error || !data) throw new CmsDataAccessError(`Could not create ${table}.`, 'query_failed');
  return data as CmsCrudRowMap[T];
}

export async function adminUpdate<T extends CmsCrudTable>(table: T, idColumn: string, idValue: string | boolean, values: CmsUpdateInput<T>): Promise<CmsCrudRowMap[T]> {
  const client = await requireAdminClient();
  const patch = values as unknown as CmsCrudRowMap[T];
  const { data, error } = await client.from(table).update(patch).eq(idColumn, idValue).select('*').single();
  if (error || !data) throw new CmsDataAccessError(`Could not update ${table}.`, 'query_failed');
  return data as CmsCrudRowMap[T];
}

export async function adminDelete(table: CmsCrudTable, idColumn: string, idValue: string | boolean): Promise<void> {
  const client = await requireAdminClient();
  const { error } = await client.from(table).delete().eq(idColumn, idValue);
  if (error) throw new CmsDataAccessError(`Could not delete ${table}.`, 'query_failed');
}
