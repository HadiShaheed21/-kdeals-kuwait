'use server';

import { readAdminCmsSnapshot, readOwnerImportState } from '@/lib/supabase/cms/repository';
import type { ImportPreparationManifest, LegacyIdMapping, StorageUploadPlan } from '@/lib/cms-migration/import-plan';
import { validateExecutionPreflight, type ImportExecutionConfirmation } from '@/lib/cms-migration/import-executor';

export interface OwnerImportDryRunResult {
  sourceFingerprint: string;
  allowedToProceedToApprovedExecution: boolean;
  existingBatches: Array<{ status: string; recordsImported: number }>;
  mappingConflicts: Array<{ entityType: string; legacyId: string; message: string }>;
  existingMedia: string[];
  remoteCounts: { products: number; categories: number; variants: number; banners: number; homepageSections: number; navigation: number; mediaAssets: number };
  acknowledgedWarnings: number;
  executionEnabled: false;
  notes: string[];
}

function isFingerprint(value: string): boolean { return /^[a-f0-9]{64}$/i.test(value); }

function uniqueMappings(mappings: LegacyIdMapping[]): boolean {
  const keys = new Set<string>();
  for (const mapping of mappings) {
    const key = `${mapping.entityType}:${mapping.legacyId}`;
    if (keys.has(key)) return false;
    keys.add(key);
  }
  return true;
}

function validStoragePlans(plans: StorageUploadPlan[]): boolean {
  return plans.every((plan) => /^[a-f0-9]{64}$/i.test(plan.sha256) && plan.byteSize > 0 && plan.storagePath.length > 0);
}

/**
 * Owner-only and read-only. The client sends the plan metadata, never the
 * portable export's base64 media payload. This action checks RLS-protected
 * bookkeeping for replay/conflict signals but cannot insert or upload.
 */
export async function runOwnerImportDryRun(manifest: ImportPreparationManifest, confirmation: ImportExecutionConfirmation): Promise<OwnerImportDryRunResult> {
  if (manifest.format !== 'kdeals-stage5-import-plan' || manifest.version !== 1 || !isFingerprint(manifest.sourceFingerprint) || !uniqueMappings(manifest.mappings) || !validStoragePlans(manifest.storageUploads)) {
    throw new Error('The import preparation manifest is invalid. Create a new dry run from the original portable export.');
  }

  const preflight = validateExecutionPreflight(manifest, confirmation);
  const [state, snapshot] = await Promise.all([readOwnerImportState(), readAdminCmsSnapshot()]);
  const existingBatches = state.importBatches
    .filter((batch) => batch.source_fingerprint === manifest.sourceFingerprint)
    .map((batch) => ({ status: batch.status, recordsImported: batch.records_imported }));
  const existingMap = new Map(state.legacyIdMap.map((item) => [`${item.entity_type}:${item.legacy_id}`, item]));
  const mappingConflicts = manifest.mappings.flatMap((mapping) => {
    const existing = existingMap.get(`${mapping.entityType}:${mapping.legacyId}`);
    if (!existing) return [];
    return [{
      entityType: mapping.entityType,
      legacyId: mapping.legacyId,
      message: existing.entity_id === mapping.databaseId
        ? 'This legacy identity is already mapped. A later execution must resume/reconcile rather than insert it again.'
        : 'This legacy identity maps to a different database UUID. Execution is blocked until the mapping is reconciled.',
    }];
  });
  const remoteLegacyMedia = new Set(state.mediaAssets.map((asset) => asset.legacy_media_id).filter((id): id is string => Boolean(id)));
  const existingMedia = manifest.storageUploads.filter((plan) => remoteLegacyMedia.has(plan.legacyMediaId)).map((plan) => plan.legacyMediaId);
  const hasPlanErrors = manifest.issues.some((issue) => issue.severity === 'error');
  const notes = [
    'This is an owner-authenticated read-only dry run. No import batch, legacy mapping, CMS row, Storage object, or local browser data was changed.',
    `Owner acknowledgement recorded only in this request: ${preflight.acknowledgedWarnings} review warning(s); confirmation ${preflight.confirmationPhrase}. It is not persisted.`,
    'Execution is disabled. A later approved executor must use the reviewed staging/RPC migration, source_fingerprint and legacy_id_map as idempotency keys, verify every uploaded object checksum, and reconcile counts before storefront cutover.',
  ];
  if (existingBatches.length) notes.push('An import batch with this exact export fingerprint already exists; a later executor must not create a duplicate batch.');
  if (existingMedia.length) notes.push('Some legacy media IDs already exist remotely; a later executor must verify checksum and path before reuse or reject the conflict.');
  return {
    sourceFingerprint: manifest.sourceFingerprint,
    allowedToProceedToApprovedExecution: !hasPlanErrors && existingBatches.length === 0 && mappingConflicts.length === 0 && existingMedia.length === 0,
    existingBatches,
    mappingConflicts,
    existingMedia,
    remoteCounts: { products: snapshot.products.length, categories: snapshot.categories.length, variants: snapshot.variants.length, banners: snapshot.banners.length, homepageSections: snapshot.homepageSections.length, navigation: snapshot.navigation.length, mediaAssets: snapshot.mediaAssets.length },
    acknowledgedWarnings: preflight.acknowledgedWarnings,
    executionEnabled: false,
    notes,
  };
}
