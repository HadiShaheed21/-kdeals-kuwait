'use client';

import Link from 'next/link';
import { useState, type ChangeEvent } from 'react';
import { Download, FileCheck2, RefreshCw, ShieldCheck, Upload } from 'lucide-react';
import { localAdminRepository } from '@/lib/admin-repository';
import { listMedia } from '@/lib/media-repository';
import { createPortableCmsExport, downloadPortableCmsExport, validatePortableCmsExport, type MigrationValidationResult } from '@/lib/cms-migration/portable';
import type { CmsRemotePreview } from '@/lib/supabase/cms/preview';
import type { CmsShadowReconciliation } from '@/lib/supabase/cms/shadow';
import { reconcileLocalCmsAction } from '@/app/admin/supabase-preview/actions';

export function CmsMigrationWorkbench({ remotePreview }: { remotePreview: CmsRemotePreview | null }) {
  const [busy, setBusy] = useState<'export' | 'shadow' | 'validate' | null>(null);
  const [notice, setNotice] = useState('');
  const [validation, setValidation] = useState<MigrationValidationResult | null>(null);
  const [shadow, setShadow] = useState<CmsShadowReconciliation | null>(null);

  const exportLocalData = async () => {
    setBusy('export'); setNotice('');
    try {
      const payload = await createPortableCmsExport(localAdminRepository.read(), await listMedia());
      downloadPortableCmsExport(payload);
      setNotice(`Export created: ${payload.cms.products.length} products, ${payload.cms.categories.length} categories, ${payload.media.length} media files. Local data was not changed.`);
    } catch { setNotice('Could not create a local export in this browser.'); }
    finally { setBusy(null); }
  };

  const compareLocalData = async () => {
    setBusy('shadow'); setNotice('');
    try {
      setShadow(await reconcileLocalCmsAction(localAdminRepository.read()));
    } catch { setNotice('Remote reconciliation is unavailable. Confirm that this account has an active Supabase admin role.'); }
    finally { setBusy(null); }
  };

  const validateFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setBusy('validate'); setNotice('');
    try { setValidation(await validatePortableCmsExport(JSON.parse(await file.text()) as unknown)); }
    catch { setValidation({ valid: false, issues: [{ severity: 'error', path: 'file', message: 'The selected file is not valid JSON.' }], summary: { products: 0, categories: 0, banners: 0, media: 0, variants: 0 } }); }
    finally { setBusy(null); }
  };

  return <main className="min-h-screen bg-slate-50 p-4 text-slate-900 sm:p-6"><div className="mx-auto max-w-6xl">
    <Link href="/admin" className="text-sm font-bold text-purple-700 hover:underline">← Admin dashboard</Link>
    <header className="mt-5 rounded-3xl bg-gradient-to-br from-purple-800 via-purple-700 to-orange-500 px-5 py-6 text-white shadow-lg sm:px-8"><p className="text-xs font-bold uppercase tracking-[.16em] text-orange-100">Stage 5 · migration preparation</p><h1 className="mt-2 text-3xl font-extrabold">Supabase CMS preview</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-white/90">Compare the protected Supabase CMS with this browser’s local CMS, export a portable backup, and validate a dry-run package. No data is imported or published from this page.</p></header>
    {notice && <p role="status" className="mt-4 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-900">{notice}</p>}

    <section className="mt-5 grid gap-4 lg:grid-cols-3"><article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><Download className="h-5 w-5 text-purple-700" /><h2 className="mt-3 font-extrabold">1. Export local CMS</h2><p className="mt-1 text-sm leading-5 text-slate-600">Downloads localStorage CMS data and IndexedDB media with metadata and SHA-256 checksums.</p><button type="button" onClick={exportLocalData} disabled={busy !== null} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-purple-700 px-4 text-sm font-bold text-white disabled:opacity-50"><Download className="h-4 w-4" />{busy === 'export' ? 'Preparing…' : 'Export backup'}</button></article>
      <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><RefreshCw className="h-5 w-5 text-purple-700" /><h2 className="mt-3 font-extrabold">2. Shadow compare</h2><p className="mt-1 text-sm leading-5 text-slate-600">Compares this browser’s local IDs and counts with the authenticated remote admin snapshot.</p><button type="button" onClick={compareLocalData} disabled={busy !== null} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-purple-700 px-4 text-sm font-bold text-white disabled:opacity-50"><RefreshCw className="h-4 w-4" />{busy === 'shadow' ? 'Comparing…' : 'Compare sources'}</button></article>
      <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><FileCheck2 className="h-5 w-5 text-purple-700" /><h2 className="mt-3 font-extrabold">3. Validate dry run</h2><p className="mt-1 text-sm leading-5 text-slate-600">Checks an export file only. It never uploads media or inserts CMS records.</p><label className="mt-4 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-purple-700 px-4 text-sm font-bold text-white"><Upload className="h-4 w-4" />{busy === 'validate' ? 'Validating…' : 'Choose export'}<input type="file" accept="application/json" className="sr-only" disabled={busy !== null} onChange={validateFile} /></label></article></section>

    <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" /><div><h2 className="font-extrabold">Safety boundary</h2><p className="mt-1 text-sm leading-6 text-slate-600">This workbench is protected by the existing server-side admin layout. It does not display Storage paths or signed URLs, does not use browser service-role credentials, and does not modify local or remote CMS data.</p></div></div></section>
    <RemotePreview preview={remotePreview} />
    {shadow && <ShadowReport report={shadow} />}
    {validation && <ValidationReport result={validation} />}
  </div></main>;
}

