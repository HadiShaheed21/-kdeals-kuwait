-- STAGING ONLY. Do not run against lxqwlxnysrsryprqnbxq.
-- Replace every <..._UUID> token with a real, staging-only auth.users UUID.
-- This script refuses missing auth users, duplicate IDs, or pre-existing admin
-- mappings. It never updates or deletes an existing account/admin record.

begin;

do $$
declare
  owner_id uuid := '<ACTIVE_OWNER_UUID>'::uuid;
  admin_id uuid := '<ACTIVE_ADMIN_UUID>'::uuid;
  editor_id uuid := '<ACTIVE_EDITOR_UUID>'::uuid;
  inactive_owner_id uuid := '<INACTIVE_OWNER_UUID>'::uuid;
  ordinary_id uuid := '<ORDINARY_USER_UUID>'::uuid;
  fixture_ids uuid[];
begin
  fixture_ids := array[owner_id, admin_id, editor_id, inactive_owner_id, ordinary_id];
  if (select count(distinct fixture_id) from unnest(fixture_ids) as u(fixture_id)) <> 5 then
    raise exception 'fixture UUIDs must be five distinct values';
  end if;
  if (select count(*) from auth.users where id = any(fixture_ids)) <> 5 then
    raise exception 'every fixture UUID must already exist in staging auth.users';
  end if;
  if exists (select 1 from public.admin_users where user_id = any(fixture_ids)) then
    raise exception 'one or more fixture UUIDs already has an admin_users row; refusing to modify it';
  end if;

  insert into public.admin_users (user_id, role, active)
  values
    (owner_id, 'owner', true),
    (admin_id, 'admin', true),
    (editor_id, 'editor', true),
    (inactive_owner_id, 'owner', false);

  -- The ordinary authenticated fixture intentionally receives no admin_users row.
  if exists (select 1 from public.admin_users where user_id = ordinary_id) then
    raise exception 'ordinary fixture must not have an admin_users row';
  end if;
end;
$$;

-- Review these rows before committing. Commit is an explicit operator choice.
select user_id, role, active
from public.admin_users
where user_id in (
  '<ACTIVE_OWNER_UUID>'::uuid,
  '<ACTIVE_ADMIN_UUID>'::uuid,
  '<ACTIVE_EDITOR_UUID>'::uuid,
  '<INACTIVE_OWNER_UUID>'::uuid
)
order by role, active desc;

-- commit; -- deliberately commented out until staging operator approves output.
rollback;
