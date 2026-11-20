# K DEALS — Stage 5 Part B: Admin authentication

## Implemented boundary

- `/admin/login` is the only unauthenticated admin URL.
- Every dashboard route below the physical `src/app/admin` layout calls `getAdminAuthorization()` on the server before rendering.
- Authorization verifies a Supabase JWT with `auth.getClaims()`, then selects the current user's own `public.admin_users` row. The existing RLS policy permits that self-read; active `owner`, `admin`, and `editor` rows are accepted.
- A valid signed-in user without an active role is signed out during login and cannot render an admin route.
- The client and server use only the public Supabase URL/publishable key. No application code reads `SUPABASE_SERVICE_ROLE_KEY`.

## Required deployment configuration

Set these runtime/build variables from the Supabase project Connect screen, then redeploy:

```text
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
NEXT_PUBLIC_SITE_URL=https://your-production-domain.example
SUPABASE_RECOVERY_COOKIE_SECRET=a-random-server-only-secret-of-at-least-32-characters
```

The legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` remains supported temporarily for existing projects. Do not set a service-role key in any `NEXT_PUBLIC_*` variable.

In Supabase Auth, configure the production Site URL and explicit redirect URLs for the deployed K DEALS origin before enabling email/password sign-in. The dashboard is fail-closed if public configuration is absent.

For password recovery, add these exact origins/URLs in **Supabase Dashboard → Authentication → URL Configuration**:

```text
Site URL (local):       http://localhost:3000
Redirect URL (local):   http://localhost:3000/auth/callback?next=/admin/reset-password
Site URL (production):  https://your-production-domain.example
Redirect URL (prod):    https://your-production-domain.example/auth/callback?next=/admin/reset-password
```

Use the matching `NEXT_PUBLIC_SITE_URL` value in each environment. If the project uses a customized Supabase password-recovery email template, its link must retain the recovery token and target the callback, for example:

```html
<a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=recovery&next=/admin/reset-password">Reset password</a>
```

The callback accepts both this token-hash form and Supabase's PKCE `code` form, but only for the fixed reset-password destination.

## Session lifecycle

`src/proxy.ts` combines the existing locale rewrite with the Supabase SSR cookie refresh flow. It calls `getClaims()` early and copies replacement cookies plus no-cache headers to the response. The server client creates a new request-scoped client for each render/action. Login and logout are server actions, so credentials are not handled in browser JavaScript.

## Manual acceptance checklist

1. In a browser with no Supabase cookies, open `/admin`: it must redirect to `/admin/login`.
2. Sign in as the provisioned active editor: it must redirect to `/admin`, retain the session after refresh, and show the editor role.
3. Sign out: `/admin` must again redirect to login.
4. Sign in with a valid Auth user absent from `admin_users`, or with `active = false`: access must be denied.
5. Inspect browser bundles: no service-role key may appear.
6. Confirm the existing local Stage 4 CMS, IndexedDB media, cart, wishlist, and customer URLs retain their data and behavior.
