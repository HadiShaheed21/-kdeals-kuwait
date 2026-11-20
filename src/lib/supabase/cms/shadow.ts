import type { AdminStoreData } from '@/lib/admin-repository';
import type { CmsAdminSnapshot } from './types';

export interface CollectionReconciliation {
  localCount: number;
  remoteCount: number;
  localOnlyIds: string[];
  remoteOnlyIds: string[];
  duplicateRemoteLegacyIds: string[];
}

export interface CmsShadowReconciliation {
  products: CollectionReconciliation;
  categories: CollectionReconciliation;
  banners: CollectionReconciliation;
  homepageSections: CollectionReconciliation;
  remoteMediaAssets: number;
  remoteDocuments: number;
  safeToConsiderCutover: boolean;
}

function reconcileIds(localIds: string[], remotePairs: Array<{ id: string; legacyId: string | null }>): CollectionReconciliation {
  const remoteIds = remotePairs.map((item) => item.legacyId || item.id);
  const localSet = new Set(localIds);
  const remoteSet = new Set(remoteIds);
  const duplicateRemoteLegacyIds = remoteIds.filter((id, index) => remoteIds.indexOf(id) !== index).filter((id, index, ids) => ids.indexOf(id) === index);
  return {
    localCount: localIds.length,
    remoteCount: remoteIds.length,
    localOnlyIds: localIds.filter((id) => !remoteSet.has(id)).sort(),
    remoteOnlyIds: remoteIds.filter((id) => !localSet.has(id)).sort(),
    duplicateRemoteLegacyIds,
  };
}

/**
 * Pure comparison utility. It neither reads browser storage nor writes to
 * Supabase, allowing an admin-only UI to compare an explicit local export with
 * a server-fetched admin snapshot before any approved import or cutover.
 */
export function reconcileLocalCmsWithSupabase(local: AdminStoreData, remote: CmsAdminSnapshot): CmsShadowReconciliation {
  const products = reconcileIds(local.products.map((product) => product.id), remote.products.map((product) => ({ id: product.id, legacyId: product.legacy_id })));
  const categories = reconcileIds(local.categories.map((category) => category.id), remote.categories.map((category) => ({ id: category.id, legacyId: category.legacy_id })));
  const banners = reconcileIds(local.banners.map((banner) => banner.id), remote.banners.map((banner) => ({ id: banner.id, legacyId: banner.legacy_id })));
  const homepageSections = reconcileIds(local.homepageSections.map((section) => section.id), remote.homepageSections.map((section) => ({ id: section.id, legacyId: section.section_key })));
  const collections = [products, categories, banners, homepageSections];
  return {
    products,
    categories,
    banners,
    homepageSections,
    remoteMediaAssets: remote.mediaAssets.length,
    remoteDocuments: remote.documents.length,
    safeToConsiderCutover: collections.every((collection) => collection.localOnlyIds.length === 0 && collection.remoteOnlyIds.length === 0 && collection.duplicateRemoteLegacyIds.length === 0),
  };
}
