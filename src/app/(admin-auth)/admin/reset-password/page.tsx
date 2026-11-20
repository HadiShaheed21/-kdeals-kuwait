import Link from 'next/link';
import { Suspense } from 'react';
import { connection } from 'next/server';
import { getRecoveryAuthorization } from '@/lib/supabase/recovery-auth';
import { ResetPasswordForm } from '@/ui/admin/ResetPasswordForm';

function messageForError(error: string | undefined): string {
  if (error === 'expired-link') return 'This recovery link has expired or was already used. Request a new link to continue.';
  if (error === 'invalid-link') return 'This recovery link is invalid. Request a new link to continue.';
  return 'Open the recovery link from your email to choose a new password.';
}

function ResetFallback() {
  return <p className="mt-5 py-10 text-center text-sm font-medium text-slate-600" role="status">Verifying recovery link…</p>;
}

export default function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/70 sm:p-8">
        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-orange-600">K DEALS</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">Choose a new password</h1>
        <Suspense fallback={<ResetFallback />}><ResetContent searchParams={searchParams} /></Suspense>
      </section>
    </main>
  );
}

async function ResetContent({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  // Both JWT verification and recovery-grant expiry compare against current
  // time; execute them only after Next has an incoming request.
  await connection();
  const [{ error }, authorization] = await Promise.all([searchParams, getRecoveryAuthorization()]);
  const validRecovery = authorization.status === 'authorized' && !error;

  return (
    validRecovery ? <ResetPasswordForm /> : <div className="mt-5 space-y-4">
      <p className="rounded-xl bg-amber-50 px-3 py-3 text-sm leading-6 text-amber-900" role="alert">{messageForError(error)}</p>
      <Link className="inline-flex min-h-11 items-center justify-center rounded-xl bg-gradient-to-r from-purple-700 to-orange-500 px-4 text-sm font-bold text-white" href="/admin/forgot-password">Request a new recovery link</Link>
    </div>
  );
}
