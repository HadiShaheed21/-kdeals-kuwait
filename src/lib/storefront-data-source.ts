import 'server-only';

/**
 * The live CMS is opt-in. Keeping the default local protects the current
 * browser-local storefront until an owner has imported, reconciled, and
 * explicitly approved Supabase as the source of truth.
 */
export function isSupabaseStorefrontEnabled(): boolean {
  return process.env.KDEALS_STOREFRONT_DATA_SOURCE === 'supabase';
}
