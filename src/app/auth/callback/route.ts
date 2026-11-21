
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabasePublicConfig } from '@/lib/supabase/config';
import {
  createRecoveryGrant,
  RECOVERY_COOKIE,
  recoveryCookieOptions,
} from '@/lib/supabase/recovery';

const resetPath = '/admin/reset-password';
const adminPath = '/admin';
const accessPath = '/admin/request-access';

function redirectWithError(
  request: NextRequest,
  path: string,
  error: string
): NextResponse {
  const url = new URL(path, request.url);
  url.searchParams.set('error', error);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const config = getSupabasePublicConfig();

  const code = request.nextUrl.searchParams.get('code');
  const tokenHash = request.nextUrl.searchParams.get('token_hash');
  const type = request.nextUrl.searchParams.get('type');
  const next = request.nextUrl.searchParams.get('next');
  const flowId = request.nextUrl.searchParams.get('sb_flow_id');

  const passwordReset = next === resetPath;
  const adminEntry = next === adminPath;

  // Reject unknown callback destinations.
  if (!passwordReset && !adminEntry) {
    return redirectWithError(request, accessPath, 'invalid-link');
  }

  const errorPath = passwordReset ? resetPath : accessPath;

  if (!config) {
    return redirectWithError(
      request,
      errorPath,
      'configuration-error'
    );
  }

  // Recovery tokens are only accepted for password recovery.
  const validRecoveryToken =
    passwordReset &&
    Boolean(tokenHash) &&
    type === 'recovery';

  if (!code && !validRecoveryToken) {
    return redirectWithError(
      request,
      errorPath,
      'invalid-link'
    );
  }

  const destination = passwordReset ? resetPath : adminPath;

  const response = NextResponse.redirect(
    new URL(destination, request.url)
  );

  const supabase = createServerClient(
    config.url,
    config.publishableKey,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),

        setAll: (cookiesToSet, headers) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });

          Object.entries(headers).forEach(([name, value]) => {
            response.headers.set(name, value);
          });
        },
      },
    }
  );

  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(
        code,
        flowId ? { flowId } : undefined
      )
    : await supabase.auth.verifyOtp({
        token_hash: tokenHash!,
        type: 'recovery',
      });

  if (error) {
    return redirectWithError(
      request,
      errorPath,
      'expired-link'
    );
  }

  const { data, error: claimsError } =
    await supabase.auth.getClaims();

  const userId = data?.claims?.sub;

  if (claimsError || typeof userId !== 'string') {
    return redirectWithError(
      request,
      errorPath,
      'invalid-link'
    );
  }

  if (passwordReset) {
    const grant = createRecoveryGrant(userId);

    if (!grant) {
      return redirectWithError(
        request,
        resetPath,
        'invalid-link'
      );
    }

    response.cookies.set(
      RECOVERY_COOKIE,
      grant,
      recoveryCookieOptions()
    );
  }

  return response;
}