function RemotePreview({ preview }: { preview: CmsRemotePreview | null }) {
  if (!preview) return <section className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4"><h2 className="font-extrabold text-amber-900">Remote preview unavailable</h2><p className="mt-1 text-sm text-amber-800">The server could not load an authorized Supabase CMS snapshot. No remote data was exposed.</p></section>;
  const counters = Object.entries(preview.counts);
  return <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><h2 className="font-extrabold">Authenticated remote CMS snapshot</h2><div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">{counters.map(([label, count]) => <div key={label} className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-bold text-slate-500">{label}</p><p className="mt-1 text-xl font-extrabold">{count}</p></div>)}</div><p className="mt-4 text-sm text-slate-600">Settings: {preview.settings.configured ? `${preview.settings.displayName || 'Unnamed'} · announcement ${preview.settings.announcementVisible ? 'visible' : 'hidden'}` : 'not configured'}</p><div className="mt-4 grid gap-3 lg:grid-cols-2"><PreviewList title="Products" items={preview.products.map((item) => `${item.legacyId || item.id} · ${item.slug} · ${item.status} · ${item.price} KWD`)} /><PreviewList title="Categories" items={preview.categories.map((item) => `${item.legacyId || item.id} · ${item.slug} · ${item.enabled ? 'enabled' : 'disabled'}`)} /><PreviewList title="Variants" items={preview.variants.map((item) => `${item.legacyId || item.id} · stock ${item.stock} · ${item.enabled ? 'enabled' : 'disabled'}`)} /><PreviewList title="Banners" items={preview.banners.map((item) => `${item.legacyId || item.id} · ${item.enabled ? 'enabled' : 'disabled'} · ${item.destination}`)} /><PreviewList title="Navigation" items={preview.navigation.map((item) => `${item.labelEn} / ${item.labelAr} · ${item.destination}`)} /><PreviewList title="Homepage sections" items={preview.homepageSections.map((item) => `${item.key} · ${item.theme} · order ${item.displayOrder}`)} /><PreviewList title="Media metadata" items={preview.media.map((item) => `${item.legacyId || item.id} · ${item.kind} · ${item.mimeType} · ${item.byteSize} bytes`)} /></div></section>;
}

function PreviewList({ title, items }: { title: string; items: string[] }) { return <details className="rounded-xl border border-slate-200 p-3"><summary className="cursor-pointer font-bold">{title} ({items.length})</summary><ul className="mt-3 max-h-44 space-y-1 overflow-auto text-xs text-slate-600">{items.length ? items.map((item) => <li key={item} className="break-words">{item}</li>) : <li>No remote records.</li>}</ul></details>; }

function ShadowReport({ report }: { report: CmsShadowReconciliation }) { const rows = [['Products', report.products], ['Categories', report.categories], ['Banners', report.banners], ['Homepage sections', report.homepageSections]] as const; return <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><h2 className="font-extrabold">Shadow reconciliation</h2><p className={`mt-1 text-sm font-semibold ${report.safeToConsiderCutover ? 'text-emerald-700' : 'text-amber-700'}`}>{report.safeToConsiderCutover ? 'Counts and identifiers match. This is still not approval for cutover.' : 'Differences found. Import/cutover remains blocked.'}</p><div className="mt-3 overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="text-xs uppercase text-slate-500"><tr><th className="p-2">Collection</th><th className="p-2">Local</th><th className="p-2">Remote</th><th className="p-2">Local only</th><th className="p-2">Remote only</th><th className="p-2">Duplicates</th></tr></thead><tbody>{rows.map(([label, item]) => <tr key={label} className="border-t border-slate-100"><td className="p-2 font-bold">{label}</td><td className="p-2">{item.localCount}</td><td className="p-2">{item.remoteCount}</td><td className="p-2">{item.localOnlyIds.join(', ') || '—'}</td><td className="p-2">{item.remoteOnlyIds.join(', ') || '—'}</td><td className="p-2">{item.duplicateRemoteLegacyIds.join(', ') || '—'}</td></tr>)}</tbody></table></div><p className="mt-3 text-xs text-slate-500">Remote media assets: {report.remoteMediaAssets} · Remote documents: {report.remoteDocuments}</p></section>; }

function ValidationReport({ result }: { result: MigrationValidationResult }) { return <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><h2 className="font-extrabold">Dry-run validation</h2><p className={`mt-1 text-sm font-bold ${result.valid ? 'text-emerald-700' : 'text-red-700'}`}>{result.valid ? 'Valid portable export. No records were imported.' : 'Validation failed. No records were imported.'}</p><p className="mt-2 text-xs text-slate-500">{result.summary.products} products · {result.summary.categories} categories · {result.summary.variants} variants · {result.summary.banners} banners · {result.summary.media} media files</p>{result.issues.length > 0 && <ul className="mt-3 max-h-72 space-y-2 overflow-auto text-sm">{result.issues.map((issue, index) => <li key={`${issue.path}-${index}`} className={`rounded-lg p-2 ${issue.severity === 'error' ? 'bg-red-50 text-red-800' : 'bg-amber-50 text-amber-800'}`}><strong>{issue.path}</strong>: {issue.message}</li>)}</ul>}</section>; }
