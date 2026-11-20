'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { requestPasswordRecovery, type RecoveryRequestState } from '@/app/(admin-auth)/admin/login/actions';

const initialState: RecoveryRequestState = {};

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordRecovery, initialState);
  return (
    <form action={action} className="mt-6 space-y-4" noValidate>
      <label className="block text-sm font-bold text-slate-800" htmlFor="recovery-email">
        Email address
        <input autoComplete="email" className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-base outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100" id="recovery-email" name="email" required type="email" />
      </label>
      {state.error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700" role="alert">{state.error}</p> : null}
      {state.message ? <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800" role="status">{state.message}</p> : null}
      <button className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-gradient-to-r from-purple-700 to-orange-500 px-4 text-sm font-bold text-white disabled:cursor-wait disabled:opacity-70" disabled={pending} type="submit">{pending ? 'Sending…' : 'Send recovery link'}</button>
      <Link className="block text-center text-sm font-bold text-purple-700 hover:underline" href="/admin/login">Back to sign in</Link>
    </form>
  );
}
