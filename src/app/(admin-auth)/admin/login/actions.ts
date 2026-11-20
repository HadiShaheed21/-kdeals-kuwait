'use server';

import { redirect } from 'next/navigation';
import { getAdminAuthorization } from '@/lib/supabase/admin-auth';
import { getRecoveryAuthorization } from '@/lib/supabase/recovery-auth';
import { RECOVERY_COOKIE, recoveryCookieOptions } from '@/lib/supabase/recovery';
import { createClient, SupabaseConfigurationError } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export interface LoginState {
  error?: string;
}

export interface RecoveryRequestState {
  error?: string;
  message?: string;
}

export interface ResetPasswordState {
  error?: string;
}

function safeAdminDestination(value: FormDataEntryValue | null): string {
  if (typeof value !== 'string') return '/admin';
  return value.startsWith('/admin') && !value.startsWith('//') ? value : '/admin';
}

export async function signInAdmin(_previousState: LoginState, formData: FormData): Promise<LoginState> {
  const email = formData.get('email');
  const password = formData.get('password');
  if (typeof email !== 'string' || !email.trim() || typeof password !== 'string' || !password) {
    return { error: 'Enter your email address and password.' };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) return { error: 'Sign-in failed. Check your email and password.' };

    const authorization = await getAdminAuthorization();
    if (authorization.status !== 'authorized') {
      await supabase.auth.signOut();
      return { error: 'This account is not authorized to access the admin dashboard.' };
    }
  } catch (error) {
    if (error instanceof SupabaseConfigurationError) {
      return { error: 'Admin authentication is not configured on this deployment.' };
    }
    return { error: 'Sign-in is temporarily unavailable. Please try again.' };
  }

  redirect(safeAdminDestination(formData.get('next')));
}

export async function signOutAdmin(): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } finally {
    redirect('/admin/login');
  }
}

function recoveryRedirectUrl(): string | null {
  const appUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!appUrl) return null;
  try {
    const url = new URL('/auth/callback', appUrl);
    if (url.protocol !== 'https:' && !(process.env.NODE_ENV !== 'production' && url.protocol === 'http:')) return null;
    url.searchParams.set('next', '/admin/reset-password');
    return url.toString();
  } catch {
    return null;
  }
}

export async function requestPasswordRecovery(_previousState: RecoveryRequestState, formData: FormData): Promise<RecoveryRequestState> {
  const email = formData.get('email');
  if (typeof email !== 'string' || !email.trim()) return { error: 'Enter your email address.' };
  const redirectTo = recoveryRedirectUrl();
  if (!redirectTo) return { error: 'Password recovery is not configured on this deployment.' };

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
    if (error) return { error: 'Unable to send a recovery email right now. Please try again.' };
    // Keep the response identical for registered and unregistered addresses.
    return { message: 'If this address belongs to an eligible administrator, a recovery link has been sent.' };
  } catch (error) {
    if (error instanceof SupabaseConfigurationError) return { error: 'Password recovery is not configured on this deployment.' };
    return { error: 'Unable to send a recovery email right now. Please try again.' };
  }
}

export async function resetAdminPassword(_previousState: ResetPasswordState, formData: FormData): Promise<ResetPasswordState> {
  const password = formData.get('password');
  const confirmPassword = formData.get('confirmPassword');
  if (typeof password !== 'string' || password.length < 12) return { error: 'Use a password with at least 12 characters.' };
  if (password !== confirmPassword) return { error: 'The passwords do not match.' };

  const authorization = await getRecoveryAuthorization();
  if (authorization.status !== 'authorized') return { error: 'This recovery session is invalid or has expired. Request a new link.' };

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return { error: 'Unable to update this password. Use a stronger password or request a new link.' };
    const cookieStore = await cookies();
    cookieStore.set(RECOVERY_COOKIE, '', { ...recoveryCookieOptions(), maxAge: 0 });
    await supabase.auth.signOut();
  } catch {
    return { error: 'Unable to update this password. Request a new link and try again.' };
  }

  redirect('/admin/login?reset=success');
}
