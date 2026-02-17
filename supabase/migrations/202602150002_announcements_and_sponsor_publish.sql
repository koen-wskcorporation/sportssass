alter table public.sponsor_submissions
  add column if not exists is_published boolean not null default false;

create index if not exists sponsor_submissions_org_published_idx on public.sponsor_submissions (org_id, is_published);

create table if not exists public.org_announcements (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  title text not null,
  summary text not null,
  button jsonb,
  publish_at timestamptz,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists org_announcements_org_publish_idx on public.org_announcements (org_id, is_published, publish_at desc);

drop trigger if exists org_announcements_set_updated_at on public.org_announcements;
create trigger org_announcements_set_updated_at before update on public.org_announcements for each row execute procedure public.set_updated_at();

alter table public.org_announcements enable row level security;

drop policy if exists org_announcements_public_or_manager_read on public.org_announcements;
create policy org_announcements_public_or_manager_read on public.org_announcements
  for select
  using (
    (is_published and (publish_at is null or publish_at <= now()))
    or public.has_org_role(org_id, 'manager')
  );

drop policy if exists org_announcements_manager_insert on public.org_announcements;
create policy org_announcements_manager_insert on public.org_announcements
  for insert
  with check (public.has_org_role(org_id, 'manager'));

drop policy if exists org_announcements_manager_update on public.org_announcements;
create policy org_announcements_manager_update on public.org_announcements
  for update
  using (public.has_org_role(org_id, 'manager'))
  with check (public.has_org_role(org_id, 'manager'));

drop policy if exists org_announcements_manager_delete on public.org_announcements;
create policy org_announcements_manager_delete on public.org_announcements
  for delete
  using (public.has_org_role(org_id, 'manager'));

update public.org_page_blocks
set type = 'cta_card'
where type = 'sponsors_preview';

with home_pages as (
  select page.id as org_page_id
  from public.org_pages page
  where page.slug = 'home'
)
insert into public.org_page_blocks (org_page_id, type, sort_index, config)
select
  home.org_page_id,
  'sponsors_carousel',
  coalesce(max(block.sort_index), 0) + 1,
  jsonb_build_object('title', 'Our Sponsors')
from home_pages home
left join public.org_page_blocks block on block.org_page_id = home.org_page_id
where not exists (
  select 1
  from public.org_page_blocks existing_block
  where existing_block.org_page_id = home.org_page_id
    and existing_block.type = 'sponsors_carousel'
)
group by home.org_page_id;
