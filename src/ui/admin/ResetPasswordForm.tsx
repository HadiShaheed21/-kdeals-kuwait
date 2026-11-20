'use client';

import { useActionState } from 'react';
import { resetAdminPassword, type ResetPasswordState } from '@/app/(admin-auth)/admin/login/actions';

const initialState: ResetPasswordState = {};

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState(resetAdminPassword, initialState);
  return (
    <form action={action} className="mt-6 space-y-4" noValidate>
      <label className="block text-sm font-bold text-slate-800" htmlFor="new-password">
        New password
        <input autoComplete="new-password" className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-base outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100" id="new-password" name="password" required type="password" />
      </label>
      <label className="block text-sm font-bold text-slate-800" htmlFor="confirm-password">
        Confirm new password
        <input autoComplete="new-password" className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-base outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100" id="confirm-password" name="confirmPassword" required type="password" />
      </label>
      <p className="text-xs leading-5 text-slate-500">Use at least 12 characters. Supabase may apply additional password-security rules.</p>
      {state.error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700" role="alert">{state.error}</p> : null}
      <button className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-gradient-to-r from-purple-700 to-orange-500 px-4 text-sm font-bold text-white disabled:cursor-wait disabled:opacity-70" disabled={pending} type="submit">{pending ? 'Updating password…' : 'Update password'}</button>
    </form>
  );
}
