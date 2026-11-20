# Stage 6 staging setup (never run against production)

This guide creates a separate Supabase project for import and integration
testing. It does not link, migrate, seed, or alter the production project.

## 1. Create and configure the staging project

1. In Supabase, create a new project named `kdeals-staging` in the intended
   region. Do not clone production data or Storage objects.
2. In the staging project Auth settings, set Site URL to `http://localhost:3000`
   for local verification. Add the exact local and staging deployment callback
   URLs to the redirect allowlist, including `/auth/callback`.
3. Create a staging-only owner user, then insert a matching active `owner` row
   into `public.admin_users` using the documented Stage 5 provisioning method.
   Create separate editor and ordinary-authenticated fixture users for RLS
   tests. Never promote a production editor to owner as part of testing.
4. Create a staging-only `.env.local` using the staging project public URL and
   publishable key. Keep service-role and database credentials server-only.

## 2. Link only the staging project

Run these commands interactively after verifying the displayed project ref is
the staging ref. The commands intentionally omit all production identifiers.

```bash
npx supabase login
npx supabase link --project-ref <staging-project-ref>
npx supabase db push
```

Confirm that the applied migration list includes Stage 5 migrations and the
reviewed `20261120000000_stage6_import_executor_foundation.sql`. The later
`20261120000001_stage6_atomic_cms_apply.sql` is intentionally unapplied until
its staging review and test fixture run are approved. Do not apply either
Stage 6 migration to the linked production project.

## 3. Run the isolated import checks

1. Replace fixture placeholders in `supabase/tests/stage6_import_executor.integration.sql`.
2. Execute it in the staging SQL editor or supported local Supabase test runner.
3. Confirm each scenario ends in `ROLLBACK` and staging catalog counts remain
   unchanged after the test.
4. Test an owner preflight with the portable export. Verify editors, admins,
   anonymous requests, and ordinary authenticated users are denied owner-only
   import reservation and import bookkeeping reads.

## 4. Feature-flagged storefront test

With staging data only, run the app using:

```bash
KDEALS_STOREFRONT_DATA_SOURCE=supabase npm run dev
```

Verify English and Arabic routes, published-product visibility, disabled
category hiding, variants, KWD formatting, cart, wishlist, and WhatsApp
checkout. Return the flag to `local` immediately after the test.

## 5. Exit criteria

- Owner-only preflight and batch reservation pass.
- Editor/admin/anonymous import attempts fail.
- Private Storage objects are inaccessible directly.
- Every staged media checksum and signature passes.
- No draft or demo product becomes published without a separate owner action.
- Reconciliation matches products, categories, variants, translations, media,
  banners, sections, navigation, and settings.
