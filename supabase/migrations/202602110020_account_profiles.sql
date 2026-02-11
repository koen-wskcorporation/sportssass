create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_profiles enable row level security;

drop trigger if exists user_profiles_set_updated_at on public.user_profiles;
create trigger user_profiles_set_updated_at before update on public.user_profiles for each row execute procedure public.set_updated_at();

drop policy if exists user_profiles_self_read on public.user_profiles;
create policy user_profiles_self_read on public.user_profiles
  for select
  using (auth.uid() = user_id);

drop policy if exists user_profiles_self_insert on public.user_profiles;
create policy user_profiles_self_insert on public.user_profiles
  for insert
  with check (auth.uid() = user_id);

drop policy if exists user_profiles_self_update on public.user_profiles;
create policy user_profiles_self_update on public.user_profiles
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'account-assets',
  'account-assets',
  false,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
on conflict (id) do nothing;

drop policy if exists account_assets_self_read on storage.objects;
create policy account_assets_self_read on storage.objects
  for select
  using (
    bucket_id = 'account-assets'
    and split_part(name, '/', 1) = 'users'
    and split_part(name, '/', 2) = auth.uid()::text
  );

drop policy if exists account_assets_self_insert on storage.objects;
create policy account_assets_self_insert on storage.objects
  for insert
  with check (
    bucket_id = 'account-assets'
    and split_part(name, '/', 1) = 'users'
    and split_part(name, '/', 2) = auth.uid()::text
  );

drop policy if exists account_assets_self_update on storage.objects;
create policy account_assets_self_update on storage.objects
  for update
  using (
    bucket_id = 'account-assets'
    and split_part(name, '/', 1) = 'users'
    and split_part(name, '/', 2) = auth.uid()::text
  )
  with check (
    bucket_id = 'account-assets'
    and split_part(name, '/', 1) = 'users'
    and split_part(name, '/', 2) = auth.uid()::text
  );

drop policy if exists account_assets_self_delete on storage.objects;
create policy account_assets_self_delete on storage.objects
  for delete
  using (
    bucket_id = 'account-assets'
    and split_part(name, '/', 1) = 'users'
    and split_part(name, '/', 2) = auth.uid()::text
  );
