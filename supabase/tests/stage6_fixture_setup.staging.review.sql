-- REVIEW-ONLY, STAGING-ONLY fixture preview.
-- Target: ncjtivoghlbbqlkfxrzs (K DEALS STAGING)
-- Production target explicitly excluded: lxqwlxnysrsryprqnbxq.
--
-- Before any future execution, independently verify the CLI target with:
--   npx supabase migration list --remote
-- SQL cannot independently discover a Supabase project ref, so the transaction
-- also requires an explicit session target marker. This is a human-error guard,
-- not a substitute for CLI/Dashboard target verification.
-- This file always ROLLBACKs and must not be edited to COMMIT without separate
-- staging approval.

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
    raise exception 'one or more fixture UUIDs already has an admin_users row; refusing to alter existing mappings';
  end if;

  insert into public.admin_users (user_id, role, active)
  values
    (owner_id, 'owner', true),
    (admin_id, 'admin', true),
    (editor_id, 'editor', true),
    (inactive_owner_id, 'owner', false);

  if exists (select 1 from public.admin_users where user_id = ordinary_id) then
    raise exception 'ordinary user must remain unmapped';
  end if;
end;
$$;

select user_id, role, active
from public.admin_users
where user_id in (
  'a9722867-6f3e-4fed-88ec-da9c93d78a48'::uuid,
  'ea69f65b-8d9b-4138-9235-5d90b6f71ecb'::uuid,
  'c499de4f-6acf-443d-89ba-e4677dbfe4b6'::uuid,
  'e32c975a-e885-46cc-8be9-82e0b96fb30f'::uuid
)
order by role, active desc;

-- Expected preview: four rows: active owner/admin/editor and inactive owner.
-- Expected ordinary-user query result: zero rows.
select count(*) as ordinary_user_admin_rows
from public.admin_users
where user_id = '0318a764-f2e6-461d-b9f1-e93fb5ab0fbd'::uuid;

rollback;
