# K DEALS

K DEALS is a bilingual (English/Arabic) Kuwait marketplace built with Next.js,
React, TypeScript, and Supabase. Prices are represented in KWD with three
decimal places.

## Local development

1. Copy `.env.example` to `.env.local` and provide only local/development
   credentials.
2. Install the locked dependencies with `npm ci`.
3. Run `npm run dev` and open `http://localhost:3000/en` or
   `http://localhost:3000/ar`.

Quality checks:

```bash
npx tsc --noEmit
npm run lint
npx next build --webpack
git diff --check
```

## CMS data sources

The browser-local Stage 4 CMS and IndexedDB media library are the active
source by default. `KDEALS_STOREFRONT_DATA_SOURCE=local` must remain set until
an owner has completed the approved Supabase import, reconciliation, media
validation, and storefront smoke test.

`KDEALS_STOREFRONT_DATA_SOURCE=supabase` enables the server-side public CMS
snapshot. Published product images and documents are delivered through a
same-origin route that verifies their public product relationship, signs and
streams the private object server-side. The service-role key is server-only and
must never use a `NEXT_PUBLIC_` prefix.

## Deployment

The reviewed deployment and rollback sequence for `kdealskuwait.com` is in
[docs/vercel-deployment.md](docs/vercel-deployment.md). It deliberately stops
before domain/DNS, production data migration, or storefront source cutover;
those steps require explicit owner approval.

## Security boundaries

- `/admin` requires a verified Supabase session and an active database-backed
  `admin_users` role.
- Supabase RLS, not browser state, authorizes CMS changes.
- Private product/media Storage is never made public to the browser.
- Cart, wishlist, and the current local CMS are intentionally preserved during
  the staged Supabase migration.
