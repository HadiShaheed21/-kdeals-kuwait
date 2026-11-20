import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabasePublicConfig } from '@/lib/supabase/config';
import { createRecoveryGrant, RECOVERY_COOKIE, recoveryCookieOptions } from '@/lib/supabase/recovery';

const resetPath = '/admin/reset-password';

function resetRedirect(request: NextRequest, error?: string): NextResponse {
  const url = new URL(resetPath, request.url);
  if (error) url.searchParams.set('error', error);
  return NextResponse.redirect(url);
}

/** Exchanges the single-use recovery PKCE code for cookie-backed session tokens. */
export async function GET(request: NextRequest) {
  const config = getSupabasePublicConfig();
  const code = request.nextUrl.searchParams.get('code');
  const tokenHash = request.nextUrl.searchParams.get('token_hash');
  const type = request.nextUrl.searchParams.get('type');
  const next = request.nextUrl.searchParams.get('next');
  if (!config || (!code && !(tokenHash && type === 'recovery')) || next !== resetPath) return resetRedirect(request, 'invalid-link');

  const response = resetRedirect(request);
  const supabase = createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet, headers) => {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
        Object.entries(headers).forEach(([name, value]) => response.headers.set(name, value));
      },
    },
  });

  const flowId = request.nextUrl.searchParams.get('sb_flow_id');
  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code, flowId ? { flowId } : undefined)
    : await supabase.auth.verifyOtp({ token_hash: tokenHash!, type: 'recovery' });
  if (error) return resetRedirect(request, 'expired-link');

  const { data, error: claimsError } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  const grant = !claimsError && typeof userId === 'string' ? createRecoveryGrant(userId) : null;
  if (!grant) return resetRedirect(request, 'invalid-link');

  response.cookies.set(RECOVERY_COOKIE, grant, recoveryCookieOptions());
  return response;
}
