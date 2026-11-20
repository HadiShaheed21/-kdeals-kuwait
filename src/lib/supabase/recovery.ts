import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

export const RECOVERY_COOKIE = 'kdeals_admin_recovery';
const RECOVERY_TTL_SECONDS = 10 * 60;

interface RecoveryGrant {
  userId: string;
  expiresAt: number;
}

function getRecoverySecret(): string | null {
  const secret = process.env.SUPABASE_RECOVERY_COOKIE_SECRET;
  return secret && secret.length >= 32 ? secret : null;
}

function signature(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

/** Creates a short-lived, server-signed grant after a successful recovery-code exchange. */
export function createRecoveryGrant(userId: string): string | null {
  const secret = getRecoverySecret();
  if (!secret) return null;
  const payload = Buffer.from(JSON.stringify({ userId, expiresAt: Date.now() + RECOVERY_TTL_SECONDS * 1000 } satisfies RecoveryGrant)).toString('base64url');
  return `${payload}.${signature(payload, secret)}`;
}

export function verifyRecoveryGrant(value: string | undefined, userId: string): boolean {
  const secret = getRecoverySecret();
  if (!value || !secret) return false;
  const [payload, suppliedSignature, extra] = value.split('.');
  if (!payload || !suppliedSignature || extra) return false;

  const expectedSignature = signature(payload, secret);
  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return false;

  try {
    const grant = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as RecoveryGrant;
    return grant.userId === userId && Number.isFinite(grant.expiresAt) && grant.expiresAt > Date.now();
  } catch {
    return false;
  }
}

export async function hasValidRecoveryGrant(userId: string): Promise<boolean> {
  const cookieStore = await cookies();
  return verifyRecoveryGrant(cookieStore.get(RECOVERY_COOKIE)?.value, userId);
}

export function recoveryCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/admin/reset-password',
    maxAge: RECOVERY_TTL_SECONDS,
  };
}
