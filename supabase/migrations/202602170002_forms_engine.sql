update public.org_custom_roles custom_role
set
  permissions = (
    select array_agg(distinct permission order by permission)
    from unnest(coalesce(custom_role.permissions, '{}'::text[]) || array['forms.read', 'forms.write']::text[]) as permission
  ),
  updated_at = now()
where custom_role.role_key = 'manager';

create or replace function public.has_org_permission(target_org_id uuid, required_permission text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with membership as (
    select membership.role
    from public.org_memberships membership
    where membership.org_id = target_org_id
      and membership.user_id = auth.uid()
    limit 1
  ),
  role_permissions as (
    select
      case membership.role
        when 'admin' then array[
          'org.dashboard.read',
          'org.manage.read',
          'org.branding.read',
          'org.branding.write',
          'org.pages.read',
          'org.pages.write',
          'announcements.read',
          'announcements.write',
          'forms.read',
          'forms.write',
          'sponsors.read',
          'sponsors.write'
        ]::text[]
        when 'member' then array[
          'org.dashboard.read',
          'org.branding.read',
          'sponsors.read'
        ]::text[]
        else coalesce(
          (
            select custom_role.permissions
            from public.org_custom_roles custom_role
            where custom_role.org_id = target_org_id
              and custom_role.role_key = membership.role
            limit 1
          ),
          array[]::text[]
        )
      end as permissions
    from membership
  )
  select exists (
    select 1
    from role_permissions
    where required_permission = any(role_permissions.permissions)
  );
$$;

create or replace function public.has_org_role(target_org_id uuid, minimum_role text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case minimum_role
    when 'member' then public.has_org_permission(target_org_id, 'org.dashboard.read')
    when 'admin' then public.has_org_permission(target_org_id, 'org.manage.read')
    when 'manager' then (
      public.has_org_permission(target_org_id, 'org.manage.read')
      or public.has_org_permission(target_org_id, 'org.pages.write')
      or public.has_org_permission(target_org_id, 'announcements.write')
      or public.has_org_permission(target_org_id, 'forms.write')
      or public.has_org_permission(target_org_id, 'sponsors.write')
    )
    else false
  end;
$$;

create table if not exists public.form_definitions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  slug text not null,
  name text not null,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  schema_json jsonb not null default '{}'::jsonb,
  ui_json jsonb not null default '{}'::jsonb,
  theme_json jsonb not null default '{}'::jsonb,
  behavior_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, slug)
);

create table if not exists public.form_versions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  form_id uuid not null references public.form_definitions(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  snapshot_json jsonb not null,
  published_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (form_id, version_number)
);

create table if not exists public.form_submissions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  form_id uuid not null references public.form_definitions(id) on delete cascade,
  version_id uuid not null references public.form_versions(id) on delete restrict,
  answers_json jsonb not null default '{}'::jsonb,
  metadata_json jsonb not null default '{}'::jsonb,
  status text not null default 'submitted' check (status in ('submitted', 'reviewed', 'archived')),
  created_at timestamptz not null default now()
);

