-- K DEALS Stage 6 authorization and idempotency test — STAGING ONLY.
-- Target: ncjtivoghlbbqlkfxrzs (K DEALS STAGING)
-- PRODUCTION EXCLUDED: lxqwlxnysrsryprqnbxq
-- Requires only the four deployed migrations. The fifth atomic-apply migration
-- must remain unapplied for this test. Every operation is rolled back.
--
-- Run with a staging SQL-admin session that may SET LOCAL ROLE authenticated
-- and anon. `request.jwt.claim.sub` is the supported PostgREST claim setting
-- consumed by auth.uid() in the deployed is_owner()/is_admin() helpers.
-- SQL cannot independently discover a Supabase project ref; verify CLI/Dashboard
-- target first. The marker below is an additional human-error guard.

begin;
select set_config('kdeals.authorization_test_target_ref', 'ncjtivoghlbbqlkfxrzs', true);

create temporary table stage6_assertions (
  assertion text primary key,
  detail text not null
) on commit drop;

-- Fixture preflight. It makes no persistent changes and fails before any role
-- simulation if a fixture is absent, altered, or ordinary user is mapped.
do $$
declare
  owner_id constant uuid := 'a9722867-6f3e-4fed-88ec-da9c93d78a48';
  admin_id constant uuid := 'ea69f65b-8d9b-4138-9235-5d90b6f71ecb';
  editor_id constant uuid := 'c499de4f-6acf-443d-89ba-e4677dbfe4b6';
  inactive_owner_id constant uuid := 'e32c975a-e885-46cc-8be9-82e0b96fb30f';
  ordinary_id constant uuid := '0318a764-f2e6-461d-b9f1-e93fb5ab0fbd';
begin
  if current_setting('kdeals.authorization_test_target_ref', true) <> 'ncjtivoghlbbqlkfxrzs' then
    raise exception 'staging target marker is missing or incorrect';
  end if;
  if (select count(*) from auth.users where id in (owner_id, admin_id, editor_id, inactive_owner_id, ordinary_id)) <> 5 then
    raise exception 'all five staging auth fixtures must exist';
  end if;
  if not exists (select 1 from public.admin_users where user_id = owner_id and role = 'owner' and active) then raise exception 'active owner fixture is invalid'; end if;
  if not exists (select 1 from public.admin_users where user_id = admin_id and role = 'admin' and active) then raise exception 'active admin fixture is invalid'; end if;
  if not exists (select 1 from public.admin_users where user_id = editor_id and role = 'editor' and active) then raise exception 'active editor fixture is invalid'; end if;
  if not exists (select 1 from public.admin_users where user_id = inactive_owner_id and role = 'owner' and not active) then raise exception 'inactive owner fixture is invalid'; end if;
  if exists (select 1 from public.admin_users where user_id = ordinary_id) then raise exception 'ordinary fixture must have no admin_users row'; end if;
end;
$$;
insert into stage6_assertions values ('fixture preflight', 'four exact admin mappings exist; ordinary user is unmapped');

-- Anonymous has neither SELECT on import metadata nor EXECUTE on reservation.
set local role anon;
do $$
declare rpc_denied boolean := false; table_denied boolean := false;
begin
  begin
    perform public.reserve_cms_import_batch('stage6-anon.json', repeat('e', 64), repeat('f', 64), '[]'::jsonb);
  exception when insufficient_privilege then rpc_denied := true;
  end;
  begin
    perform 1 from public.import_batches limit 1;
  exception when insufficient_privilege then table_denied := true;
  end;
  if not rpc_denied or not table_denied then
    raise exception 'anonymous import access unexpectedly succeeded (rpc %, table %)', rpc_denied, table_denied;
  end if;
end;
$$;
reset role;
insert into stage6_assertions values ('anonymous denied', 'reservation RPC and import_batches SELECT both returned SQLSTATE 42501');

set local role authenticated;

