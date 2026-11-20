'use server';

import type { AdminStoreData } from '@/lib/admin-repository';
import { reconcileLocalCmsSnapshot } from '@/lib/supabase/cms/shadow-server';

function isLocalStoreSnapshot(value: AdminStoreData): boolean {
  return value.version === 2 && Array.isArray(value.products) && Array.isArray(value.categories) && Array.isArray(value.banners) && Array.isArray(value.homepageSections);
}

/** Server-side, authenticated reconciliation. It is intentionally read-only. */
export async function reconcileLocalCmsAction(localSnapshot: AdminStoreData) {
  if (!isLocalStoreSnapshot(localSnapshot)) throw new Error('The local CMS snapshot is not compatible with schema version 2.');
  return reconcileLocalCmsSnapshot(localSnapshot);
}
