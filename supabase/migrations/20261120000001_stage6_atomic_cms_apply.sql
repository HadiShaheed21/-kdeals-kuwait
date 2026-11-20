-- K DEALS Stage 6: staged, atomic CMS apply. REVIEW ONLY — unapplied.
-- The caller must first reserve a batch, stage a normalized payload, upload
-- every private object, and mark every planned object verified. This function
-- never publishes products: all imported products are created as draft.

create table if not exists public.import_batch_payloads (
  batch_id uuid primary key references public.import_batches(id) on delete cascade,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  payload_sha256 text not null check (payload_sha256 ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists import_batch_payloads_set_updated_at on public.import_batch_payloads;
create trigger import_batch_payloads_set_updated_at before update on public.import_batch_payloads
  for each row execute function public.set_updated_at();

alter table public.import_batch_payloads enable row level security;
revoke all privileges on table public.import_batch_payloads from public, anon, authenticated;
grant select, insert, update on table public.import_batch_payloads to authenticated;
drop policy if exists import_batch_payloads_owner_all on public.import_batch_payloads;
create policy import_batch_payloads_owner_all on public.import_batch_payloads
  for all to authenticated using (public.is_owner()) with check (public.is_owner());

-- Staging can be retried before application, but a completed batch payload is
-- immutable. The server must calculate payload_sha256 from canonical JSON and
-- must never send base64 object data to this RPC.
create or replace function public.stage_cms_import_payload(
  p_batch_id uuid,
  p_payload jsonb,
  p_payload_sha256 text
)
returns void
language plpgsql
security invoker
set search_path = pg_catalog, public, auth
as $$
declare
  current_status text;
  current_owner_user_id uuid;
begin
  if not public.is_owner() then raise exception 'active owner required' using errcode = '42501'; end if;
  if jsonb_typeof(p_payload) <> 'object' or p_payload_sha256 !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid staged import payload' using errcode = '22023';
  end if;
  select status, owner_user_id into current_status, current_owner_user_id from public.import_batches where id = p_batch_id for update;
  if current_status is null then raise exception 'import batch not found' using errcode = 'P0002'; end if;
  if current_owner_user_id is distinct from auth.uid() then
    raise exception 'only the owner who reserved this import batch may stage it' using errcode = '42501';
  end if;
  if current_status in ('completed', 'applying', 'reconciling') then raise exception 'batch cannot be restaged from status %', current_status using errcode = '55000'; end if;
  insert into public.import_batch_payloads (batch_id, payload, payload_sha256)
  values (p_batch_id, p_payload, p_payload_sha256)
  on conflict (batch_id) do update set payload = excluded.payload, payload_sha256 = excluded.payload_sha256;
  update public.import_batches set status = 'staged', last_error = null where id = p_batch_id;
  insert into public.import_batch_events (batch_id, event_type, detail, actor_user_id)
  values (p_batch_id, 'preflight', jsonb_build_object('payload_sha256', p_payload_sha256), auth.uid());
end;
$$;

-- Applies only normalized UUID-based rows. The payload contract is:
-- {media_assets:[], categories:[], products:[], translations:[], variants:[],
-- product_media:[], documents:[], sections:[], section_products:[], banners:[],
-- navigation:[], settings:null|{}, mappings:[]}. Foreign keys are UUIDs, and
-- media rows must correspond to verified import_batch_media rows.
create or replace function public.apply_staged_cms_import(p_batch_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public, auth
as $$
declare
  payload jsonb;
  batch_fingerprint text;
  existing_status text;
  batch_owner_user_id uuid;
  imported_count integer := 0;
begin
  if not public.is_owner() then raise exception 'active owner required' using errcode = '42501'; end if;
  select b.status, b.source_fingerprint, b.owner_user_id, p.payload into existing_status, batch_fingerprint, batch_owner_user_id, payload
  from public.import_batches b join public.import_batch_payloads p on p.batch_id = b.id
  where b.id = p_batch_id for update;
  if existing_status is null then raise exception 'staged import batch not found' using errcode = 'P0002'; end if;
  if batch_owner_user_id is distinct from auth.uid() then
    raise exception 'only the owner who reserved this import batch may apply it' using errcode = '42501';
  end if;
  if existing_status = 'completed' then return jsonb_build_object('status', 'completed', 'idempotent', true); end if;
  if existing_status not in ('staged', 'media_uploaded', 'failed') then raise exception 'batch cannot apply from status %', existing_status using errcode = '55000'; end if;
  if exists (select 1 from public.import_batch_media where batch_id = p_batch_id and upload_status <> 'verified') then
    raise exception 'all planned media must be verified before apply' using errcode = '23514';
  end if;
  if jsonb_typeof(payload->'categories') <> 'array' or jsonb_typeof(payload->'products') <> 'array'
     or jsonb_typeof(payload->'translations') <> 'array' or jsonb_typeof(payload->'mappings') <> 'array' then
    raise exception 'normalized payload is incomplete' using errcode = '22023';
  end if;
  -- A verified upload status alone is not sufficient: every payload media row
  -- must match the exact verified bucket/path/checksum/size plan. This blocks
  -- a caller from substituting an arbitrary private object after preflight.
  if jsonb_array_length(coalesce(payload->'media_assets', '[]'::jsonb)) <> (
    select count(*)
    from jsonb_to_recordset(coalesce(payload->'media_assets', '[]'::jsonb)) as x(id uuid, legacy_id text, storage_bucket text, storage_path text, sha256 text, byte_size bigint)
    join public.import_batch_media m on m.batch_id = p_batch_id
      and m.media_asset_id = x.id
      and m.legacy_media_id = x.legacy_id
      and m.storage_bucket = x.storage_bucket
      and m.storage_path = x.storage_path
      and m.sha256 = lower(x.sha256)
      and m.byte_size = x.byte_size
      and m.upload_status = 'verified'
  ) then
    raise exception 'payload media does not exactly match verified batch media' using errcode = '23514';
  end if;
  perform pg_advisory_xact_lock(hashtext('kdeals-cms-import:' || batch_fingerprint));
  update public.import_batches set status = 'applying', last_error = null where id = p_batch_id;
  insert into public.import_batch_events (batch_id, event_type, detail, actor_user_id)
  values (p_batch_id, 'apply_started', '{}'::jsonb, auth.uid());

  begin
    -- Every media asset is tied to a verified private object in this batch.
    insert into public.media_assets (id, legacy_media_id, storage_bucket, storage_path, kind, mime_type, byte_size, original_filename, alt_text, created_by)
    select x.id, x.legacy_id, x.storage_bucket, x.storage_path, x.kind::public.media_kind, x.mime_type, x.byte_size, x.original_filename, coalesce(x.alt_text, ''), auth.uid()
    from jsonb_to_recordset(coalesce(payload->'media_assets', '[]'::jsonb)) as x(id uuid, legacy_id text, storage_bucket text, storage_path text, kind text, mime_type text, byte_size bigint, original_filename text, alt_text text, sha256 text)
    join public.import_batch_media m on m.batch_id = p_batch_id and m.media_asset_id = x.id and m.legacy_media_id = x.legacy_id and m.storage_bucket = x.storage_bucket and m.storage_path = x.storage_path and m.sha256 = lower(x.sha256) and m.byte_size = x.byte_size and m.upload_status = 'verified';

    -- Parent links are applied after base categories so order in the export is irrelevant.
    insert into public.categories (id, legacy_id, slug, title_en, title_ar, description_en, description_ar, image_asset_id, enabled, show_on_homepage, show_in_navigation, display_order, nav_label_en, nav_label_ar, nav_destination)
    select x.id, x.legacy_id, x.slug, x.title_en, x.title_ar, coalesce(x.description_en, ''), coalesce(x.description_ar, ''), x.image_asset_id, coalesce(x.enabled, true), coalesce(x.show_on_homepage, false), coalesce(x.show_in_navigation, false), coalesce(x.display_order, 0), x.nav_label_en, x.nav_label_ar, x.nav_destination
    from jsonb_to_recordset(payload->'categories') as x(id uuid, legacy_id text, slug text, title_en text, title_ar text, description_en text, description_ar text, image_asset_id uuid, enabled boolean, show_on_homepage boolean, show_in_navigation boolean, display_order integer, nav_label_en text, nav_label_ar text, nav_destination text);
    update public.categories c set parent_id = x.parent_id
    from jsonb_to_recordset(payload->'categories') as x(id uuid, parent_id uuid)
    where c.id = x.id and x.parent_id is not null;

    -- Force draft: publication is a separate owner-reviewed action after reconciliation.
    insert into public.products (id, legacy_id, category_id, slug, sku, status, price, original_price, discount_percent, stock, featured, bestseller, trending, new_arrival, flash_sale, display_order)
    select x.id, x.legacy_id, x.category_id, x.slug, x.sku, 'draft'::public.product_status, x.price, x.original_price, coalesce(x.discount_percent, 0), x.stock, coalesce(x.featured, false), coalesce(x.bestseller, false), coalesce(x.trending, false), coalesce(x.new_arrival, false), coalesce(x.flash_sale, false), coalesce(x.display_order, 0)
    from jsonb_to_recordset(payload->'products') as x(id uuid, legacy_id text, category_id uuid, slug text, sku text, price numeric, original_price numeric, discount_percent numeric, stock integer, featured boolean, bestseller boolean, trending boolean, new_arrival boolean, flash_sale boolean, display_order integer);
    insert into public.product_translations (product_id, locale, name, description, badge_label)
    select x.product_id, x.locale, x.name, coalesce(x.description, ''), x.badge_label
    from jsonb_to_recordset(payload->'translations') as x(product_id uuid, locale text, name text, description text, badge_label text);
    insert into public.product_variants (id, product_id, legacy_variant_id, sku, name_en, name_ar, attributes, price_adjustment, stock, enabled, display_order, image_asset_id)
    select x.id, x.product_id, x.legacy_variant_id, x.sku, coalesce(x.name_en, ''), coalesce(x.name_ar, ''), coalesce(x.attributes, '{}'::jsonb), coalesce(x.price_adjustment, 0), x.stock, coalesce(x.enabled, true), coalesce(x.display_order, 0), x.image_asset_id
    from jsonb_to_recordset(coalesce(payload->'variants', '[]'::jsonb)) as x(id uuid, product_id uuid, legacy_variant_id text, sku text, name_en text, name_ar text, attributes jsonb, price_adjustment numeric, stock integer, enabled boolean, display_order integer, image_asset_id uuid);
    insert into public.product_media (product_id, media_asset_id, display_order, is_primary, alt_text)
    select x.product_id, x.media_asset_id, coalesce(x.display_order, 0), coalesce(x.is_primary, false), coalesce(x.alt_text, '')
    from jsonb_to_recordset(coalesce(payload->'product_media', '[]'::jsonb)) as x(product_id uuid, media_asset_id uuid, display_order integer, is_primary boolean, alt_text text);
    insert into public.product_documents (id, product_id, media_asset_id, label_en, label_ar, display_order)
    select x.id, x.product_id, x.media_asset_id, x.label_en, x.label_ar, coalesce(x.display_order, 0)
    from jsonb_to_recordset(coalesce(payload->'documents', '[]'::jsonb)) as x(id uuid, product_id uuid, media_asset_id uuid, label_en text, label_ar text, display_order integer);
    insert into public.homepage_sections (id, section_key, enabled, display_order, title_en, title_ar, subtitle_en, subtitle_ar, max_products, theme)
    select x.id, x.section_key, coalesce(x.enabled, true), coalesce(x.display_order, 0), coalesce(x.title_en, ''), coalesce(x.title_ar, ''), coalesce(x.subtitle_en, ''), coalesce(x.subtitle_ar, ''), x.max_products, x.theme::public.homepage_theme
    from jsonb_to_recordset(coalesce(payload->'sections', '[]'::jsonb)) as x(id uuid, section_key text, enabled boolean, display_order integer, title_en text, title_ar text, subtitle_en text, subtitle_ar text, max_products integer, theme text);
    insert into public.homepage_section_products (section_id, product_id, display_order)
    select x.section_id, x.product_id, coalesce(x.display_order, 0)
    from jsonb_to_recordset(coalesce(payload->'section_products', '[]'::jsonb)) as x(section_id uuid, product_id uuid, display_order integer);
    insert into public.banners (id, legacy_id, title_en, title_ar, subtitle_en, subtitle_ar, cta_label_en, cta_label_ar, destination, desktop_image_asset_id, mobile_image_asset_id, enabled, display_order, starts_at, ends_at)
    select x.id, x.legacy_id, coalesce(x.title_en, ''), coalesce(x.title_ar, ''), coalesce(x.subtitle_en, ''), coalesce(x.subtitle_ar, ''), coalesce(x.cta_label_en, ''), coalesce(x.cta_label_ar, ''), x.destination, x.desktop_image_asset_id, x.mobile_image_asset_id, coalesce(x.enabled, true), coalesce(x.display_order, 0), x.starts_at, x.ends_at
    from jsonb_to_recordset(coalesce(payload->'banners', '[]'::jsonb)) as x(id uuid, legacy_id text, title_en text, title_ar text, subtitle_en text, subtitle_ar text, cta_label_en text, cta_label_ar text, destination text, desktop_image_asset_id uuid, mobile_image_asset_id uuid, enabled boolean, display_order integer, starts_at timestamptz, ends_at timestamptz);
    insert into public.navigation_entries (id, category_id, label_en, label_ar, destination, enabled, display_order)
    select x.id, x.category_id, x.label_en, x.label_ar, x.destination, coalesce(x.enabled, true), coalesce(x.display_order, 0)
    from jsonb_to_recordset(coalesce(payload->'navigation', '[]'::jsonb)) as x(id uuid, category_id uuid, label_en text, label_ar text, destination text, enabled boolean, display_order integer);
    if jsonb_typeof(payload->'settings') = 'object' then
      insert into public.store_settings (singleton, display_name, contact_phone, contact_email, whatsapp_number, delivery_info, delivery_message_en, delivery_message_ar, announcement_en, announcement_ar, announcement_visible, free_delivery_threshold)
      select true, coalesce(x.display_name, 'K DEALS'), coalesce(x.contact_phone, ''), coalesce(x.contact_email, ''), coalesce(x.whatsapp_number, ''), coalesce(x.delivery_info, ''), coalesce(x.delivery_message_en, ''), coalesce(x.delivery_message_ar, ''), coalesce(x.announcement_en, ''), coalesce(x.announcement_ar, ''), coalesce(x.announcement_visible, true), x.free_delivery_threshold
      from jsonb_to_record(payload->'settings') as x(display_name text, contact_phone text, contact_email text, whatsapp_number text, delivery_info text, delivery_message_en text, delivery_message_ar text, announcement_en text, announcement_ar text, announcement_visible boolean, free_delivery_threshold numeric);
    end if;
    insert into public.legacy_id_map (entity_type, legacy_id, entity_id, source_fingerprint)
    select x.entity_type, x.legacy_id, x.entity_id, source_fingerprint
    from jsonb_to_recordset(payload->'mappings') as x(entity_type text, legacy_id text, entity_id uuid);
    select count(*) into imported_count from public.legacy_id_map where source_fingerprint = batch_fingerprint;
    update public.import_batches set status = 'reconciling', records_imported = imported_count where id = p_batch_id;
    insert into public.import_batch_events (batch_id, event_type, detail, actor_user_id)
    values (p_batch_id, 'reconciled', jsonb_build_object('records_imported', imported_count, 'publication', 'draft_only'), auth.uid());
  exception when others then
    update public.import_batches set status = 'failed', last_error = left(sqlerrm, 1000) where id = p_batch_id;
    insert into public.import_batch_events (batch_id, event_type, detail, actor_user_id)
    values (p_batch_id, 'apply_failed', jsonb_build_object('sqlstate', sqlstate, 'message', left(sqlerrm, 1000)), auth.uid());
    return jsonb_build_object('status', 'failed', 'sqlstate', sqlstate);
  end;
  return jsonb_build_object('status', 'reconciling', 'records_imported', imported_count, 'published', false);
end;
$$;

-- Reconciliation is an explicit owner review step: it must not publish the
-- draft products created above. Finalizing records the reviewed, immutable
-- batch state so a replay can return the idempotent completed result instead
-- of attempting another apply.
create or replace function public.finalize_staged_cms_import(p_batch_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public, auth
as $$
declare
  current_status text;
  batch_owner_user_id uuid;
  mapped_records integer;
begin
  if not public.is_owner() then
    raise exception 'active owner required' using errcode = '42501';
  end if;

  select status, owner_user_id
    into current_status, batch_owner_user_id
  from public.import_batches
  where id = p_batch_id
  for update;

  if current_status is null then
    raise exception 'import batch not found' using errcode = 'P0002';
  end if;
  if batch_owner_user_id is distinct from auth.uid() then
    raise exception 'only the owner who reserved this import batch may finalize it' using errcode = '42501';
  end if;
  if current_status = 'completed' then
    return jsonb_build_object('status', 'completed', 'idempotent', true);
  end if;
  if current_status <> 'reconciling' then
    raise exception 'batch cannot be finalized from status %', current_status using errcode = '55000';
  end if;

  select count(*) into mapped_records
  from public.legacy_id_map
  where source_fingerprint = (
    select source_fingerprint from public.import_batches where id = p_batch_id
  );

  update public.import_batches
  set status = 'completed', records_imported = mapped_records, completed_at = now(), last_error = null
  where id = p_batch_id;
  insert into public.import_batch_events (batch_id, event_type, detail, actor_user_id)
  values (p_batch_id, 'completed', jsonb_build_object('records_imported', mapped_records, 'published', false), auth.uid());

  return jsonb_build_object('status', 'completed', 'records_imported', mapped_records, 'published', false);
end;
$$;

revoke all on function public.stage_cms_import_payload(uuid, jsonb, text) from public, anon, authenticated;
grant execute on function public.stage_cms_import_payload(uuid, jsonb, text) to authenticated;
revoke all on function public.apply_staged_cms_import(uuid) from public, anon, authenticated;
grant execute on function public.apply_staged_cms_import(uuid) to authenticated;
revoke all on function public.finalize_staged_cms_import(uuid) from public, anon, authenticated;
grant execute on function public.finalize_staged_cms_import(uuid) to authenticated;
