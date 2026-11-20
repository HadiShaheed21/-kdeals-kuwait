import 'server-only';

import type { AdminStoreData } from '@/lib/admin-repository';
import { readAdminCmsSnapshot } from './repository';
import { reconcileLocalCmsWithSupabase, type CmsShadowReconciliation } from './shadow';

/**
 * Read-only, admin-authorized reconciliation entry point. A future admin UI
 * may pass an explicit browser-local export here; this module never reads or
 * clears localStorage/IndexedDB and never imports remote data.
 */
export async function reconcileLocalCmsSnapshot(localSnapshot: AdminStoreData): Promise<CmsShadowReconciliation> {
  const remoteSnapshot = await readAdminCmsSnapshot();
  return reconcileLocalCmsWithSupabase(localSnapshot, remoteSnapshot);
}
