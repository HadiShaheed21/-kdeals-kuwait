import 'server-only';

import { createClient, SupabaseConfigurationError } from './server';

export type AdminRole = 'owner' | 'admin' | 'editor';
export type AdminAuthorization =
  | { status: 'authorized'; userId: string; role: AdminRole }
  | { status: 'anonymous' | 'unauthorized' | 'unavailable' };

/**
 * Authorizes an admin request with a verified Supabase JWT and the database's
 * own RLS-protected admin_users row. A browser-supplied role is never trusted.
 */
export async function getAdminAuthorization(): Promise<AdminAuthorization> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getClaims();
    const userId = data?.claims?.sub;
    if (error || typeof userId !== 'string') return { status: 'anonymous' };

    const { data: membership, error: membershipError } = await supabase
      .from('admin_users')
      .select('role, active')
      .eq('user_id', userId)
      .maybeSingle();

    if (membershipError || !membership?.active) return { status: 'unauthorized' };
    if (membership.role !== 'owner' && membership.role !== 'admin' && membership.role !== 'editor') {
      return { status: 'unauthorized' };
    }

    return { status: 'authorized', userId, role: membership.role };
  } catch (error) {
    if (error instanceof SupabaseConfigurationError) return { status: 'unavailable' };
    // Fail closed for database/network failures as well as malformed sessions.
    return { status: 'unauthorized' };
  }
}