create table if not exists public.sponsor_profiles (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  name text not null,
  logo_asset_id text,
  website_url text,
  tier text,
  status text not null default 'draft' check (status in ('draft', 'pending', 'approved', 'published')),
  submission_id uuid references public.form_submissions(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  detail_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.form_submission_attempts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  form_id uuid not null references public.form_definitions(id) on delete cascade,
  ip_hash text not null,
  created_at timestamptz not null default now()
);

create index if not exists form_definitions_org_status_idx on public.form_definitions (org_id, status, updated_at desc);
create index if not exists form_versions_form_published_idx on public.form_versions (form_id, published_at desc);
create index if not exists form_versions_org_form_idx on public.form_versions (org_id, form_id);
create index if not exists form_submissions_org_form_created_idx on public.form_submissions (org_id, form_id, created_at desc);
create index if not exists form_submissions_org_status_created_idx on public.form_submissions (org_id, status, created_at desc);
create index if not exists form_submissions_version_idx on public.form_submissions (version_id);
create index if not exists sponsor_profiles_org_status_updated_idx on public.sponsor_profiles (org_id, status, updated_at desc);
create unique index if not exists sponsor_profiles_submission_unique_idx on public.sponsor_profiles (submission_id) where submission_id is not null;
create index if not exists audit_logs_org_created_idx on public.audit_logs (org_id, created_at desc);
create index if not exists audit_logs_org_entity_idx on public.audit_logs (org_id, entity_type, entity_id);
create index if not exists form_submission_attempts_rate_idx on public.form_submission_attempts (org_id, form_id, ip_hash, created_at desc);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'form-assets',
  'form-assets',
  false,
  10485760,
  array[
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/svg+xml',
    'application/pdf',
    'text/plain',
    'text/csv',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do nothing;

drop trigger if exists form_definitions_set_updated_at on public.form_definitions;
create trigger form_definitions_set_updated_at before update on public.form_definitions for each row execute procedure public.set_updated_at();

drop trigger if exists sponsor_profiles_set_updated_at on public.sponsor_profiles;
create trigger sponsor_profiles_set_updated_at before update on public.sponsor_profiles for each row execute procedure public.set_updated_at();

alter table public.form_definitions enable row level security;
alter table public.form_versions enable row level security;
alter table public.form_submissions enable row level security;
alter table public.sponsor_profiles enable row level security;
alter table public.audit_logs enable row level security;
alter table public.form_submission_attempts enable row level security;

drop policy if exists form_definitions_public_or_forms_read on public.form_definitions;
create policy form_definitions_public_or_forms_read on public.form_definitions
  for select
  using (status = 'published' or public.has_org_permission(org_id, 'forms.read'));

drop policy if exists form_definitions_forms_write_insert on public.form_definitions;
create policy form_definitions_forms_write_insert on public.form_definitions
  for insert
  with check (public.has_org_permission(org_id, 'forms.write'));

drop policy if exists form_definitions_forms_write_update on public.form_definitions;
create policy form_definitions_forms_write_update on public.form_definitions
  for update
  using (public.has_org_permission(org_id, 'forms.write'))
  with check (public.has_org_permission(org_id, 'forms.write'));

drop policy if exists form_definitions_forms_write_delete on public.form_definitions;
create policy form_definitions_forms_write_delete on public.form_definitions
  for delete
  using (public.has_org_permission(org_id, 'forms.write'));

drop policy if exists form_versions_public_or_forms_read on public.form_versions;
create policy form_versions_public_or_forms_read on public.form_versions
  for select
  using (
    public.has_org_permission(org_id, 'forms.read')
    or exists (
      select 1
      from public.form_definitions definition
      where definition.id = form_versions.form_id
        and definition.status = 'published'
    )
  );

drop policy if exists form_versions_forms_write_insert on public.form_versions;
create policy form_versions_forms_write_insert on public.form_versions
  for insert
  with check (public.has_org_permission(org_id, 'forms.write'));

drop policy if exists form_versions_forms_write_update on public.form_versions;
create policy form_versions_forms_write_update on public.form_versions
  for update
  using (public.has_org_permission(org_id, 'forms.write'))
  with check (public.has_org_permission(org_id, 'forms.write'));

drop policy if exists form_versions_forms_write_delete on public.form_versions;
create policy form_versions_forms_write_delete on public.form_versions
  for delete
  using (public.has_org_permission(org_id, 'forms.write'));

drop policy if exists form_submissions_member_read on public.form_submissions;
create policy form_submissions_member_read on public.form_submissions
  for select
  using (
    public.has_org_permission(org_id, 'forms.read')
    or public.has_org_permission(org_id, 'forms.write')
    or public.has_org_permission(org_id, 'sponsors.read')
    or public.has_org_permission(org_id, 'sponsors.write')
  );

drop policy if exists form_submissions_forms_write_insert on public.form_submissions;
create policy form_submissions_forms_write_insert on public.form_submissions
  for insert
  with check (public.has_org_permission(org_id, 'forms.write'));

drop policy if exists form_submissions_forms_write_update on public.form_submissions;
create policy form_submissions_forms_write_update on public.form_submissions
  for update
  using (public.has_org_permission(org_id, 'forms.write'))
  with check (public.has_org_permission(org_id, 'forms.write'));

drop policy if exists form_submissions_forms_write_delete on public.form_submissions;
create policy form_submissions_forms_write_delete on public.form_submissions
  for delete
  using (public.has_org_permission(org_id, 'forms.write'));

drop policy if exists sponsor_profiles_public_or_sponsor_read on public.sponsor_profiles;
create policy sponsor_profiles_public_or_sponsor_read on public.sponsor_profiles
  for select
  using (
    status = 'published'
    or public.is_org_member(org_id)
    or public.has_org_permission(org_id, 'sponsors.read')
    or public.has_org_permission(org_id, 'sponsors.write')
  );

drop policy if exists sponsor_profiles_sponsors_write_insert on public.sponsor_profiles;
create policy sponsor_profiles_sponsors_write_insert on public.sponsor_profiles
  for insert
  with check (public.has_org_permission(org_id, 'sponsors.write'));

drop policy if exists sponsor_profiles_sponsors_write_update on public.sponsor_profiles;
create policy sponsor_profiles_sponsors_write_update on public.sponsor_profiles
  for update
  using (public.has_org_permission(org_id, 'sponsors.write'))
  with check (public.has_org_permission(org_id, 'sponsors.write'));

drop policy if exists sponsor_profiles_sponsors_write_delete on public.sponsor_profiles;
create policy sponsor_profiles_sponsors_write_delete on public.sponsor_profiles
  for delete
  using (public.has_org_permission(org_id, 'sponsors.write'));

drop policy if exists audit_logs_member_read on public.audit_logs;
create policy audit_logs_member_read on public.audit_logs
  for select
  using (public.is_org_member(org_id));

drop policy if exists audit_logs_privileged_insert on public.audit_logs;
create policy audit_logs_privileged_insert on public.audit_logs
  for insert
  with check (
    public.has_org_permission(org_id, 'org.manage.read')
    or public.has_org_permission(org_id, 'forms.write')
    or public.has_org_permission(org_id, 'sponsors.write')
  );

drop policy if exists form_submission_attempts_forms_read on public.form_submission_attempts;
create policy form_submission_attempts_forms_read on public.form_submission_attempts
  for select
  using (
    public.has_org_permission(org_id, 'forms.read')
    or public.has_org_permission(org_id, 'forms.write')
  );

drop policy if exists form_submission_attempts_forms_write_insert on public.form_submission_attempts;
create policy form_submission_attempts_forms_write_insert on public.form_submission_attempts
  for insert
  with check (public.has_org_permission(org_id, 'forms.write'));

drop policy if exists form_submission_attempts_forms_write_delete on public.form_submission_attempts;
create policy form_submission_attempts_forms_write_delete on public.form_submission_attempts
  for delete
  using (public.has_org_permission(org_id, 'forms.write'));

drop policy if exists form_assets_read_member on storage.objects;
create policy form_assets_read_member on storage.objects
  for select
  using (
    bucket_id = 'form-assets'
    and split_part(name, '/', 1) = 'orgs'
    and split_part(name, '/', 2) ~* '^[0-9a-f-]{36}$'
    and public.is_org_member((split_part(name, '/', 2))::uuid)
  );

drop policy if exists form_assets_manage_writer on storage.objects;
create policy form_assets_manage_writer on storage.objects
  for all
  using (
    bucket_id = 'form-assets'
    and split_part(name, '/', 1) = 'orgs'
    and split_part(name, '/', 2) ~* '^[0-9a-f-]{36}$'
    and public.has_org_permission((split_part(name, '/', 2))::uuid, 'forms.write')
  )
  with check (
    bucket_id = 'form-assets'
    and split_part(name, '/', 1) = 'orgs'
    and split_part(name, '/', 2) ~* '^[0-9a-f-]{36}$'
    and public.has_org_permission((split_part(name, '/', 2))::uuid, 'forms.write')
  );

with sponsorship_seed as (
  select
    org.id as org_id,
    'sponsorship-intake'::text as slug,
    'Sponsorship Intake'::text as name,
    jsonb_build_object(
      'schema',
      jsonb_build_object(
        'version', 1,
        'fields', jsonb_build_array(
          jsonb_build_object('id', 'heading-intro', 'type', 'heading', 'name', 'heading_intro', 'label', 'Sponsorship Interest'),
          jsonb_build_object('id', 'paragraph-intro', 'type', 'paragraph', 'name', 'paragraph_intro', 'label', 'Share your details and we will follow up with package options.'),
          jsonb_build_object('id', 'sponsor-name', 'type', 'text', 'name', 'sponsor_name', 'label', 'Sponsor Name', 'validation', jsonb_build_object('required', true, 'minLength', 2, 'maxLength', 120)),
          jsonb_build_object('id', 'contact-name', 'type', 'text', 'name', 'contact_name', 'label', 'Contact Name', 'validation', jsonb_build_object('required', true, 'minLength', 2, 'maxLength', 120)),
          jsonb_build_object('id', 'contact-email', 'type', 'email', 'name', 'contact_email', 'label', 'Contact Email', 'validation', jsonb_build_object('required', true, 'email', true, 'maxLength', 200)),
          jsonb_build_object('id', 'contact-phone', 'type', 'phone', 'name', 'contact_phone', 'label', 'Contact Phone', 'validation', jsonb_build_object('required', false, 'maxLength', 40)),
          jsonb_build_object('id', 'website', 'type', 'text', 'name', 'website', 'label', 'Website', 'placeholder', 'https://', 'validation', jsonb_build_object('required', false, 'maxLength', 300)),
          jsonb_build_object(
            'id',
            'tier',
            'type',
            'select',
            'name',
            'tier',
            'label',
            'Tier',
            'options',
            jsonb_build_array(
              jsonb_build_object('id', 'title', 'label', 'Title', 'value', 'Title'),
              jsonb_build_object('id', 'gold', 'label', 'Gold', 'value', 'Gold'),
              jsonb_build_object('id', 'silver', 'label', 'Silver', 'value', 'Silver'),
              jsonb_build_object('id', 'bronze', 'label', 'Bronze', 'value', 'Bronze')
            ),
            'validation',
            jsonb_build_object('required', false)
          ),
          jsonb_build_object(
            'id',
            'logo-upload',
            'type',
            'fileUpload',
            'name',
            'logo_upload',
            'label',
            'Logo Upload',
            'validation',
            jsonb_build_object(
              'required',
              false,
              'allowedFileTypes',
              jsonb_build_array('image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'),
              'maxFileSizeMB',
              10
            )
          ),
          jsonb_build_object('id', 'message', 'type', 'textarea', 'name', 'message', 'label', 'Message', 'validation', jsonb_build_object('required', false, 'maxLength', 2000))
        )
      ),
      'ui',
      jsonb_build_object(
        'submitLabel', 'Submit Interest',
        'successMessage', 'Thanks. Your sponsorship interest has been submitted.',
        'honeypotFieldName', 'companyWebsite'
      ),
      'theme',
      jsonb_build_object(
        'variant', 'default'
      ),
      'behavior',
      jsonb_build_object(
        'type', 'sponsorship_intake',
        'mapping', jsonb_build_object(
          'sponsorName', 'sponsor_name',
          'websiteUrl', 'website',
          'tier', 'tier',
          'logoAssetId', 'logo_upload'
        )
      )
    ) as snapshot
  from public.orgs org
), upserted_definitions as (
  insert into public.form_definitions (
    org_id,
    slug,
    name,
    status,
    schema_json,
    ui_json,
    theme_json,
    behavior_json
  )
  select
    seed.org_id,
    seed.slug,
    seed.name,
    'published',
    seed.snapshot -> 'schema',
    seed.snapshot -> 'ui',
    seed.snapshot -> 'theme',
    seed.snapshot -> 'behavior'
  from sponsorship_seed seed
  on conflict (org_id, slug) do update
  set
    name = excluded.name,
    status = excluded.status,
    schema_json = excluded.schema_json,
    ui_json = excluded.ui_json,
    theme_json = excluded.theme_json,
    behavior_json = excluded.behavior_json,
    updated_at = now()
  returning id, org_id
)
insert into public.form_versions (
  org_id,
  form_id,
  version_number,
  snapshot_json,
  published_at,
  created_by
)
select
  definition.org_id,
  definition.id,
  1,
  jsonb_build_object(
    'schema', definition.schema_json,
    'ui', definition.ui_json,
    'theme', definition.theme_json,
    'behavior', definition.behavior_json
  ),
  now(),
  null
from public.form_definitions definition
where definition.slug = 'sponsorship-intake'
  and not exists (
    select 1
    from public.form_versions version
    where version.form_id = definition.id
  );

with sponsorship_forms as (
  select
    definition.id as form_id,
    definition.org_id,
    (
      select version.id
      from public.form_versions version
      where version.form_id = definition.id
      order by version.version_number desc
      limit 1
    ) as version_id
  from public.form_definitions definition
  where definition.slug = 'sponsorship-intake'
), legacy_submissions as (
  select
    sponsor.id,
    sponsor.org_id,
    sponsor.company_name,
    sponsor.contact_name,
    sponsor.contact_email,
    sponsor.contact_phone,
    sponsor.website,
    sponsor.message,
    sponsor.logo_path,
    sponsor.status,
    sponsor.is_published,
    sponsor.internal_notes,
    sponsor.created_at,
    sponsor.updated_at,
    form.form_id,
    form.version_id
  from public.sponsor_submissions sponsor
  join sponsorship_forms form on form.org_id = sponsor.org_id
)
insert into public.form_submissions (
  id,
  org_id,
  form_id,
  version_id,
  answers_json,
  metadata_json,
  status,
  created_at
)
select
  legacy.id,
  legacy.org_id,
  legacy.form_id,
  legacy.version_id,
  jsonb_build_object(
    'sponsor_name', legacy.company_name,
    'contact_name', legacy.contact_name,
    'contact_email', legacy.contact_email,
    'contact_phone', coalesce(legacy.contact_phone, ''),
    'website', coalesce(legacy.website, ''),
    'tier', '',
    'logo_upload', coalesce(legacy.logo_path, ''),
    'message', coalesce(legacy.message, '')
  ),
  jsonb_build_object(
    'source', 'legacy_sponsor_submissions',
    'legacyStatus', legacy.status,
    'legacyPublished', legacy.is_published,
    'legacyInternalNotes', coalesce(legacy.internal_notes, '')
  ),
  'submitted',
  legacy.created_at
from legacy_submissions legacy
where legacy.version_id is not null
on conflict (id) do nothing;

insert into public.sponsor_profiles (
  id,
  org_id,
  name,
  logo_asset_id,
  website_url,
  tier,
  status,
  submission_id,
  created_at,
  updated_at
)
select
  sponsor.id,
  sponsor.org_id,
  sponsor.company_name,
  sponsor.logo_path,
  sponsor.website,
  null,
  case
    when sponsor.is_published then 'published'
    when sponsor.status in ('approved', 'paid') then 'approved'
    when sponsor.status = 'submitted' then 'pending'
    else 'draft'
  end,
  migrated_submission.id,
  sponsor.created_at,
  sponsor.updated_at
from public.sponsor_submissions sponsor
left join public.form_submissions migrated_submission
  on migrated_submission.id = sponsor.id
 and migrated_submission.org_id = sponsor.org_id
on conflict (id) do nothing;