-- auth.uid() is populated from request.jwt.claim.sub. Active admin/editor are
-- valid admins but are intentionally not owners; ordinary and inactive owner
-- are neither active admin nor owner. All must be denied reservation.
do $$
declare
  actor record;
begin
  for actor in
    select * from (values
      ('ordinary user'::text, '0318a764-f2e6-461d-b9f1-e93fb5ab0fbd'::uuid, false),
      ('active editor'::text, 'c499de4f-6acf-443d-89ba-e4677dbfe4b6'::uuid, true),
      ('active admin'::text, 'ea69f65b-8d9b-4138-9235-5d90b6f71ecb'::uuid, true),
      ('inactive owner'::text, 'e32c975a-e885-46cc-8be9-82e0b96fb30f'::uuid, false)
    ) as fixtures(label, user_id, expected_admin)
  loop
    perform set_config('request.jwt.claim.sub', actor.user_id::text, true);
    if public.is_admin() is distinct from actor.expected_admin then
      raise exception '% is_admin() did not match expected active-role state', actor.label;
    end if;
    if public.is_owner() then
      raise exception '% unexpectedly passed is_owner()', actor.label;
    end if;
    begin
      perform public.reserve_cms_import_batch('stage6-denied-' || replace(actor.label, ' ', '-') || '.json', repeat('a', 64), repeat('b', 64), '[]'::jsonb);
      raise exception '% unexpectedly reserved an import batch', actor.label;
    exception when insufficient_privilege then
      null;
    end;
  end loop;
end;
$$;
reset role;
insert into stage6_assertions values ('ordinary/editor/admin/inactive owner denied', 'only active owner may reserve; active editor/admin remain CMS admins but not import owners');

set local role authenticated;

-- Genuine before/after checks: reservation may create exactly one batch/event,
-- and must never create any product. Refuse a reused test fingerprint so the
-- assertion cannot hide a previously persisted test row.
do $$
declare
  owner_id constant uuid := 'a9722867-6f3e-4fed-88ec-da9c93d78a48';
  test_fingerprint constant text := repeat('c', 64);
  before_batches integer;
  after_batches integer;
  before_products integer;
  after_products integer;
  first_id uuid;
  second_id uuid;
begin
  perform set_config('request.jwt.claim.sub', owner_id::text, true);
  if not public.is_admin() or not public.is_owner() then raise exception 'active owner claim simulation failed'; end if;
  select count(*) into before_batches from public.import_batches where source_fingerprint = test_fingerprint;
  select count(*) into before_products from public.products;
  if before_batches <> 0 then raise exception 'test fingerprint already exists; choose a new rollback-test fingerprint'; end if;
  select (public.reserve_cms_import_batch('stage6-owner-idempotency.json', test_fingerprint, repeat('d', 64), '[]'::jsonb)).id into first_id;
  select (public.reserve_cms_import_batch('stage6-owner-idempotency.json', test_fingerprint, repeat('d', 64), '[]'::jsonb)).id into second_id;
  select count(*) into after_batches from public.import_batches where source_fingerprint = test_fingerprint;
  select count(*) into after_products from public.products;
  if first_id <> second_id or after_batches <> before_batches + 1 then
    raise exception 'idempotent reservation assertion failed (first %, second %, before %, after %)', first_id, second_id, before_batches, after_batches;
  end if;
  if after_products <> before_products then
    raise exception 'reservation unexpectedly changed product count (before %, after %)', before_products, after_products;
  end if;
  if (select count(*) from public.import_batch_events where batch_id = first_id and event_type = 'reserved') <> 1 then
    raise exception 'expected exactly one reservation event';
  end if;
end;
$$;
reset role;
insert into stage6_assertions values ('active owner idempotency and no-product side effect', 'one batch and one reservation event; product count unchanged');

table stage6_assertions;

-- No COMMIT. This removes the test batch/event and all session-local state.
rollback;
