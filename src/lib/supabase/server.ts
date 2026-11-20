import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabasePublicConfig } from './config';

export class SupabaseConfigurationError extends Error {
  constructor() {
    super('Supabase authentication is not configured.');
  }
}

/** Creates a request-scoped cookie-backed SSR client. */
export async function createClient() {
  const config = getSupabasePublicConfig();
  if (!config) throw new SupabaseConfigurationError();

  const cookieStore = await cookies();
  return createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components cannot mutate response cookies. src/proxy.ts
          // refreshes sessions before rendering and writes any replacement cookies.
        }
      },
    },
  });
}
