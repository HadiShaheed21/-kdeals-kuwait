import { Suspense, type ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { getAdminAuthorization } from '@/lib/supabase/admin-auth';
import { AdminLoginForm } from '@/ui/admin/AdminLoginForm';

function getSafeNext(value: string | string[] | undefined): string | undefined {
  const next = Array.isArray(value) ? value[0] : value;
  return next?.startsWith('/admin') && !next.startsWith('//') ? next : undefined;
}

function AuthPageShell({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/70 sm:p-8">
        {children}
      </section>
    </main>
  );
}

function LoginFallback() {
  return <p className="py-12 text-center text-sm font-medium text-slate-600" role="status">Checking secure sign-in…</p>;
}

export default function AdminLoginPage({ searchParams }: { searchParams: Promise<{ next?: string | string[]; reset?: string }> }) {
  return <AuthPageShell><Suspense fallback={<LoginFallback />}><LoginContent searchParams={searchParams} /></Suspense></AuthPageShell>;
}

async function LoginContent({ searchParams }: { searchParams: Promise<{ next?: string | string[]; reset?: string }> }) {
  // getClaims() validates a JWT against the current time, so this belongs to
  // the request-time portion already isolated by the Suspense boundary.
  await connection();
  const authorization = await getAdminAuthorization();
  const { next, reset } = await searchParams;
  if (authorization.status === 'authorized') redirect(getSafeNext(next) || '/admin');

  return <>
    <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-orange-600">K DEALS</p>
    <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">Admin sign in</h1>
    <p className="mt-2 text-sm leading-6 text-slate-600">Use an active administrator account. Access is verified against the secure admin role record.</p>
    {reset === 'success' ? <p className="mt-4 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800" role="status">Password updated. Sign in with your new password.</p> : null}
    <AdminLoginForm next={getSafeNext(next)} />
  </>;
}
