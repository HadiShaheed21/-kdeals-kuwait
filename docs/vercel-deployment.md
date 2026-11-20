# K DEALS Vercel deployment runbook

This runbook prepares deployment for `kdealskuwait.com`. It does **not**
authorize a production database migration, CMS import, storefront cutover,
Vercel deployment, or DNS change.

## GitHub repository readiness

1. Review the working tree; do not commit `.env.local`, exported CMS backups,
   IndexedDB dumps, or Supabase service-role keys.
2. Commit application code, `package-lock.json`, migrations, and documentation
   only after a reviewer confirms the staged diff.
3. Require the GitHub Actions `verify` workflow to pass before merging.

The workflow verifies the safe local-CMS fallback. It never connects to a
Supabase project or deploys an application.

## Vercel project configuration

Create/import one Vercel project from the approved GitHub repository. Configure
these values separately for Preview and Production; do not copy staging or
production secrets into GitHub Actions.

| Variable | Scope | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Preview + Production | Public project URL for the matching environment. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Preview + Production | Publishable key only; never a service-role key. |
| `NEXT_PUBLIC_SITE_URL` | Per environment | Exact origin, such as `https://kdealskuwait.com` in Production. |
| `SUPABASE_RECOVERY_COOKIE_SECRET` | Server only | Unique 32+ character secret per environment. |
| `KDEALS_STOREFRONT_DATA_SOURCE` | Production | Keep `local` through the approved migration/cutover. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Required only when private Supabase media delivery is approved; never prefix it `NEXT_PUBLIC_`. |

`SUPABASE_DB_URL` is a controlled migration credential and is not required by
the deployed application. Do not configure it in the browser or client build.

## Auth configuration

Set the Site URL and Redirect URL allowlist in the corresponding Supabase Auth
project before enabling login/recovery on that environment:

- `http://localhost:3000/auth/callback`
- the exact Preview origin plus `/auth/callback`
- `https://kdealskuwait.com/auth/callback`
- `https://www.kdealskuwait.com/auth/callback` only if it will be served or
  intentionally redirected

Use exact approved preview origins rather than broad wildcards when possible.
After configuration, manually test sign-in, sign-out, expired recovery links,
and a successful password reset. `/auth/callback` and `/admin` are excluded
from locale rewriting by the application proxy.

## Domain and DNS approval gate

Only after the project has a passing production deployment and explicit owner
approval:

1. Add both `kdealskuwait.com` and `www.kdealskuwait.com` in Vercel.
2. Copy the current DNS records displayed by Vercel into the authoritative DNS
   provider. Do not hard-code historical Vercel IPs or CNAME targets.
3. Choose one canonical hostname and configure the other as its Vercel redirect.
4. Update `NEXT_PUBLIC_SITE_URL` and the Supabase Auth allowlist to the canonical
   HTTPS origin.
5. Verify TLS issuance, `/en`, `/ar`, `/admin/login`, and `/auth/callback`.

## CMS and storefront cutover gate

Before changing `KDEALS_STOREFRONT_DATA_SOURCE` to `supabase`, an active owner
must approve all of the following in the target environment:

1. Non-destructive local CMS + IndexedDB export retained with SHA-256 manifest.
2. Staging import executed and reconciled, including English/Arabic content,
   products, categories, variants, media checksums, documents, banners,
   navigation, homepage sections, and settings.
3. Production import separately reviewed and executed with all products draft.
4. Published-content/RLS, private-media signing, admin roles, mobile pages,
   cart, wishlist, and WhatsApp checkout manually smoke-tested.
5. Rollback owner identified. Rollback means setting the environment value back
   to `local` and redeploying; imported database/media records are retained for
   investigation rather than deleted.

## Post-deployment checks

Record the exit status of:

```bash
npx tsc --noEmit
npm run lint
npx next build --webpack
git diff --check
```

Then manually verify desktop and mobile in both locales: catalog/search/category
links, product variants, product images, cart/wishlist persistence, WhatsApp
checkout, admin authorization, and password recovery.
