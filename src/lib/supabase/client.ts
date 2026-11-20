'use client';

import { createBrowserClient } from '@supabase/ssr';
import { getSupabasePublicConfig } from './config';

/** Client-side auth client. It intentionally uses only the publishable key. */
export function createClient() {
  const config = getSupabasePublicConfig();
  if (!config) throw new Error('Supabase authentication is not configured.');
  return createBrowserClient(config.url, config.publishableKey);
}
