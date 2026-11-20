# Stage 6 staging authorization test procedure

Do not run this procedure against production. It intentionally includes
write-based checks inside a transaction, so obtain explicit approval before
running the execution section.

## 1. Resolve the CLI-link mismatch first

Local Supabase metadata must name exactly one project ref. Before any SQL:

```bash
# Read-only confirmation commands. Inspect output before proceeding.
npx supabase projects list
npx supabase migration list --linked
```

The linked project must be `ncjtivoghlbbqlkfxrzs`. If any command identifies
`lxqwlxnysrsryprqnbxq`, stop: do not run SQL or migrations. Relink only after
the operator confirms the staging project in the dashboard:

```bash
npx supabase link --project-ref ncjtivoghlbbqlkfxrzs
npx supabase migration list --linked
```

The current staging migration history must contain all four deployed files
through `20261120000000_stage6_import_executor_foundation.sql`. Do not apply
the new local `20261120000001_stage6_atomic_cms_apply.sql` until its atomic
apply contract has been reviewed and the required fixtures are available.

## 2. Required staging fixtures

Create these only in staging and record their UUIDs without sharing credentials:

| Fixture | `auth.users` account | `public.admin_users` row |
| --- | --- | --- |
| Owner | active authenticated user | `role='owner', active=true` |
| Admin | active authenticated user | `role='admin', active=true` |
| Editor | active authenticated user | `role='editor', active=true` |
| Inactive owner | active authenticated user | `role='owner', active=false` |
| Ordinary user | active authenticated user | no row |

Never use a production user UUID. The staging test operator needs a database
session allowed to `SET LOCAL ROLE authenticated` and set
`request.jwt.claim.sub`; Supabase SQL Editor/admin connections normally have
this ability, but application sessions do not. This simulates PostgreSQL RLS
claims; it does **not** replace separate browser/SSR session testing.

## 3. Read-only preflight queries

Run these first in the staging SQL editor. They do not write data.

```sql
select current_database(), current_user;
select id, name, public, file_size_limit
from storage.buckets
where id in ('product-images', 'product-documents', 'site-banners');

select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('import_batches', 'import_batch_media', 'import_batch_events', 'legacy_id_map', 'media_assets')
order by tablename;

select tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('import_batches', 'import_batch_media', 'import_batch_events', 'legacy_id_map', 'media_assets')
order by tablename, policyname;

select has_table_privilege('anon', 'public.import_batches', 'select') as anon_can_read_batches,
       has_table_privilege('authenticated', 'public.import_batches', 'insert') as authenticated_has_sql_insert,
       has_function_privilege('anon', 'public.reserve_cms_import_batch(text,text,text,jsonb)', 'execute') as anon_can_reserve,
       has_function_privilege('authenticated', 'public.reserve_cms_import_batch(text,text,text,jsonb)', 'execute') as authenticated_can_call;
```

Expected: RLS is enabled; anonymous direct access and RPC execution are false;
the authenticated SQL grant may be true, while owner-only RLS/function checks
remain the mandatory gate.

## 4. Approved write-based transaction test sequence

Use `supabase/tests/stage6_import_executor.integration.sql` only after filling
fixture UUID placeholders and converting each expected failure into a `DO`
block that catches only SQLSTATE `42501`. The current file is a review outline,
not an executable suite.

Within one `BEGIN … ROLLBACK` transaction, test these cases:

1. **Editor, admin, inactive owner, ordinary user:** calling
   `reserve_cms_import_batch` must fail with `42501`.
2. **Anonymous:** direct table read/insert and RPC execution must fail; expect
   permission denial before any data is exposed.
3. **Active owner:** first reservation with 64-character lowercase SHA-256
   values returns `status='validated'`, `owner_user_id=auth.uid()`, and one
   event.
4. **Duplicate owner call:** same fingerprint returns the same batch ID and
   leaves exactly one batch row.
5. **Checksum mismatch:** insert planned media, mark it `failed` with an error,
   and verify no CMS product row is inserted. There is no apply RPC yet, so the
   expected state is a visible failed media record only.
6. **Partial-media failure recovery:** verify a failed batch cannot advance to
   an apply/publish state. The future apply RPC must require every planned media
   record to be `verified`.

`ROLLBACK` reverts table rows and policy-visible data. PostgreSQL identity
sequences are not transactional, so `import_batch_events.id` may advance even
after rollback; this is harmless but should be documented in test evidence.

## 5. Expected stop conditions

Stop immediately and retain query output if:

- project ref is not `ncjtivoghlbbqlkfxrzs`;
- Stage 6 migration is absent or differs from reviewed source;
- any non-owner reserves a batch or reads import metadata;
- anon can execute the reservation RPC;
- Storage bucket is public;
- a failure leaves published CMS records or untracked Storage objects.

No portable export, image blob, PDF, or production-like catalog data is needed
for this authorization test.
