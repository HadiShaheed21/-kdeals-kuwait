# K DEALS — Stage 5 Part A: Supabase foundation

## Scope

This is an additive database and security foundation only. The customer storefront, the existing Stage 4 local repository, IndexedDB media, local cart/wishlist, WhatsApp checkout, and admin UI are intentionally not connected to Supabase in Part A.

## Current compatibility inventory

| Existing persistence | Current key / identifier | Part A compatibility plan |
| --- | --- | --- |
| CMS | `localStorage["kdeals_admin_store_v1"]`, schema version 2 | Export unchanged; import with `legacy_id_map` and source fingerprint. |
| Product/category IDs | short local IDs such as `p1`, `mobiles` | Retain in `products.legacy_id` / `categories.legacy_id`; database IDs are UUIDs. |
| Product variants | local `AdminVariant.id` | Retain as `product_variants.legacy_variant_id`. |
| Uploaded media | IndexedDB `kdeals_stage4_media`, `media:<uuid>` references | Upload after explicit export; retain legacy media IDs in `media_assets.legacy_media_id`. |
| Cart | `localStorage["kdeals_cart"]`, product + variant line identity | Remains device-local in Part A. A later migration resolves legacy IDs through `legacy_id_map`; no customer selections are erased. |
| Wishlist | `localStorage["kdeals_wishlist"]`, product IDs | Remains device-local in Part A and maps only in a later opt-in user-data migration. |
| Checkout | WhatsApp message generated client-side | No orders/customer address data is persisted in this schema in Part A. |

## Entity relationships

```text
auth.users 1 ── 0..1 admin_users

categories 1 ── * products 1 ── * product_translations
categories 1 ── * categories (parent_id)
products   1 ── * product_variants
products   * ── * media_assets (product_media; one primary image per product)
products   1 ── * product_documents ── 1 media_assets

homepage_sections * ── * products (homepage_section_products)
categories 0..1 ── * navigation_entries
media_assets 0..1 ── * categories / variants / banners
banners use independent desktop and mobile media assets
store_settings is a checked singleton
legacy_id_map ties a Stage 4 local identity to its imported UUID
```

All KWD money values use `numeric(10,3)`. Product and category deletion is intentionally restricted while dependent records exist. Product images are ordered, and a partial unique index enforces at most one primary image per product.

## Authorization and RLS design

- `public.is_admin()` is a security-definer predicate backed by `admin_users` and `auth.uid()`. It never receives a client role value.
- Public policies expose only enabled categories, published products, enabled variants, enabled homepage/nav records, currently active banners, and non-sensitive store contact/announcement data.
- All CMS mutations require an authenticated user for whom `public.is_admin()` is true. There are no public write policies.
- `admin_users` has only an authenticated self-read policy. It has no client-side insert/update/delete policy.
- Future Next.js database access belongs in a server-only data access layer that returns minimal public DTOs. `SUPABASE_SERVICE_ROLE_KEY` may only be used in server code for carefully audited administration/import paths; it must never be prefixed `NEXT_PUBLIC_`.

### First-admin provisioning

Part A intentionally does not implement login. After a trusted operator has created the first Supabase Auth user through the future approved admin-auth flow, a project owner runs the following **once** in the Supabase SQL Editor (substitute the exact Auth UUID after independently verifying it):

```sql
insert into public.admin_users (user_id, role, active)
values ('AUTH_USER_UUID', 'owner', true);
```

This avoids hardcoded passwords and avoids a public endpoint that could self-promote arbitrary accounts. Additional roles should be changed only by an owner-only server action added in a later, separately reviewed part.

## Storage design

The migration creates private `product-images`, `product-documents`, and `site-banners` buckets. All browser reads are denied by default; the later storefront integration will serve only public, approved assets through server-generated signed URLs or narrow public DTOs.

| Bucket | Allowed MIME types | Maximum | Naming rule |
| --- | --- | ---: | --- |
| `product-images` | JPEG, PNG, WebP | 8 MiB | `{product-uuid}/{asset-uuid}.{ext}` |
| `product-documents` | PDF | 15 MiB | `{product-uuid}/{asset-uuid}.pdf` |
| `site-banners` | JPEG, PNG, WebP | 8 MiB | `{banner-uuid}/{asset-uuid}.{ext}` |

Original filenames are metadata only and never form object paths. RLS allows only database-authorized admins to upload/read/update. Deletion is allowed only when `storage_object_is_unreferenced` confirms no product, document, category, variant, or banner references the asset. The future upload handler must additionally inspect file signatures, generate the UUID paths, reject SVG (until a reviewed sanitizer is introduced), and create the asset row plus references transactionally.

## Non-destructive migration runbook

1. **Backup first.** In the original browser profile, export the raw `kdeals_admin_store_v1` localStorage value and all IndexedDB `kdeals_stage4_media/media` records (including blobs) to an encrypted local archive. Record a SHA-256 manifest; do not call repository reset or clear browser storage.
2. **Validate offline.** Check local IDs, slug uniqueness, KWD values, category references, `media:<id>` references, MIME type/signature, file size, and required English/Arabic content. Produce a reject report; do not partially import invalid entities.
3. **Dry run.** Begin an `import_batches` row with the archive fingerprint; map every supported legacy ID to deterministic new UUIDs in memory. Verify product/category/variant/media references and count totals before writes.
4. **Transactional import.** Upload validated blobs to private storage, insert `media_assets`, then categories, products/translations/variants, gallery/doc links, banners, homepage sections/manual selections, navigation, and settings. Insert `legacy_id_map` rows in the same transaction for database records. Upsert on `(entity_type, legacy_id)` and verify the source fingerprint so re-running the same export is idempotent rather than duplicating content.
5. **Reconcile before cutover.** Compare count and relationship reports, inspect sampled image/document signed URLs, and retain the original local browser data as the rollback source. Only a future approved Part B turns on read paths from Supabase.

### Rollback

Schema migrations are append-only and are not automatically rolled back in production. Before applying them, take a Supabase database backup. Before any import, retain the encrypted Stage 4 export. An incomplete import is marked `failed` and can be retried from the immutable archive; a completed import can be marked `rolled_back` and its batch-created rows removed only after reference checks. Existing localStorage and IndexedDB data are never overwritten by this process.

## Security review and limitations

- No credentials, Supabase CLI connection, or database URL were supplied. These migrations are authored but not applied or database-tested.
- No auth UI, server DAL, Supabase client, data import utility, or live-storefront connection exists in Part A by design.
- The schema deliberately does not store WhatsApp checkout addresses, payment details, or customer orders. If ordering moves server-side later, that needs a separate privacy and retention review.
- Private buckets prevent direct public object access. Signed URL expiry, cache rules, and server-side MIME/signature checks must be implemented before uploads are exposed.
- The safe public data surface must stay limited to storefront DTOs; never add secrets, service configuration, or privileged admin metadata to `store_settings`.
