import { connection } from 'next/server';
import { Suspense } from 'react';
import Link from 'next/link';
import { getAdminAuthorization } from '@/lib/supabase/admin-auth';
import { isStagingExecutionEnabled } from '@/lib/supabase/cms/import-apply';
import { CmsImportWorkbench } from '@/ui/admin/CmsImportWorkbench';

function ImportLoadingFallback() {
  return <main className="min-h-screen bg-slate-50 p-4 sm:p-6" aria-busy="true"><div className="mx-auto max-w-6xl rounded-2xl border border-slate-200 bg-white p-5 text-sm font-semibold text-slate-600">Checking owner authorization for import preparation…</div></main>;
}

function OwnerRequired() {
  return <main className="min-h-screen bg-slate-50 p-4 text-slate-900 sm:p-6"><div className="mx-auto max-w-3xl rounded-3xl border border-amber-200 bg-white p-6 shadow-sm"><Link href="/admin" className="text-sm font-bold text-purple-700 hover:underline">← Admin dashboard</Link><h1 className="mt-5 text-2xl font-extrabold">Owner access required</h1><p className="mt-2 text-sm leading-6 text-slate-600">Import preparation is restricted to an active Supabase owner. Your current admin role can continue using the local CMS and migration preview, but cannot inspect import bookkeeping or start a dry run.</p></div></main>;
}

export default function SupabaseImportPage() {
  return <Suspense fallback={<ImportLoadingFallback />}><SupabaseImportContent /></Suspense>;
}

async function SupabaseImportContent() {
  await connection();
  const authorization = await getAdminAuthorization();
  if (authorization.status !== 'authorized' || authorization.role !== 'owner') return <OwnerRequired />;
  let destinationProject = 'configured Supabase project';
  try { destinationProject = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').host || destinationProject; } catch { /* configuration errors remain unavailable to this page */ }
  return <CmsImportWorkbench destinationProject={destinationProject} stagingExecutionEnabled={isStagingExecutionEnabled()} />;
}
