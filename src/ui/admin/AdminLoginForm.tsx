'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { signInAdmin, type LoginState } from '@/app/(admin-auth)/admin/login/actions';

const initialState: LoginState = {};

export function AdminLoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(signInAdmin, initialState);

  return (
    <form action={action} className="mt-6 space-y-4" noValidate>
      <input type="hidden" name="next" value={next || '/admin'} />
      <label className="block text-sm font-bold text-slate-800" htmlFor="admin-email">
        Email address
        <input
          autoComplete="email"
          className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-base outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
          id="admin-email"
          name="email"
          required
          type="email"
        />
      </label>
      <label className="block text-sm font-bold text-slate-800" htmlFor="admin-password">
        Password
        <input
          autoComplete="current-password"
          className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-base outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
          id="admin-password"
          name="password"
          required
          type="password"
        />
      </label>
      {state.error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700" role="alert">{state.error}</p> : null}
      <button className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-gradient-to-r from-purple-700 to-orange-500 px-4 text-sm font-bold text-white transition hover:brightness-105 disabled:cursor-wait disabled:opacity-70" disabled={pending} type="submit">
        {pending ? 'Signing in…' : 'Sign in to admin'}
      </button>
      <Link className="block text-center text-sm font-bold text-purple-700 hover:underline" href="/admin/forgot-password">Forgot password?</Link>
    </form>
  );
}
