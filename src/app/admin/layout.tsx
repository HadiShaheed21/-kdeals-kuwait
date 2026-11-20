import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { Suspense, type ReactNode } from 'react';
import { getAdminAuthorization } from '@/lib/supabase/admin-auth';
import { signOutAdmin } from '@/app/(admin-auth)/admin/login/actions';

function AdminAuthFallback() {
  return <main className="min-h-screen bg-slate-50" aria-busy="true" />;
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <Suspense fallback={<AdminAuthFallback />}><AuthorizedAdminLayout>{children}</AuthorizedAdminLayout></Suspense>;
}

async function AuthorizedAdminLayout({ children }: { children: ReactNode }) {
  // Supabase JWT verification evaluates expiry and its JWK cache against time.
  // Keep that request/time-dependent work out of the Cache Components shell.
  await connection();
  const authorization = await getAdminAuthorization();
  if (authorization.status !== 'authorized') {
    redirect('/admin/login');
  }

  return (
    <>
      <div className="border-b border-slate-200 bg-white px-4 py-2 sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 text-xs text-slate-600">
          <span>Authenticated admin · {authorization.role}</span>
          <form action={signOutAdmin}>
            <button className="min-h-9 rounded-lg px-3 font-bold text-purple-700 hover:bg-purple-50 focus-visible:outline-2 focus-visible:outline-purple-600" type="submit">Sign out</button>
          </form>
        </div>
      </div>
      {children}
    </>
  );
}
