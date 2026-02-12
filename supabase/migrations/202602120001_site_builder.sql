create table if not exists public.org_site_pages (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  page_key text not null,
  layout jsonb not null default '[]'::jsonb,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, page_key)
);

create index if not exists org_site_pages_org_page_idx on public.org_site_pages (org_id, page_key);

alter table public.org_site_pages enable row level security;

drop trigger if exists org_site_pages_set_updated_at on public.org_site_pages;
create trigger org_site_pages_set_updated_at before update on public.org_site_pages for each row execute procedure public.set_updated_at();

drop policy if exists org_site_pages_public_read on public.org_site_pages;
create policy org_site_pages_public_read on public.org_site_pages
  for select
  using (true);

drop policy if exists org_site_pages_manager_insert on public.org_site_pages;
create policy org_site_pages_manager_insert on public.org_site_pages
  for insert
  with check (public.has_org_role(org_id, 'manager'));

drop policy if exists org_site_pages_manager_update on public.org_site_pages;
create policy org_site_pages_manager_update on public.org_site_pages
  for update
  using (public.has_org_role(org_id, 'manager'))
  with check (public.has_org_role(org_id, 'manager'));

drop policy if exists org_site_pages_manager_delete on public.org_site_pages;
create policy org_site_pages_manager_delete on public.org_site_pages
  for delete
  using (public.has_org_role(org_id, 'manager'));
