import 'server-only';

import { getAdminAuthorization } from '@/lib/supabase/admin-auth';
import type { StorageUploadPlan } from '@/lib/cms-migration/import-plan';

export interface MediaIntegrityResult {
  valid: boolean;
  reason?: string;
}

function hex(bytes: Uint8Array): string {
  return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
}

function matchesSignature(data: Uint8Array, mimeType: string): boolean {
  if (mimeType === 'image/jpeg') return data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
  if (mimeType === 'image/png') return data.length >= 8 && hex(data.slice(0, 8)) === '89504e470d0a1a0a';
  if (mimeType === 'image/webp') return data.length >= 12 && new TextDecoder().decode(data.slice(0, 4)) === 'RIFF' && new TextDecoder().decode(data.slice(8, 12)) === 'WEBP';
  if (mimeType === 'application/pdf') return data.length >= 5 && new TextDecoder().decode(data.slice(0, 5)) === '%PDF-';
  return false;
}

/**
 * Server-only pre-upload guard for a future approved executor. It validates
 * byte size, magic bytes and SHA-256 before an object may be sent to private
 * Storage. It deliberately has no upload operation in Phase 1.
 */
export async function verifyPlannedMediaBytes(plan: StorageUploadPlan, data: ArrayBuffer): Promise<MediaIntegrityResult> {
  const bytes = new Uint8Array(data);
  if (bytes.byteLength !== plan.byteSize) return { valid: false, reason: 'The media byte size differs from the approved plan.' };
  if (!matchesSignature(bytes, plan.mimeType)) return { valid: false, reason: 'The media file signature does not match its declared MIME type.' };
  const digest = await crypto.subtle.digest('SHA-256', data);
  if (hex(new Uint8Array(digest)) !== plan.sha256.toLowerCase()) return { valid: false, reason: 'The media SHA-256 checksum differs from the approved plan.' };
  return { valid: true };
}

export async function requireOwnerImportExecutor(): Promise<void> {
  const authorization = await getAdminAuthorization();
  if (authorization.status !== 'authorized' || authorization.role !== 'owner') {
    throw new Error('An active owner session is required for import execution.');
  }
}

/** A deliberate production write barrier for Stage 6 Phase 1. */
export async function uploadPlannedMediaDisabled(): Promise<never> {
  await requireOwnerImportExecutor();
  throw new Error('Private Storage upload is disabled until a separately approved execution phase.');
}
