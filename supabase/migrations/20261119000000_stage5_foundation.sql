-- K DEALS Stage 5 Part A: PostgreSQL foundation.
-- This migration is intentionally additive. It does not read or delete browser-local
-- Stage 4 data and it does not connect the current storefront to Supabase.

create extension if not exists pgcrypto;

create type public.admin_role as enum ('owner', 'admin', 'editor');
create type public.product_status as enum ('draft', 'published', 'archived');
create type public.media_kind as enum ('image', 'document');
create type public.homepage_theme as enum ('default', 'purple', 'orange', 'yellow');

create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role public.admin_role not null default 'editor',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Used only for RLS and server-side authorization. It deliberately accepts no
-- client-provided role and exposes no role-management write policy.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
      and active
      and role in ('owner', 'admin', 'editor')
  );
$$;

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  legacy_media_id text unique,
  storage_bucket text not null,
  storage_path text not null,
  kind public.media_kind not null,
  mime_type text not null,
  byte_size bigint not null check (byte_size > 0),
  original_filename text not null,
  alt_text text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (storage_bucket, storage_path),
  check (
    (kind = 'image' and mime_type in ('image/jpeg', 'image/png', 'image/webp'))
    or (kind = 'document' and mime_type = 'application/pdf')
  )
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  parent_id uuid references public.categories(id) on delete restrict,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title_en text not null check (length(trim(title_en)) > 0),
  title_ar text not null check (length(trim(title_ar)) > 0),
  description_en text not null default '',
  description_ar text not null default '',
  image_asset_id uuid references public.media_assets(id) on delete set null,
  enabled boolean not null default true,
  show_on_homepage boolean not null default false,
  show_in_navigation boolean not null default false,
  display_order integer not null default 0,
  nav_label_en text,
  nav_label_ar text,
  nav_destination text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (nav_destination is null or (nav_destination like '/%' and nav_destination not like '//%'))
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  category_id uuid references public.categories(id) on delete restrict,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  sku text unique,
  status public.product_status not null default 'draft',
  price numeric(10,3) not null check (price >= 0),
  original_price numeric(10,3) check (original_price is null or original_price >= price),
  discount_percent numeric(5,2) not null default 0 check (discount_percent between 0 and 100),
  stock integer not null default 0 check (stock >= 0),
  featured boolean not null default false,
  bestseller boolean not null default false,
  trending boolean not null default false,
  new_arrival boolean not null default false,
  flash_sale boolean not null default false,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_translations (
  product_id uuid not null references public.products(id) on delete cascade,
  locale text not null check (locale in ('en', 'ar')),
  name text not null check (length(trim(name)) > 0),
  description text not null default '',
  badge_label text,
  primary key (product_id, locale)
);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  legacy_variant_id text,
  sku text unique,
  name_en text not null default '',
  name_ar text not null default '',
  attributes jsonb not null default '{}'::jsonb check (jsonb_typeof(attributes) = 'object'),
  price_adjustment numeric(10,3) not null default 0,
  stock integer not null default 0 check (stock >= 0),
  enabled boolean not null default true,
  display_order integer not null default 0,
  image_asset_id uuid references public.media_assets(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, legacy_variant_id)
);

create table public.product_media (
  product_id uuid not null references public.products(id) on delete cascade,
  media_asset_id uuid not null references public.media_assets(id) on delete restrict,
  display_order integer not null default 0,
  is_primary boolean not null default false,
  alt_text text not null default '',
  primary key (product_id, media_asset_id)
);
create unique index product_media_one_primary_image
  on public.product_media (product_id) where is_primary;

