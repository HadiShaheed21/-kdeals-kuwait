# Stage 6 atomic CMS apply — staging-only procedure

Target: `ncjtivoghlbbqlkfxrzs` (K DEALS STAGING). Do not use this procedure
against `lxqwlxnysrsryprqnbxq` or any production project.

## Preconditions

1. The four prior migrations are present remotely:
   - `20261119000000_stage5_foundation`
   - `20261119000001_stage5_storage`
   - `20261119000002_stage5_cms_security_hardening`
   - `20261120000000_stage6_import_executor_foundation`
2. An active staging owner exists in `public.admin_users`.
3. The linked project is verified as `ncjtivoghlbbqlkfxrzs`.
4. The working tree and portable export have been reviewed.

## Review command

```bash
supabase migration list --linked
```

Expected: the first four migrations are remote, while
`20261120000001_stage6_atomic_cms_apply.sql` is local only.

## Approved staging application command

Run only after explicit staging approval:

```bash
supabase db push --linked
```

Expected: exactly `20261120000001_stage6_atomic_cms_apply.sql` is applied.
If the CLI shows any other pending migration or a project reference other than
`ncjtivoghlbbqlkfxrzs`, stop without confirming.

## Post-apply checks

1. Sign in as the active owner in staging.
2. Set `KDEALS_IMPORT_EXECUTION=staging` only in the staging application
   environment, never production.
3. Use `/admin/supabase-import` with a reviewed export.
4. Confirm products import as `draft`, media checksums verify, and the batch
   reaches `reconciling`.
5. Re-run with the same fingerprint and confirm the reserved batch is reused
   rather than duplicated.
6. Leave `KDEALS_STOREFRONT_DATA_SOURCE=local` until reconciliation and
   storefront testing are complete.
