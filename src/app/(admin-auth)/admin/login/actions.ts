
'use server';

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

import { getAdminAuthorization } from '@/lib/supabase/admin-auth';
import { getRecoveryAuthorization } from '@/lib/supabase/recovery-auth';
import {
  RECOVERY_COOKIE,
  recoveryCookieOptions,
} from '@/lib/supabase/recovery';
import {
  createClient,
  SupabaseConfigurationError,
} from '@/lib/supabase/server';

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

function safeAdminDestination(
  value: FormDataEntryValue | null
): string {
  if (typeof value !== 'string') return '/admin';

  if (
    value.startsWith('/admin') &&
    !value.startsWith('//') &&
    !value.includes('\\')
  ) {
    return value;
  }

  return '/admin';
}

function isValidEmail(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.trim().length > 3 &&
    value.trim().length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
  );
}

function callbackRedirectUrl(
  destination: '/admin' | '/admin/reset-password'
): string | null {
  const appUrl = process.env.NEXT_PUBLIC_SITE_URL;

  if (!appUrl) return null;

  try {
    const base = new URL(appUrl);

    const isLocal =
      base.hostname === 'localhost' ||
      base.hostname === '127.0.0.1';

    if (
      base.protocol !== 'https:' &&
      !(process.env.NODE_ENV !== 'production' &&
        isLocal &&
        base.protocol === 'http:')
    ) {
      return null;
    }

    const url = new URL('/auth/callback', base);
    url.searchParams.set('next', destination);

    return url.toString();
  } catch {
    return null;
  }
}

function recoveryRedirectUrl(): string | null {
  return callbackRedirectUrl('/admin/reset-password');
}

function adminMagicLinkRedirectUrl(): string | null {
  return callbackRedirectUrl('/admin');
}

// Legacy password login retained for compatibility.
// The public admin entry point uses passwordless authentication.
export async function signInAdmin(
  _previousState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = formData.get('email');
  const password = formData.get('password');

  if (!isValidEmail(email) || typeof password !== 'string' || !password) {
    return {
      error: 'Enter your email address and password.',
    };
  }

  try {
    const supabase = await createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      return {
        error: 'Sign-in failed. Check your credentials.',
      };
    }

    const authorization = await getAdminAuthorization();

    if (authorization.status !== 'authorized') {
      await supabase.auth.signOut();

      return {
        error:
          'This account is not authorized to access the admin dashboard.',
      };
    }
  } catch (error) {
    if (error instanceof SupabaseConfigurationError) {
      return {
        error: 'Admin authentication is not configured.',
      };
    }

    return {
      error: 'Sign-in is temporarily unavailable.',
    };
  }

  redirect(safeAdminDestination(formData.get('next')));
}

export async function signOutAdmin(): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } finally {
    redirect('/admin/request-access');
  }
}

// Passwordless admin authentication.
export async function requestAdminMagicLink(
  formData: FormData
): Promise<void> {
  const email = formData.get('email');
  const redirectTo = adminMagicLinkRedirectUrl();

  if (isValidEmail(email) && redirectTo) {
    try {
      const supabase = await createClient();

      await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: redirectTo,
          shouldCreateUser: false,
        },
      });
    } catch {
      // Do not reveal account existence.
    }
  }

  redirect('/admin/request-access');
}

export async function requestPasswordRecovery(
  _previousState: RecoveryRequestState,
  formData: FormData
): Promise<RecoveryRequestState> {
  const email = formData.get('email');

  if (!isValidEmail(email)) {
    return { error: 'Enter a valid email address.' };
  }

  const redirectTo = recoveryRedirectUrl();

  if (!redirectTo) {
    return {
      error: 'Password recovery is not configured.',
    };
  }

  try {
    const supabase = await createClient();

    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      { redirectTo }
    );

    if (error) {
      return {
        error: 'Unable to send a recovery email right now.',
      };
    }

    return {
      message:
        'If this address belongs to an eligible administrator, a recovery link has been sent.',
    };
  } catch (error) {
    if (error instanceof SupabaseConfigurationError) {
      return {
        error: 'Password recovery is not configured.',
      };
    }

    return {
      error: 'Unable to send a recovery email right now.',
    };
  }
}

export async function resetAdminPassword(
  _previousState: ResetPasswordState,
  formData: FormData
): Promise<ResetPasswordState> {
  const password = formData.get('password');
  const confirmPassword = formData.get('confirmPassword');

  if (
    typeof password !== 'string' ||
    password.length < 12
  ) {
    return {
      error: 'Use a password with at least 12 characters.',
    };
  }

  if (password !== confirmPassword) {
    return {
      error: 'The passwords do not match.',
    };
  }

  const authorization = await getRecoveryAuthorization();

  if (authorization.status !== 'authorized') {
    return {
      error:
        'This recovery session is invalid or has expired.',
    };
  }

  try {
    const supabase = await createClient();

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      return {
        error: 'Unable to update this password.',
      };
    }

    const cookieStore = await cookies();

    cookieStore.set(RECOVERY_COOKIE, '', {
      ...recoveryCookieOptions(),
      maxAge: 0,
    });

    await supabase.auth.signOut();
  } catch {
    return {
      error: 'Unable to update this password.',
    };
  }

  redirect('/admin/login?reset=success');
}
