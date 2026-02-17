update public.org_custom_roles custom_role
set
  permissions = (
    select array_agg(distinct permission order by permission)
    from unnest(coalesce(custom_role.permissions, '{}'::text[]) || array['announcements.read', 'announcements.write']::text[]) as permission
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
      or public.has_org_permission(target_org_id, 'sponsors.write')
    )
    else false
  end;
$$;

drop policy if exists org_announcements_public_or_manager_read on public.org_announcements;
create policy org_announcements_public_or_manager_read on public.org_announcements
  for select
  using (
    (is_published and (publish_at is null or publish_at <= now()))
    or public.has_org_permission(org_id, 'announcements.read')
  );

drop policy if exists org_announcements_manager_insert on public.org_announcements;
create policy org_announcements_manager_insert on public.org_announcements
  for insert
  with check (public.has_org_permission(org_id, 'announcements.write'));

drop policy if exists org_announcements_manager_update on public.org_announcements;
create policy org_announcements_manager_update on public.org_announcements
  for update
  using (public.has_org_permission(org_id, 'announcements.write'))
  with check (public.has_org_permission(org_id, 'announcements.write'));

drop policy if exists org_announcements_manager_delete on public.org_announcements;
create policy org_announcements_manager_delete on public.org_announcements
  for delete
  using (public.has_org_permission(org_id, 'announcements.write'));
