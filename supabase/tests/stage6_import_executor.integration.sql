-- Run only in an isolated Supabase/Postgres test project after applying the
-- Stage 6 migration. Never run against production. Wrap each scenario in a
-- transaction and roll it back. Configure request.jwt.claim.sub for fixture
-- users and insert matching public.admin_users rows in test setup.

begin;

-- 1. Unauthorized / editor/admin calls must fail (42501) because is_owner()
-- returns false. The executor's SQL function is security invoker, not definer.
-- set local role authenticated;
-- select set_config('request.jwt.claim.sub', '<editor-user-uuid>', true);
-- select public.reserve_cms_import_batch('fixture.json', repeat('a', 64), repeat('b', 64), '[]'::jsonb);

-- 2. An owner may reserve exactly one batch for a fingerprint. Repeating the
-- call must return the same id, not insert a duplicate import_batches row.
-- select set_config('request.jwt.claim.sub', '<owner-user-uuid>', true);
-- select (public.reserve_cms_import_batch('fixture.json', repeat('a', 64), repeat('b', 64), '[]'::jsonb)).id;
-- select count(*) = 1 as idempotent from public.import_batches where source_fingerprint = repeat('a', 64);

-- 3. A partial media failure remains visible as a failed media row/batch and
-- cannot create CMS products. The future apply RPC must reject a batch unless
-- every import_batch_media row is verified.
-- insert into public.import_batch_media (...) values (..., 'failed', 'checksum mismatch');
-- select count(*) = 0 as no_products_before_apply from public.products;

-- 4. Media integrity: compare the upload's server-side SHA-256 result with
-- import_batch_media.sha256 before changing upload_status to verified.
-- A mismatch must keep status failed and block the apply RPC.

rollback;
