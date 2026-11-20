'use client';

import Link from 'next/link';
import { useState, type ChangeEvent } from 'react';
import { AlertTriangle, FileCheck2, FileUp, ShieldCheck, UploadCloud } from 'lucide-react';
import { canSubmitImportDryRun, preparePortableImport, type ImportPlanIssue, type PreparedPortableImport } from '@/lib/cms-migration/import-plan';
import { importWarningKey, requiredImportConfirmation } from '@/lib/cms-migration/import-executor';
import { runOwnerImportDryRun, type OwnerImportDryRunResult } from '@/app/admin/supabase-import/actions';
import { createNormalizedImportPayload } from '@/lib/cms-migration/normalized-payload';
import type { PortableCmsExport } from '@/lib/cms-migration/portable';
import { startStagingImportAction, verifyAndApplyStagingImportAction } from '@/app/admin/supabase-import/execution-actions';
import { createClient } from '@/lib/supabase/client';

export function CmsImportWorkbench({ destinationProject, stagingExecutionEnabled }: { destinationProject: string; stagingExecutionEnabled: boolean }) {
  const [busy, setBusy] = useState<'prepare' | 'remote' | 'execute' | null>(null);
  const [prepared, setPrepared] = useState<PreparedPortableImport | null>(null);
  const [source, setSource] = useState<PortableCmsExport | null>(null);
  const [remoteResult, setRemoteResult] = useState<OwnerImportDryRunResult | null>(null);
  const [executionResult, setExecutionResult] = useState<{ batchId: string; recordsImported: number; mediaVerified: number } | null>(null);
  const [notice, setNotice] = useState('');
  const [acknowledgedWarnings, setAcknowledgedWarnings] = useState<string[]>([]);
  const [confirmation, setConfirmation] = useState('');

  const chooseExport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setBusy('prepare'); setPrepared(null); setSource(null); setRemoteResult(null); setExecutionResult(null); setNotice(''); setAcknowledgedWarnings([]); setConfirmation('');
    try {
      const text = await file.text();
      setPrepared(await preparePortableImport(text));
      setSource(JSON.parse(text) as PortableCmsExport);
    } catch {
      setNotice('The export could not be prepared. The original local export was not changed.');
    } finally { setBusy(null); }
  };

  const executeStagingImport = async () => {
    if (!source || !prepared?.manifest || !stagingExecutionEnabled || !canSubmitImportDryRun(prepared.manifest)) return;
    setBusy('execute'); setNotice(''); setExecutionResult(null);
    try {
      const confirmationInput = { confirmation, acknowledgedWarningKeys: acknowledgedWarnings };
      const payload = await createNormalizedImportPayload(source, prepared.manifest);
      const started = await startStagingImportAction(prepared.manifest, payload, confirmationInput);
      const supabase = createClient();
      for (const plan of started.storageUploads) {
        const media = source.media.find((item) => item.id === plan.legacyMediaId);
        if (!media) throw new Error(`Media ${plan.legacyMediaId} is missing from the original export.`);
        const binary = atob(media.dataBase64);
        const bytes = new Uint8Array(binary.length);
        for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
        const upload = await supabase.storage.from(plan.bucket).upload(plan.storagePath, new Blob([bytes], { type: plan.mimeType }), { contentType: plan.mimeType, upsert: false });
        if (upload.error) {
          const existing = await supabase.storage.from(plan.bucket).download(plan.storagePath);
          if (existing.error || !existing.data) throw new Error(`Could not upload ${media.name}.`);
        }
      }
      const applied = await verifyAndApplyStagingImportAction(started.batchId);
      setExecutionResult({ batchId: started.batchId, recordsImported: applied.recordsImported, mediaVerified: started.storageUploads.length });
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'The staging import could not be completed.');
    } finally { setBusy(null); }
  };

  const runDryRun = async () => {
    if (!prepared?.manifest || !canSubmitImportDryRun(prepared.manifest)) return;
    setBusy('remote'); setNotice(''); setRemoteResult(null);
    try { setRemoteResult(await runOwnerImportDryRun(prepared.manifest, { confirmation, acknowledgedWarningKeys: acknowledgedWarnings })); }
    catch { setNotice('The owner-only remote dry run could not be completed. No database or Storage write was attempted.'); }
    finally { setBusy(null); }
  };

  return <main className="min-h-screen bg-slate-50 p-4 text-slate-900 sm:p-6"><div className="mx-auto max-w-6xl">
    <Link href="/admin" className="text-sm font-bold text-purple-700 hover:underline">← Admin dashboard</Link>
    <header className="mt-5 rounded-3xl bg-gradient-to-br from-purple-800 via-purple-700 to-orange-500 px-5 py-6 text-white shadow-lg sm:px-8"><p className="text-xs font-bold uppercase tracking-[.16em] text-orange-100">Stage 6 · execution preflight</p><h1 className="mt-2 text-3xl font-extrabold">CMS import preflight</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-white/90">Create deterministic legacy-to-UUID mappings, validate media upload plans, acknowledge review warnings, and check remote idempotency state. Products remain drafts after atomic apply.</p></header>
    <section className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950"><div className="flex gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" /><p>{stagingExecutionEnabled ? <><strong>Staging execution enabled.</strong> This active-owner workflow stages metadata server-side, uploads to private Storage under RLS, verifies every checksum server-side, and applies draft-only records atomically.</> : <><strong>Write barrier active.</strong> Execution is disabled unless the server is explicitly configured for the approved staging project.</>}</p></div></section>
    {notice && <p role="status" className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-800">{notice}</p>}
    <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-lg font-extrabold">1. Select the validated portable export</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">The file is parsed in the browser. Its SHA-256 fingerprint is calculated from the original JSON text; the file itself is never edited.</p></div><label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-purple-700 px-4 text-sm font-bold text-white hover:bg-purple-800"><FileUp className="h-4 w-4" />{busy === 'prepare' ? 'Preparing…' : 'Choose export'}<input className="sr-only" type="file" accept="application/json" disabled={busy !== null} onChange={chooseExport} /></label></div></section>
    {prepared && <PreparationReport prepared={prepared} onDryRun={runDryRun} onExecute={executeStagingImport} busy={busy !== null} stagingExecutionEnabled={stagingExecutionEnabled} acknowledgedWarnings={acknowledgedWarnings} setAcknowledgedWarnings={setAcknowledgedWarnings} confirmation={confirmation} setConfirmation={setConfirmation} destinationProject={destinationProject} />}
    {remoteResult && <RemoteDryRunReport result={remoteResult} />}
    {executionResult && <section className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-950"><h2 className="font-extrabold">Staging import applied for reconciliation</h2><p className="mt-1">Batch {executionResult.batchId} verified {executionResult.mediaVerified} media object(s) and created {executionResult.recordsImported} legacy mappings. Imported products remain drafts; storefront cutover is not enabled.</p></section>}
  </div></main>;
}

function PreparationReport({ prepared, onDryRun, onExecute, busy, stagingExecutionEnabled, acknowledgedWarnings, setAcknowledgedWarnings, confirmation, setConfirmation, destinationProject }: { prepared: PreparedPortableImport; onDryRun: () => void; onExecute: () => void; busy: boolean; stagingExecutionEnabled: boolean; acknowledgedWarnings: string[]; setAcknowledgedWarnings: (value: string[]) => void; confirmation: string; setConfirmation: (value: string) => void; destinationProject: string }) {
  if (!prepared.manifest) return <section className="mt-5 rounded-2xl border border-red-200 bg-white p-5 shadow-sm"><h2 className="font-extrabold text-red-900">Portable export validation failed</h2><IssueList issues={prepared.validationIssues.map((issue) => ({ ...issue, code: 'validation' as const }))} /></section>;
  const { manifest } = prepared;
  const blocked = !canSubmitImportDryRun(manifest);
  const warnings = manifest.issues.map((issue, index) => ({ issue, key: importWarningKey(manifest, index) })).filter(({ issue }) => issue.severity === 'warning');
  const allWarningsAcknowledged = warnings.every(({ key }) => acknowledgedWarnings.includes(key));
  const confirmationPhrase = requiredImportConfirmation(manifest);
  const preflightReady = !blocked && allWarningsAcknowledged && confirmation === confirmationPhrase;
  return <>
    <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-lg font-extrabold">2. Local import plan</h2><p className="mt-1 text-sm text-slate-600">Fingerprint <code className="break-all text-xs">{manifest.sourceFingerprint}</code></p></div><div className="flex flex-wrap gap-2"><button type="button" disabled={!preflightReady || busy} onClick={onDryRun} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-orange-500 px-4 text-sm font-bold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"><FileCheck2 className="h-4 w-4" />Run owner-only preflight</button>{stagingExecutionEnabled && <button type="button" disabled={!preflightReady || busy} onClick={onExecute} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-700 px-4 text-sm font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"><UploadCloud className="h-4 w-4" />Stage and apply in staging</button>}</div></div>
      {blocked && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-800">Resolve every error below before the remote dry run. Warnings are preserved for owner review and do not modify data.</p>}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"><Count label="Products" value={manifest.counts.products} /><Count label="Categories" value={manifest.counts.categories} /><Count label="Translations" value={manifest.counts.translations} /><Count label="Variants" value={manifest.counts.variants} /><Count label="Banners" value={manifest.counts.banners} /><Count label="Homepage sections" value={manifest.counts.homepageSections} /><Count label="Navigation" value={manifest.counts.navigationEntries} /><Count label="Documents" value={manifest.counts.documents} /><Count label="Media" value={manifest.counts.media} /><Count label="Legacy mappings" value={manifest.mappings.length} /></div>
      {!blocked && <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4"><h3 className="font-extrabold text-amber-950">Owner confirmation required</h3><p className="mt-1 text-sm leading-6 text-amber-900">Destination: <strong>{destinationProject}</strong>. Acknowledge every review warning, then type the displayed phrase. {stagingExecutionEnabled ? 'This authorizes staging-only draft import after Storage checksum verification.' : 'This authorizes only a read-only preflight; execution remains disabled.'}</p>{warnings.length > 0 && <div className="mt-3 space-y-2">{warnings.map(({ issue, key }) => <label key={key} className="flex items-start gap-2 text-sm text-amber-950"><input className="mt-1" type="checkbox" checked={acknowledgedWarnings.includes(key)} onChange={(event) => setAcknowledgedWarnings(event.target.checked ? [...acknowledgedWarnings, key] : acknowledgedWarnings.filter((value) => value !== key))} />I reviewed: {issue.path} — {issue.message}</label>)}</div>}<label className="mt-3 block text-sm font-bold text-amber-950">Type <code>{confirmationPhrase}</code><input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="mt-1 h-11 w-full rounded-xl border border-amber-300 bg-white px-3 font-mono text-sm text-slate-900" autoComplete="off" /></label></div>}
    </section>
    <section className="mt-5 grid gap-5 lg:grid-cols-2"><details className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" open><summary className="cursor-pointer font-extrabold">Validation and review flags ({manifest.issues.length})</summary><IssueList issues={manifest.issues} /></details><details className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" open><summary className="cursor-pointer font-extrabold">Private Storage upload plan ({manifest.storageUploads.length})</summary><p className="mt-2 text-sm leading-6 text-slate-600">Each path is deterministic and private. A later approved executor must upload, verify SHA-256, create media_assets, then attach records in a transaction-safe batch. Nothing is uploaded from this screen.</p><ul className="mt-3 max-h-80 space-y-2 overflow-auto text-xs">{manifest.storageUploads.map((plan) => <li key={plan.legacyMediaId} className="rounded-lg bg-slate-50 p-2"><strong>{plan.legacyMediaId}</strong> → {plan.bucket}<br /><span className="break-all text-slate-600">{plan.storagePath}</span><br /><span className="text-slate-500">{plan.byteSize.toLocaleString()} bytes · {plan.mimeType} · SHA-256 {plan.sha256.slice(0, 16)}…</span>{plan.duplicateOfLegacyMediaId && <span className="block text-amber-700">Duplicate content candidate: {plan.duplicateOfLegacyMediaId}</span>}</li>)}</ul></details></section>
    <details className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><summary className="cursor-pointer font-extrabold">Deterministic legacy-to-UUID mappings ({manifest.mappings.length})</summary><p className="mt-2 text-sm text-slate-600">These UUIDv8 values are generated from the export fingerprint and legacy identity. They are planning data only until an approved executor persists matching rows in <code>legacy_id_map</code>.</p><div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3"><Count label="Product/category links" value={manifest.relationships.productCategories.length} /><Count label="Translations" value={manifest.relationships.translations.length} /><Count label="Variant links" value={manifest.relationships.variants.length} /><Count label="Section selections" value={manifest.relationships.homepageSelections.length} /><Count label="Navigation links" value={manifest.relationships.navigation.length} /><Count label="Settings singleton" value={manifest.relationships.storeSettings.singleton ? 1 : 0} /></div><ul className="mt-3 grid max-h-80 gap-2 overflow-auto text-xs sm:grid-cols-2">{manifest.mappings.map((mapping) => <li key={`${mapping.entityType}-${mapping.legacyId}`} className="rounded-lg bg-slate-50 p-2"><strong>{mapping.entityType}</strong> · {mapping.legacyId}<br /><span className="break-all text-slate-600">{mapping.databaseId}</span></li>)}</ul></details>
  </>;
}

function Count({ label, value }: { label: string; value: number }) { return <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-bold text-slate-500">{label}</p><p className="mt-1 text-xl font-extrabold">{value}</p></div>; }

function IssueList({ issues }: { issues: ImportPlanIssue[] }) { if (!issues.length) return <p className="mt-3 text-sm text-emerald-700">No validation or review flags were found.</p>; return <ul className="mt-3 max-h-80 space-y-2 overflow-auto text-sm">{issues.map((issue, index) => <li key={`${issue.code}-${issue.path}-${index}`} className={`rounded-lg p-3 ${issue.severity === 'error' ? 'bg-red-50 text-red-900' : 'bg-amber-50 text-amber-900'}`}><span className="inline-flex items-center gap-1 font-extrabold">{issue.severity === 'error' && <AlertTriangle className="h-4 w-4" />}{issue.severity.toUpperCase()} · {issue.code}</span><br /><strong>{issue.path}</strong>: {issue.message}</li>)}</ul>; }

function RemoteDryRunReport({ result }: { result: OwnerImportDryRunResult }) { return <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex gap-3"><UploadCloud className="mt-0.5 h-5 w-5 shrink-0 text-purple-700" /><div><h2 className="font-extrabold">3. Owner-authorized remote preflight</h2><p className={`mt-1 text-sm font-bold ${result.allowedToProceedToApprovedExecution ? 'text-emerald-700' : 'text-amber-700'}`}>{result.allowedToProceedToApprovedExecution ? 'No replay or existing-identity conflicts were found. Import execution is still disabled.' : 'A future execution remains blocked until these conflicts or local errors are resolved.'}</p></div></div><div className="mt-4 grid gap-4 lg:grid-cols-3"><ReportList title="Matching import batches" values={result.existingBatches.map((batch) => `${batch.status} · ${batch.recordsImported} records`)} /><ReportList title="Existing legacy media IDs" values={result.existingMedia} /><ReportList title="Legacy mapping conflicts" values={result.mappingConflicts.map((item) => `${item.entityType}:${item.legacyId} — ${item.message}`)} /><ReportList title="Remote CMS state" values={[`Products: ${result.remoteCounts.products}`, `Categories: ${result.remoteCounts.categories}`, `Variants: ${result.remoteCounts.variants}`, `Banners: ${result.remoteCounts.banners}`, `Media assets: ${result.remoteCounts.mediaAssets}`]} /></div><ul className="mt-4 space-y-2 text-sm text-slate-600">{result.notes.map((note) => <li key={note} className="rounded-lg bg-slate-50 p-3">{note}</li>)}</ul></section>; }

function ReportList({ title, values }: { title: string; values: string[] }) { return <div className="rounded-xl bg-slate-50 p-3"><h3 className="text-sm font-extrabold">{title} ({values.length})</h3>{values.length ? <ul className="mt-2 max-h-36 space-y-1 overflow-auto text-xs text-slate-600">{values.map((value) => <li key={value} className="break-words">{value}</li>)}</ul> : <p className="mt-2 text-xs text-emerald-700">None found.</p>}</div>; }