create table public.product_documents (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  media_asset_id uuid not null unique references public.media_assets(id) on delete restrict,
  label_en text not null check (length(trim(label_en)) > 0),
  label_ar text not null check (length(trim(label_ar)) > 0),
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.homepage_sections (
  id uuid primary key default gen_random_uuid(),
  section_key text not null unique check (section_key in ('categories', 'flash-sale', 'best-sellers', 'trending', 'new-arrivals', 'electronics', 'promotions')),
  enabled boolean not null default true,
  display_order integer not null default 0,
  title_en text not null default '',
  title_ar text not null default '',
  subtitle_en text not null default '',
  subtitle_ar text not null default '',
  max_products integer check (max_products is null or max_products between 1 and 100),
  theme public.homepage_theme not null default 'default',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.homepage_section_products (
  section_id uuid not null references public.homepage_sections(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  display_order integer not null default 0,
  primary key (section_id, product_id)
);

create table public.banners (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  title_en text not null default '',
  title_ar text not null default '',
  subtitle_en text not null default '',
  subtitle_ar text not null default '',
  cta_label_en text not null default '',
  cta_label_ar text not null default '',
  destination text not null check (destination like '/%' and destination not like '//%'),
  desktop_image_asset_id uuid references public.media_assets(id) on delete set null,
  mobile_image_asset_id uuid references public.media_assets(id) on delete set null,
  enabled boolean not null default true,
  display_order integer not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create table public.navigation_entries (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  label_en text not null check (length(trim(label_en)) > 0),
  label_ar text not null check (length(trim(label_ar)) > 0),
  destination text not null check (destination like '/%' and destination not like '//%'),
  enabled boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.store_settings (
  singleton boolean primary key default true check (singleton),
  display_name text not null default 'K DEALS',
  contact_phone text not null default '',
  contact_email text not null default '',
  whatsapp_number text not null default '',
  delivery_info text not null default '',
  delivery_message_en text not null default '',
  delivery_message_ar text not null default '',
  announcement_en text not null default '',
  announcement_ar text not null default '',
  announcement_visible boolean not null default true,
  free_delivery_threshold numeric(10,3) check (free_delivery_threshold is null or free_delivery_threshold >= 0),
  updated_at timestamptz not null default now()
);

-- Idempotent browser-data import bookkeeping. The UUID here is the durable
-- mapping from the Stage 4 local ID/media:<id> reference to its database row.
create table public.legacy_id_map (
  entity_type text not null check (entity_type in ('product', 'category', 'variant', 'banner', 'media', 'homepage_section', 'navigation_entry')),
  legacy_id text not null,
  entity_id uuid not null,
  source_fingerprint text not null,
  imported_at timestamptz not null default now(),
  primary key (entity_type, legacy_id),
  unique (entity_type, entity_id)
);

create table public.import_batches (
  id uuid primary key default gen_random_uuid(),
  source_name text not null,
  source_fingerprint text not null unique,
  status text not null check (status in ('started', 'validated', 'completed', 'failed', 'rolled_back')),
  records_imported integer not null default 0 check (records_imported >= 0),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index categories_parent_order_idx on public.categories (parent_id, display_order);
create index categories_public_idx on public.categories (enabled, show_on_homepage, display_order);
create index products_storefront_idx on public.products (status, category_id, display_order);
create index products_merchandising_idx on public.products (status, featured, bestseller, trending, new_arrival, flash_sale, display_order);
create index product_variants_product_idx on public.product_variants (product_id, enabled, display_order);
create index product_media_product_idx on public.product_media (product_id, display_order);
create index homepage_sections_public_idx on public.homepage_sections (enabled, display_order);
create index homepage_section_products_order_idx on public.homepage_section_products (section_id, display_order);
create index banners_public_idx on public.banners (enabled, display_order, starts_at, ends_at);
create index navigation_entries_public_idx on public.navigation_entries (enabled, display_order);

-- Timestamp maintenance stays database-side, independent of future route handlers.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$ begin new.updated_at = now(); return new; end; $$;

create trigger admin_users_set_updated_at before update on public.admin_users for each row execute function public.set_updated_at();
create trigger media_assets_set_updated_at before update on public.media_assets for each row execute function public.set_updated_at();
create trigger categories_set_updated_at before update on public.categories for each row execute function public.set_updated_at();
create trigger products_set_updated_at before update on public.products for each row execute function public.set_updated_at();
create trigger product_variants_set_updated_at before update on public.product_variants for each row execute function public.set_updated_at();
create trigger homepage_sections_set_updated_at before update on public.homepage_sections for each row execute function public.set_updated_at();
create trigger banners_set_updated_at before update on public.banners for each row execute function public.set_updated_at();
create trigger navigation_entries_set_updated_at before update on public.navigation_entries for each row execute function public.set_updated_at();
create trigger store_settings_set_updated_at before update on public.store_settings for each row execute function public.set_updated_at();

alter table public.admin_users enable row level security;
alter table public.media_assets enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_translations enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_media enable row level security;
alter table public.product_documents enable row level security;
alter table public.homepage_sections enable row level security;
alter table public.homepage_section_products enable row level security;
alter table public.banners enable row level security;
alter table public.navigation_entries enable row level security;
alter table public.store_settings enable row level security;
alter table public.legacy_id_map enable row level security;
alter table public.import_batches enable row level security;

-- Public policies expose only published storefront data. Admin policies below
-- enforce authorization in the database rather than trusting a browser role.
create policy categories_public_read on public.categories for select using (enabled);
create policy products_public_read on public.products for select using (status = 'published');
create policy product_translations_public_read on public.product_translations for select using (
  exists (select 1 from public.products p where p.id = product_id and p.status = 'published')
);
create policy product_variants_public_read on public.product_variants for select using (
  enabled and exists (select 1 from public.products p where p.id = product_id and p.status = 'published')
);
create policy product_media_public_read on public.product_media for select using (
  exists (select 1 from public.products p where p.id = product_id and p.status = 'published')
);
create policy product_documents_public_read on public.product_documents for select using (
  exists (select 1 from public.products p where p.id = product_id and p.status = 'published')
);
create policy homepage_sections_public_read on public.homepage_sections for select using (enabled);
create policy homepage_section_products_public_read on public.homepage_section_products for select using (
  exists (select 1 from public.homepage_sections s where s.id = section_id and s.enabled)
  and exists (select 1 from public.products p where p.id = product_id and p.status = 'published')
);
create policy banners_public_read on public.banners for select using (
  enabled and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now())
);
create policy navigation_entries_public_read on public.navigation_entries for select using (enabled);
create policy store_settings_public_read on public.store_settings for select using (true);

-- Media metadata is available only to administrators. Storefront delivery uses
-- future server-generated DTOs/signed URLs; storage objects remain private.
create policy media_assets_admin_all on public.media_assets for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy admin_users_self_read on public.admin_users for select to authenticated using (user_id = auth.uid());

-- Only a SQL-editor/service workflow can bootstrap or change administrator
-- membership. There is intentionally no INSERT/UPDATE/DELETE policy here.
create policy categories_admin_all on public.categories for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy products_admin_all on public.products for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy product_translations_admin_all on public.product_translations for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy product_variants_admin_all on public.product_variants for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy product_media_admin_all on public.product_media for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy product_documents_admin_all on public.product_documents for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy homepage_sections_admin_all on public.homepage_sections for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy homepage_section_products_admin_all on public.homepage_section_products for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy banners_admin_all on public.banners for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy navigation_entries_admin_all on public.navigation_entries for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy store_settings_admin_all on public.store_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy legacy_id_map_admin_all on public.legacy_id_map for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy import_batches_admin_all on public.import_batches for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant execute on function public.is_admin() to authenticated;
