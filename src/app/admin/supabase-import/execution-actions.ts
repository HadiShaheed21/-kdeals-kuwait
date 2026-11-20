'use server';

import type { NormalizedImportPayload } from '@/lib/cms-migration/normalized-payload';
import type { ImportPreparationManifest, StorageUploadPlan } from '@/lib/cms-migration/import-plan';
import { sha256CanonicalJson } from '@/lib/cms-migration/normalized-payload';
import { validateExecutionPreflight, type ImportExecutionConfirmation } from '@/lib/cms-migration/import-executor';
import { verifyPlannedMediaBytes, requireOwnerImportExecutor } from '@/lib/supabase/cms/import-executor';
import { isStagingExecutionEnabled } from '@/lib/supabase/cms/import-apply';
import { createClient } from '@/lib/supabase/server';

export interface StagingImportStart {
  batchId: string;
  storageUploads: StorageUploadPlan[];
}

function assertStagingExecution(): void {
  if (!isStagingExecutionEnabled()) throw new Error('Import execution is disabled outside the explicitly configured staging project.');
}

function mimeForStoragePath(path: string): StorageUploadPlan['mimeType'] {
  const extension = path.split('.').pop()?.toLowerCase();
  if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg';
  if (extension === 'png') return 'image/png';
  if (extension === 'webp') return 'image/webp';
  if (extension === 'pdf') return 'application/pdf';
  throw new Error('The planned media object has an unsupported extension.');
}

/**
 * Starts a staging batch without accepting media bytes. The browser uploads
 * objects directly through the authenticated owner Storage policy, avoiding
 * oversized Server Action payloads and keeping private paths owner-only.
 */
export async function startStagingImportAction(
  manifest: ImportPreparationManifest,
  payload: NormalizedImportPayload,
  confirmation: ImportExecutionConfirmation,
): Promise<StagingImportStart> {
  assertStagingExecution();
  await requireOwnerImportExecutor();
  validateExecutionPreflight(manifest, confirmation);
  const client = await createClient();
  const { data: reserved, error: reserveError } = await client.rpc('reserve_cms_import_batch', {
    p_source_name: 'stage4-portable-export',
    p_source_fingerprint: manifest.sourceFingerprint,
    p_manifest_sha256: manifest.sourceFingerprint,
    p_review_acknowledgements: confirmation.acknowledgedWarningKeys,
  });
  if (reserveError || !reserved) throw new Error('Could not reserve the import batch.');
  const batch = reserved as { id: string; status: string };
  if (batch.status === 'completed') return { batchId: batch.id, storageUploads: [] };

  const { error: stageError } = await client.rpc('stage_cms_import_payload', {
    p_batch_id: batch.id,
    p_payload: payload,
    p_payload_sha256: await sha256CanonicalJson(payload),
  });
  if (stageError) throw new Error('Could not stage the normalized import payload.');
  if (manifest.storageUploads.length) {
    const { error: mediaPlanError } = await client.from('import_batch_media').upsert(manifest.storageUploads.map((plan) => ({
      batch_id: batch.id,
      media_asset_id: plan.mediaAssetId,
      legacy_media_id: plan.legacyMediaId,
      storage_bucket: plan.bucket,
      storage_path: plan.storagePath,
      sha256: plan.sha256,
      byte_size: plan.byteSize,
      upload_status: 'planned',
      error_message: null,
    })), { onConflict: 'batch_id,legacy_media_id' });
    if (mediaPlanError) throw new Error('Could not record the approved private-media plan.');
  }
  return { batchId: batch.id, storageUploads: manifest.storageUploads };
}

/**
 * Runs only after the owner browser has uploaded each approved object. The
 * server downloads every object under the same authenticated RLS identity,
 * rechecks magic bytes, size, and SHA-256, then invokes the draft-only RPC.
 */
export async function verifyAndApplyStagingImportAction(batchId: string): Promise<{ status: string; recordsImported: number }> {
  assertStagingExecution();
  await requireOwnerImportExecutor();
  if (!/^[0-9a-f-]{36}$/i.test(batchId)) throw new Error('Invalid import batch identifier.');
  const client = await createClient();
  const { data: rows, error: rowsError } = await client.from('import_batch_media').select('*').eq('batch_id', batchId);
  if (rowsError) throw new Error('Could not load the import media plan.');
  try {
    for (const row of rows ?? []) {
      const plan: StorageUploadPlan = {
        legacyMediaId: row.legacy_media_id,
        mediaAssetId: row.media_asset_id,
        bucket: row.storage_bucket,
        storagePath: row.storage_path,
        mimeType: mimeForStoragePath(row.storage_path),
        byteSize: row.byte_size,
        sha256: row.sha256,
        referencedBy: [],
      };
      const downloaded = await client.storage.from(row.storage_bucket).download(row.storage_path);
      if (downloaded.error || !downloaded.data) throw new Error(`Could not download planned media ${row.legacy_media_id}.`);
      const integrity = await verifyPlannedMediaBytes(plan, await downloaded.data.arrayBuffer());
      if (!integrity.valid) throw new Error(integrity.reason || `Media verification failed for ${row.legacy_media_id}.`);
      const { error: updateError } = await client.from('import_batch_media').update({ upload_status: 'verified', error_message: null }).eq('batch_id', batchId).eq('legacy_media_id', row.legacy_media_id);
      if (updateError) throw new Error(`Could not record verification for ${row.legacy_media_id}.`);
    }
    const { error: statusError } = await client.from('import_batches').update({ status: 'media_uploaded', last_error: null }).eq('id', batchId);
    if (statusError) throw new Error('Could not mark media upload completion.');
    const { data, error } = await client.rpc('apply_staged_cms_import', { p_batch_id: batchId });
    if (error || !data) throw new Error('The atomic CMS apply failed.');
    const result = data as { status?: string; records_imported?: number };
    if (result.status !== 'reconciling' && result.status !== 'completed') throw new Error('The import did not reach a reconcilable state.');
    return { status: result.status, recordsImported: Number(result.records_imported ?? 0) };
  } catch (error) {
    await client.from('import_batches').update({ status: 'failed', last_error: error instanceof Error ? error.message.slice(0, 1000) : 'Media verification failed.' }).eq('id', batchId);
    throw error;
  }
}
