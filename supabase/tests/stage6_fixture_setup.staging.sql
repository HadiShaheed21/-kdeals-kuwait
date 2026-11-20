-- K DEALS Stage 6 fixture setup — STAGING ONLY.
-- Target: ncjtivoghlbbqlkfxrzs (K DEALS STAGING)
-- PRODUCTION EXCLUDED: lxqwlxnysrsryprqnbxq
--
-- Preconditions:
--   1. Independently verify the Supabase CLI/Dashboard target is staging.
--   2. All five UUIDs below already exist in STAGING auth.users.
--   3. Run with a staging SQL-admin session. Do not use an application session.
-- SQL cannot independently read a Supabase project ref; the session marker is
-- an additional human-error guard, not a replacement for target verification.

begin;
select set_config('kdeals.fixture_target_ref', 'ncjtivoghlbbqlkfxrzs', true);

do $$
declare
  expected_ref constant text := 'ncjtivoghlbbqlkfxrzs';
  owner_id constant uuid := 'a9722867-6f3e-4fed-88ec-da9c93d78a48';
  admin_id constant uuid := 'ea69f65b-8d9b-4138-9235-5d90b6f71ecb';
  editor_id constant uuid := 'c499de4f-6acf-443d-89ba-e4677dbfe4b6';
  inactive_owner_id constant uuid := 'e32c975a-e885-46cc-8be9-82e0b96fb30f';
  ordinary_id constant uuid := '0318a764-f2e6-461d-b9f1-e93fb5ab0fbd';
  fixture_ids uuid[];
begin
  if current_setting('kdeals.fixture_target_ref', true) is distinct from expected_ref then
    raise exception 'staging target marker is missing or incorrect';
  end if;
  fixture_ids := array[owner_id, admin_id, editor_id, inactive_owner_id, ordinary_id];
  if (select count(distinct fixture_id) from unnest(fixture_ids) as u(fixture_id)) <> 5 then
    raise exception 'fixture UUIDs must be five distinct values';
  end if;
  if (select count(*) from auth.users where id = any(fixture_ids)) <> 5 then
    raise exception 'every fixture UUID must already exist in staging auth.users';
  end if;
  if exists (select 1 from public.admin_users where user_id = any(fixture_ids)) then
    raise exception 'one or more fixture UUIDs already has an admin_users row; refusing to modify existing mappings';
  end if;

  insert into public.admin_users (user_id, role, active)
  values
    (owner_id, 'owner', true),
    (admin_id, 'admin', true),
    (editor_id, 'editor', true),
    (inactive_owner_id, 'owner', false);

  -- Assertions run before COMMIT. A failed assertion aborts the transaction.
  if (select count(*) from public.admin_users where user_id in (owner_id, admin_id, editor_id, inactive_owner_id)) <> 4 then
    raise exception 'expected exactly four staged admin mappings';
  end if;
  if not exists (select 1 from public.admin_users where user_id = owner_id and role = 'owner' and active) then
    raise exception 'active owner assertion failed';
  end if;
  if not exists (select 1 from public.admin_users where user_id = admin_id and role = 'admin' and active) then
    raise exception 'active admin assertion failed';
  end if;
  if not exists (select 1 from public.admin_users where user_id = editor_id and role = 'editor' and active) then
    raise exception 'active editor assertion failed';
  end if;
  if not exists (select 1 from public.admin_users where user_id = inactive_owner_id and role = 'owner' and not active) then
    raise exception 'inactive owner assertion failed';
  end if;
  if exists (select 1 from public.admin_users where user_id = ordinary_id) then
    raise exception 'ordinary user must remain unmapped';
  end if;
end;
$$;

commit;

-- Post-commit verification: expected four rows, with roles/active values below.
select user_id, role, active, created_at
from public.admin_users
where user_id in (
  'a9722867-6f3e-4fed-88ec-da9c93d78a48'::uuid,
  'ea69f65b-8d9b-4138-9235-5d90b6f71ecb'::uuid,
  'c499de4f-6acf-443d-89ba-e4677dbfe4b6'::uuid,
  'e32c975a-e885-46cc-8be9-82e0b96fb30f'::uuid
)
order by role, active desc;

select count(*) as ordinary_user_admin_rows
from public.admin_users
where user_id = '0318a764-f2e6-461d-b9f1-e93fb5ab0fbd'::uuid;

-- SAFE CLEANUP — execute separately, only in staging, after authorization
-- tests complete. It deletes only the four exact role mappings and never
-- deletes auth.users accounts, CMS data, media, or import records.
--
-- begin;
-- select set_config('kdeals.fixture_target_ref', 'ncjtivoghlbbqlkfxrzs', true);
-- do $$
-- declare removed integer;
-- begin
--   if current_setting('kdeals.fixture_target_ref', true) <> 'ncjtivoghlbbqlkfxrzs' then
--     raise exception 'staging target marker is missing or incorrect';
--   end if;
--   if exists (select 1 from public.admin_users where user_id = '0318a764-f2e6-461d-b9f1-e93fb5ab0fbd'::uuid) then
--     raise exception 'ordinary fixture unexpectedly mapped; refuse cleanup';
--   end if;
--   delete from public.admin_users
--   where (user_id = 'a9722867-6f3e-4fed-88ec-da9c93d78a48'::uuid and role = 'owner' and active)
--      or (user_id = 'ea69f65b-8d9b-4138-9235-5d90b6f71ecb'::uuid and role = 'admin' and active)
--      or (user_id = 'c499de4f-6acf-443d-89ba-e4677dbfe4b6'::uuid and role = 'editor' and active)
--      or (user_id = 'e32c975a-e885-46cc-8be9-82e0b96fb30f'::uuid and role = 'owner' and not active);
--   get diagnostics removed = row_count;
--   if removed <> 4 then raise exception 'expected to remove exactly four fixture mappings, removed %', removed; end if;
-- end;
-- $$;
-- commit;
-- select count(*) as remaining_fixture_mappings from public.admin_users where user_id in (
--   'a9722867-6f3e-4fed-88ec-da9c93d78a48'::uuid,
--   'ea69f65b-8d9b-4138-9235-5d90b6f71ecb'::uuid,
--   'c499de4f-6acf-443d-89ba-e4677dbfe4b6'::uuid,
--   'e32c975a-e885-46cc-8be9-82e0b96fb30f'::uuid
-- );
