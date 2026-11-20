-- K DEALS Stage 5 Part C, Phase 1: CMS security hardening.
--
-- This migration is additive and data-preserving. It must be reviewed against
-- the linked project before application. It does not import CMS records, write
-- Storage objects, or change any storefront-facing data.

do $$
declare
  required_table text;
begin
  foreach required_table in array array[
    'admin_users', 'media_assets', 'categories', 'products',
    'product_translations', 'product_variants', 'product_media',
    'product_documents', 'homepage_sections', 'homepage_section_products',
    'banners', 'navigation_entries', 'store_settings', 'legacy_id_map',
    'import_batches'
  ] loop
    if to_regclass('public.' || required_table) is null then
      raise exception 'Stage 5 foundation table public.% is missing; aborting security hardening.', required_table;
    end if;
  end loop;
end;
$$;

-- Keep role evaluation in the database. This function deliberately does not
-- accept a user ID or role supplied by a browser or server action.
create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, auth
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
      and active
      and role = 'owner'
  );
$$;

-- PostgreSQL grants EXECUTE to PUBLIC by default. Security-definer helpers are
-- callable only by authenticated users whose RLS policies need them.
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;
alter function public.is_admin() set search_path = pg_catalog, public, auth;

revoke execute on function public.storage_object_is_unreferenced(text, text) from public, anon;
grant execute on function public.storage_object_is_unreferenced(text, text) to authenticated;
alter function public.storage_object_is_unreferenced(text, text) set search_path = pg_catalog, public;

revoke execute on function public.is_owner() from public, anon;
grant execute on function public.is_owner() to authenticated;

-- Schema usage is required for the explicit table grants below. It does not
-- itself grant access to any table, function, or Storage object.
grant usage on schema public to anon, authenticated;

-- Reset direct and inherited table privileges before restoring the exact
-- least-privilege grants below. API roles inherit PUBLIC privileges, so a
-- PUBLIC grant is never relied upon for storefront or CMS access.
revoke all privileges on table
  public.categories,
  public.products,
  public.product_translations,
  public.product_variants,
  public.product_media,
  public.product_documents,
  public.homepage_sections,
  public.homepage_section_products,
  public.banners,
  public.navigation_entries,
  public.store_settings,
  public.media_assets,
  public.legacy_id_map,
  public.import_batches,
  public.admin_users
from public, anon, authenticated;

-- Keep the removal of DDL-adjacent privileges explicit for auditability. This
-- corrects the observed TRUNCATE/TRIGGER grants on products and media_assets.
revoke truncate, trigger, references on table
  public.categories,
  public.products,
  public.product_translations,
  public.product_variants,
  public.product_media,
  public.product_documents,
  public.homepage_sections,
  public.homepage_section_products,
  public.banners,
  public.navigation_entries,
  public.store_settings,
  public.media_assets,
  public.legacy_id_map,
  public.import_batches,
  public.admin_users
from public, anon, authenticated;

-- Public storefront records are readable through RLS only. Internal CMS
-- tables (admin_users, media_assets, import metadata) receive no anon grant.
grant select on table
  public.categories,
  public.products,
  public.product_translations,
  public.product_variants,
  public.product_media,
  public.product_documents,
  public.homepage_sections,
  public.homepage_section_products,
  public.banners,
  public.navigation_entries,
  public.store_settings
to anon, authenticated;

-- Re-grant the authorization lookup explicitly after removing inherited
-- privileges; login and protected admin layouts depend on this self-read.
grant select on table public.admin_users to authenticated;

-- Authenticated callers receive the SQL privileges needed by the CMS, but RLS
-- continues to require public.is_admin() for every CMS mutation.
grant select, insert, update, delete on table
  public.categories,
  public.products,
  public.product_translations,
  public.product_variants,
  public.product_media,
  public.product_documents,
  public.homepage_sections,
  public.homepage_section_products,
  public.banners,
  public.navigation_entries,
  public.store_settings,
  public.media_assets,
  public.legacy_id_map,
  public.import_batches
to authenticated;

-- A published product is publicly visible only while its assigned category is
-- enabled. The same rule is applied to public translations, variants, media,
-- documents, and manual homepage selections.
alter policy products_public_read on public.products
  using (
    status = 'published'
    and exists (
      select 1
      from public.categories category
      where category.id = category_id
        and category.enabled
    )
  );

alter policy product_translations_public_read on public.product_translations
  using (
    exists (
      select 1
      from public.products product
      join public.categories category on category.id = product.category_id
      where product.id = product_id
        and product.status = 'published'
        and category.enabled
    )
  );

alter policy product_variants_public_read on public.product_variants
  using (
    enabled
    and exists (
      select 1
      from public.products product
      join public.categories category on category.id = product.category_id
      where product.id = product_id
        and product.status = 'published'
        and category.enabled
    )
  );

alter policy product_media_public_read on public.product_media
  using (
    exists (
      select 1
      from public.products product
      join public.categories category on category.id = product.category_id
      where product.id = product_id
        and product.status = 'published'
        and category.enabled
    )
  );

alter policy product_documents_public_read on public.product_documents
  using (
    exists (
      select 1
      from public.products product
      join public.categories category on category.id = product.category_id
      where product.id = product_id
        and product.status = 'published'
        and category.enabled
    )
  );

alter policy homepage_section_products_public_read on public.homepage_section_products
  using (
    exists (
      select 1
      from public.homepage_sections section
      where section.id = section_id
        and section.enabled
    )
    and exists (
      select 1
      from public.products product
      join public.categories category on category.id = product.category_id
      where product.id = product_id
        and product.status = 'published'
        and category.enabled
    )
  );

-- Import bookkeeping is not ordinary CMS content. Retain the policies and
-- tighten them in place so only active owners can perform import/cutover work.
alter policy legacy_id_map_admin_all on public.legacy_id_map
  using (public.is_owner())
  with check (public.is_owner());

alter policy import_batches_admin_all on public.import_batches
  using (public.is_owner())
  with check (public.is_owner());

-- Storage buckets and their existing policies remain private/admin-only. No
-- public SELECT policy is introduced for storage.objects; storefront media must
-- continue to be delivered by future server-generated signed URLs.
