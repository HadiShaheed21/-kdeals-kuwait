# K DEALS Stage 6–7 production readiness

## Current safety state

- Customer storefront source defaults to browser-local CMS data.
- `KDEALS_STOREFRONT_DATA_SOURCE=supabase` is an explicit server-side opt-in.
- If public Supabase reads fail, the customer layout falls back to the existing
  local/seed CMS shape rather than rendering partial remote content.
- Import execution and Storage uploads remain disabled. The Stage 6 executor
  migration is unapplied and must not be run against production without review.

## Required pre-cutover sequence

1. Apply `20261120000000_stage6_import_executor_foundation.sql` to an isolated
   Supabase project and run `supabase/tests/stage6_import_executor.integration.sql`.
2. Verify owner, admin, editor, anonymous, and unauthenticated behavior under
   RLS. Editors/admins must be denied import reservation and import tables.
3. Run an owner-approved import against a non-production project. Keep all
   products draft until record counts, translations, variants, mappings, and
   media checksums reconcile.
4. Verify private image/PDF signing only works for published products in
   enabled categories; confirm URLs expire and do not reveal object paths.
5. Capture a browser-local CMS export and IndexedDB media backup before each
   execution. Retain its SHA-256 source fingerprint with the batch record.
6. Test English/Arabic storefront, product search, filters, cart, wishlist,
   WhatsApp checkout, desktop, and mobile against Supabase data.
7. Set `KDEALS_STOREFRONT_DATA_SOURCE=supabase` only after owner approval and
   a successful smoke test. Do not enable it merely because an import completed.

## Rollback

1. Set `KDEALS_STOREFRONT_DATA_SOURCE=local` and redeploy/restart the app.
2. Do not delete imported rows or Storage assets during incident response.
3. Mark the import batch failed/rolled_back only through the reviewed owner
   workflow, preserve import events, and compare `legacy_id_map` before retry.
4. Restore customer content from the local export only in a separately approved
   recovery workflow.

## Deployment environment checklist

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or the legacy anon key during key rotation)
- `NEXT_PUBLIC_SITE_URL` is the exact deployed origin and Supabase redirect allowlist entry
- `SUPABASE_SERVICE_ROLE_KEY` is server-only, not prefixed `NEXT_PUBLIC_`, and is configured only where signed-media delivery is enabled
- `SUPABASE_RECOVERY_COOKIE_SECRET` is unique, strong, and server-only
- `KDEALS_STOREFRONT_DATA_SOURCE=local` until approved cutover
- No database URL, service key, export file, or media payload appears in client bundles, logs, or source control

## Production smoke test

- Verify anonymous visitors see only published products in enabled categories.
- Verify unpublished media/PDFs and private buckets cannot be read directly.
- Verify active owner/admin/editor route permissions, including owner-only import preflight.
- Verify password recovery and login callback on the final public URL.
- Verify KWD values show three decimal places, variants respect stock, and
  WhatsApp orders contain the expected localized product and total details.
- Verify Arabic routes are RTL and all header/footer/category links work.
