import 'server-only';

import { createNormalizedImportPayload, sha256CanonicalJson } from '@/lib/cms-migration/normalized-payload';
import { preparePortableImport } from '@/lib/cms-migration/import-plan';
import { validatePortableCmsExport, type PortableCmsExport } from '@/lib/cms-migration/portable';
import { validateExecutionPreflight, type ImportExecutionConfirmation } from '@/lib/cms-migration/import-executor';
import { createClient } from '@/lib/supabase/server';
import { requireOwnerImportExecutor } from './import-executor';
import { verifyPlannedMediaBytes } from './import-executor';

const stagingProjectRef = 'ncjtivoghlbbqlkfxrzs';

export interface StagingImportResult {
  batchId: string;
  status: 'completed' | 'reconciling';
  recordsImported: number;
  mediaVerified: number;
}

export function isStagingExecutionEnabled(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  return process.env.KDEALS_IMPORT_EXECUTION === 'staging'
    && url === `https://${stagingProjectRef}.supabase.co`;
}

function bytesFromBase64(value: string): ArrayBuffer {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes.buffer;
}

function message(error: unknown): string {
  return error instanceof Error ? error.message.slice(0, 1000) : 'Import execution failed.';
}

/**
 * Staging-only owner executor. It is intentionally not connected to a browser
 * button or production environment. It reserves by immutable export
 * fingerprint, validates/signs every media byte using the authenticated owner
 * Storage policies, then invokes the database's draft-only atomic apply RPC.
 */
export async function executeStagingPortableImport(exportText: string, confirmation: ImportExecutionConfirmation): Promise<StagingImportResult> {
  if (!isStagingExecutionEnabled()) {
    throw new Error('Import execution is disabled outside the explicitly configured staging project.');
  }
  await requireOwnerImportExecutor();

  let source: PortableCmsExport;
  try { source = JSON.parse(exportText) as PortableCmsExport; }
  catch { throw new Error('The portable export is not valid JSON.'); }
  const validation = await validatePortableCmsExport(source);
  if (!validation.valid) throw new Error('The portable export has validation errors and cannot be imported.');
  const prepared = await preparePortableImport(exportText);
  if (!prepared.manifest) throw new Error('The portable export could not be prepared.');
  validateExecutionPreflight(prepared.manifest, confirmation);

  const payload = await createNormalizedImportPayload(source, prepared.manifest);
  const payloadSha256 = await sha256CanonicalJson(payload);
  const client = await createClient();
  const { data: batchResult, error: reserveError } = await client.rpc('reserve_cms_import_batch', {
    p_source_name: 'stage4-portable-export',
    p_source_fingerprint: prepared.manifest.sourceFingerprint,
    p_manifest_sha256: prepared.manifest.sourceFingerprint,
    p_review_acknowledgements: confirmation.acknowledgedWarningKeys,
  });
  if (reserveError || !batchResult) throw new Error('Could not reserve the import batch.');
  const batch = batchResult as { id: string; status: string };
  if (batch.status === 'completed') return { batchId: batch.id, status: 'completed', recordsImported: 0, mediaVerified: 0 };

  const { error: stageError } = await client.rpc('stage_cms_import_payload', {
    p_batch_id: batch.id,
    p_payload: payload,
    p_payload_sha256: payloadSha256,
  });
  if (stageError) throw new Error('Could not stage the normalized import payload.');

  const uploadedByThisAttempt: Array<{ bucket: string; path: string }> = [];
  try {
    for (const plan of prepared.manifest.storageUploads) {
      const sourceMedia = source.media.find((media) => media.id === plan.legacyMediaId);
      if (!sourceMedia) throw new Error(`Source media ${plan.legacyMediaId} is missing.`);
      const bytes = bytesFromBase64(sourceMedia.dataBase64);
      const integrity = await verifyPlannedMediaBytes(plan, bytes);
      if (!integrity.valid) throw new Error(integrity.reason || `Media ${plan.legacyMediaId} failed integrity validation.`);

      const { error: planError } = await client.from('import_batch_media').upsert({
        batch_id: batch.id,
        media_asset_id: plan.mediaAssetId,
        legacy_media_id: plan.legacyMediaId,
        storage_bucket: plan.bucket,
        storage_path: plan.storagePath,
        sha256: plan.sha256,
        byte_size: plan.byteSize,
        upload_status: 'planned',
        error_message: null,
      }, { onConflict: 'batch_id,legacy_media_id' });
      if (planError) throw new Error(`Could not record the media plan for ${plan.legacyMediaId}.`);

      const blob = new Blob([bytes], { type: plan.mimeType });
      const upload = await client.storage.from(plan.bucket).upload(plan.storagePath, blob, { contentType: plan.mimeType, upsert: false });
      if (!upload.error) uploadedByThisAttempt.push({ bucket: plan.bucket, path: plan.storagePath });
      if (upload.error) {
        const existing = await client.storage.from(plan.bucket).download(plan.storagePath);
        if (existing.error || !existing.data) throw new Error(`Could not upload or verify ${plan.legacyMediaId}.`);
        const existingIntegrity = await verifyPlannedMediaBytes(plan, await existing.data.arrayBuffer());
        if (!existingIntegrity.valid) throw new Error(`Existing Storage object for ${plan.legacyMediaId} does not match the approved checksum.`);
      }
      const { error: verifiedError } = await client.from('import_batch_media')
        .update({ upload_status: 'verified', error_message: null })
        .eq('batch_id', batch.id)
        .eq('legacy_media_id', plan.legacyMediaId);
      if (verifiedError) throw new Error(`Could not mark ${plan.legacyMediaId} as verified.`);
    }

    const { error: mediaStatusError } = await client.from('import_batches').update({ status: 'media_uploaded', last_error: null }).eq('id', batch.id);
    if (mediaStatusError) throw new Error('Could not mark media upload completion.');
    const { data: applyResult, error: applyError } = await client.rpc('apply_staged_cms_import', { p_batch_id: batch.id });
    if (applyError || !applyResult) throw new Error('The atomic CMS apply failed.');
    const result = applyResult as { status?: string; records_imported?: number };
    if (result.status !== 'reconciling' && result.status !== 'completed') throw new Error('The import did not reach a reconcilable state.');
    return {
      batchId: batch.id,
      status: result.status,
      recordsImported: Number(result.records_imported ?? 0),
      mediaVerified: prepared.manifest.storageUploads.length,
    };
  } catch (error) {
    await client.from('import_batches').update({ status: 'failed', last_error: message(error) }).eq('id', batch.id);
    await Promise.all(uploadedByThisAttempt.map(({ bucket, path }) => client.storage.from(bucket).remove([path])));
    throw error;
  }
}
