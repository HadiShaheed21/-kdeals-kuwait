import type { ImportPreparationManifest } from './import-plan';

export interface ImportExecutionConfirmation {
  confirmation: string;
  acknowledgedWarningKeys: string[];
}

export interface ImportExecutionPreflight {
  sourceFingerprint: string;
  confirmationPhrase: string;
  acknowledgedWarnings: number;
}

export function importWarningKey(manifest: ImportPreparationManifest, index: number): string {
  const issue = manifest.issues[index];
  return `${manifest.sourceFingerprint}:${index}:${issue?.code ?? 'missing'}:${issue?.path ?? 'missing'}`;
}

export function requiredImportConfirmation(manifest: ImportPreparationManifest): string {
  return `PREPARE ${manifest.sourceFingerprint.slice(0, 12)}`;
}

/**
 * This validation is duplicated on the server because the browser-generated
 * import plan is untrusted. It deliberately authorizes a *preflight* only;
 * this phase has no execution entry point.
 */
export function validateExecutionPreflight(manifest: ImportPreparationManifest, confirmation: ImportExecutionConfirmation): ImportExecutionPreflight {
  if (manifest.format !== 'kdeals-stage5-import-plan' || manifest.version !== 1 || !/^[a-f0-9]{64}$/i.test(manifest.sourceFingerprint)) {
    throw new Error('Unsupported or malformed import plan. Recreate it from a portable export.');
  }
  if (manifest.issues.some((issue) => issue.severity === 'error')) {
    throw new Error('The import plan contains blocking validation errors.');
  }
  const warnings = manifest.issues.map((issue, index) => ({ issue, key: importWarningKey(manifest, index) })).filter(({ issue }) => issue.severity === 'warning');
  const acknowledged = new Set(confirmation.acknowledgedWarningKeys);
  if (warnings.some(({ key }) => !acknowledged.has(key))) {
    throw new Error('Every review warning must be explicitly acknowledged before preflight.');
  }
  const confirmationPhrase = requiredImportConfirmation(manifest);
  if (confirmation.confirmation.trim() !== confirmationPhrase) {
    throw new Error('The source-fingerprint confirmation phrase does not match this import plan.');
  }
  return { sourceFingerprint: manifest.sourceFingerprint, confirmationPhrase, acknowledgedWarnings: warnings.length };
}

/**
 * A hard phase boundary. Import execution is intentionally absent until the
 * owner approves the reviewed database migration and a transaction-safe RPC.
 */
export function assertImportExecutionDisabled(): never {
  throw new Error('CMS import execution is disabled during Stage 6 Phase 1. Only read-only preflight is available.');
}
