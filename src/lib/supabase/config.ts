export interface SupabasePublicConfig {
  url: string;
  publishableKey: string;
}

function isTemplateValue(value: string | undefined): value is string {
  return Boolean(value && !value.includes('<') && !value.includes('>'));
}

/**
 * Only values intentionally safe for a browser client belong here. The
 * service-role key is never read by this module.
 */
export function getSupabasePublicConfig(): SupabasePublicConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!isTemplateValue(url) || !isTemplateValue(publishableKey)) return null;
  return { url, publishableKey };
}
