import { connection } from 'next/server';
import { Suspense } from 'react';
import { CmsMigrationWorkbench } from '@/ui/admin/CmsMigrationWorkbench';
import { createCmsRemotePreview } from '@/lib/supabase/cms/preview';
import { readAdminCmsSnapshot } from '@/lib/supabase/cms/repository';

function PreviewLoadingFallback() {
  return <main className="min-h-screen bg-slate-50 p-4 sm:p-6" aria-busy="true"><div className="mx-auto max-w-6xl rounded-2xl border border-slate-200 bg-white p-5 text-sm font-semibold text-slate-600">Loading the authenticated Supabase CMS preview…</div></main>;
}

export default function SupabasePreviewPage() {
  return <Suspense fallback={<PreviewLoadingFallback />}><SupabasePreviewContent /></Suspense>;
}

async function SupabasePreviewContent() {
  await connection();
  let remotePreview = null;
  try {
    const snapshot = await readAdminCmsSnapshot();
    remotePreview = createCmsRemotePreview(snapshot);
  } catch {
    // Do not disclose database details or private asset paths in the UI.
  }
  return <CmsMigrationWorkbench remotePreview={remotePreview} />;
}
