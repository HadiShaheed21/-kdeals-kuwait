-- K DEALS Stage 6 Phase 1: reviewed-but-unapplied import execution foundation.
--
-- This migration is intentionally NOT applied by the application. It creates
-- no CMS data and uploads no Storage objects. A later approved execution phase
-- must first apply this migration, run the companion integration tests in an
-- isolated project, and implement a server-only RPC caller.

-- Import batches need durable owner/audit/progress data while preserving all
-- existing rows and their currently valid statuses.
alter table public.import_batches
  add column if not exists owner_user_id uuid references auth.users(id) on delete restrict,
  add column if not exists manifest_sha256 text,
  add column if not exists review_acknowledgements jsonb not null default '[]'::jsonb,
  add column if not exists last_error text,
  add column if not exists updated_at timestamptz not null default now();

alter table public.import_batches
  drop constraint if exists import_batches_status_check;
alter table public.import_batches
  add constraint import_batches_status_check check (status in ('started', 'validated', 'staged', 'media_uploaded', 'applying', 'reconciling', 'completed', 'failed', 'rolled_back'));
alter table public.import_batches
  -- NOT VALID preserves any historic bookkeeping rows. PostgreSQL still
  -- enforces the check for every new/updated row; validate it only after a
  -- staging audit proves all existing fingerprints conform.
  add constraint import_batches_source_fingerprint_sha256_check check (source_fingerprint ~ '^[a-f0-9]{64}$') not valid;
alter table public.import_batches
  add constraint import_batches_manifest_sha256_check check (manifest_sha256 is null or manifest_sha256 ~ '^[a-f0-9]{64}$') not valid;

create table if not exists public.import_batch_media (
  batch_id uuid not null references public.import_batches(id) on delete cascade,
  media_asset_id uuid not null,
  legacy_media_id text not null,
  storage_bucket text not null check (storage_bucket in ('product-images', 'product-documents', 'site-banners')),
  storage_path text not null,
  sha256 text not null check (sha256 ~ '^[a-f0-9]{64}$'),
  byte_size bigint not null check (byte_size > 0),
  upload_status text not null default 'planned' check (upload_status in ('planned', 'uploaded', 'verified', 'failed', 'deleted')),
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (batch_id, legacy_media_id),
  unique (batch_id, media_asset_id),
  unique (storage_bucket, storage_path)
);

create table if not exists public.import_batch_events (
  id bigint generated always as identity primary key,
  batch_id uuid not null references public.import_batches(id) on delete cascade,
  event_type text not null check (event_type in ('preflight', 'reserved', 'media_planned', 'media_verified', 'apply_started', 'apply_failed', 'reconciled', 'rollback_requested')),
  detail jsonb not null default '{}'::jsonb,
  actor_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists import_batch_media_status_idx on public.import_batch_media (batch_id, upload_status);
create index if not exists import_batch_events_batch_idx on public.import_batch_events (batch_id, created_at);

drop trigger if exists import_batches_set_updated_at on public.import_batches;
create trigger import_batches_set_updated_at before update on public.import_batches for each row execute function public.set_updated_at();
drop trigger if exists import_batch_media_set_updated_at on public.import_batch_media;
create trigger import_batch_media_set_updated_at before update on public.import_batch_media for each row execute function public.set_updated_at();

alter table public.import_batch_media enable row level security;
alter table public.import_batch_events enable row level security;

-- Least privilege: only the authenticated role needs table access, and RLS
-- restricts that access to active owners. anon and PUBLIC retain no access.
revoke all privileges on table public.import_batch_media, public.import_batch_events from public, anon, authenticated;
grant select, insert, update on table public.import_batch_media, public.import_batch_events to authenticated;
grant usage, select on sequence public.import_batch_events_id_seq to authenticated;

drop policy if exists import_batch_media_owner_all on public.import_batch_media;
create policy import_batch_media_owner_all on public.import_batch_media
  for all to authenticated
  using (public.is_owner()) with check (public.is_owner());
drop policy if exists import_batch_events_owner_all on public.import_batch_events;
create policy import_batch_events_owner_all on public.import_batch_events
  for all to authenticated
  using (public.is_owner()) with check (public.is_owner());

-- Security invoker intentionally preserves the calling owner's RLS identity.
-- It acquires a transaction-scoped advisory lock and makes source fingerprint
-- reservation idempotent. No service-role client is necessary or permitted.
create or replace function public.reserve_cms_import_batch(
  p_source_name text,
  p_source_fingerprint text,
  p_manifest_sha256 text,
  p_review_acknowledgements jsonb default '[]'::jsonb
)
returns public.import_batches
language plpgsql
security invoker
set search_path = pg_catalog, public, auth
as $$
declare
  reserved public.import_batches;
begin
  if not public.is_owner() then
    raise exception 'active owner required' using errcode = '42501';
  end if;
  if p_source_fingerprint !~ '^[a-f0-9]{64}$' or p_manifest_sha256 !~ '^[a-f0-9]{64}$' then
    raise exception 'source and manifest fingerprints must be SHA-256 hex' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtext('kdeals-cms-import:' || p_source_fingerprint));
  select * into reserved from public.import_batches where source_fingerprint = p_source_fingerprint for update;
  if found then
    return reserved;
  end if;
  insert into public.import_batches (source_name, source_fingerprint, status, owner_user_id, manifest_sha256, review_acknowledgements)
  values (p_source_name, p_source_fingerprint, 'validated', auth.uid(), p_manifest_sha256, p_review_acknowledgements)
  returning * into reserved;
  insert into public.import_batch_events (batch_id, event_type, detail, actor_user_id)
  values (reserved.id, 'reserved', jsonb_build_object('source_fingerprint', p_source_fingerprint), auth.uid());
  return reserved;
end;
$$;

revoke all on function public.reserve_cms_import_batch(text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.reserve_cms_import_batch(text, text, text, jsonb) to authenticated;

-- A future approved executor must:
-- 1. reserve a batch using the function above;
-- 2. insert only planned media metadata into import_batch_media;
-- 3. upload via a server-only owner/session path to private buckets;
-- 4. download/head and checksum-verify each object before setting verified;
-- 5. call a separately reviewed atomic apply RPC that keeps all imported
--    products as draft until mappings, translations, and relations reconcile;
-- 6. only then permit an explicit publication/cutover decision.
-- No apply RPC is created in Phase 1, so this migration cannot publish data.
