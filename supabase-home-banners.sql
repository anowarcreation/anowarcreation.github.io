-- Anowar Creation: dynamic home hero banners and scrolling announcement
-- Run once in Supabase SQL Editor. Uses the existing Supabase Auth admin account.

create table if not exists public.site_home_banners (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  description text not null default '',
  image_url text not null,
  button_text text not null default '',
  button_url text not null default '',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.site_home_banners enable row level security;
drop policy if exists "Public can read active home banners" on public.site_home_banners;
create policy "Public can read active home banners" on public.site_home_banners
  for select to anon, authenticated using (is_active = true);
drop policy if exists "Admin can manage home banners" on public.site_home_banners;
create policy "Admin can manage home banners" on public.site_home_banners
  for all to authenticated
  using (lower(coalesce(auth.jwt()->>'email','')) = 'anowarali2707@outlook.com')
  with check (lower(coalesce(auth.jwt()->>'email','')) = 'anowarali2707@outlook.com');

create table if not exists public.site_home_banner_settings (
  id integer primary key check (id = 1),
  ticker_text text not null default '',
  ticker_color text not null default '#ffd84d',
  ticker_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.site_home_banner_settings enable row level security;
drop policy if exists "Public can read home banner settings" on public.site_home_banner_settings;
create policy "Public can read home banner settings" on public.site_home_banner_settings
  for select to anon, authenticated using (true);
drop policy if exists "Admin can manage home banner settings" on public.site_home_banner_settings;
create policy "Admin can manage home banner settings" on public.site_home_banner_settings
  for all to authenticated
  using (lower(coalesce(auth.jwt()->>'email','')) = 'anowarali2707@outlook.com')
  with check (lower(coalesce(auth.jwt()->>'email','')) = 'anowarali2707@outlook.com');

insert into public.site_home_banner_settings (id) values (1) on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-home-banners', 'site-home-banners', true, 5242880, array['image/png','image/jpeg','image/webp','image/gif'])
on conflict (id) do update set public = true, file_size_limit = 5242880, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can view home banner images" on storage.objects;
create policy "Public can view home banner images" on storage.objects
  for select to anon, authenticated using (bucket_id = 'site-home-banners');
drop policy if exists "Admin can upload home banner images" on storage.objects;
create policy "Admin can upload home banner images" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'site-home-banners'
    and lower(coalesce(auth.jwt()->>'email','')) = 'anowarali2707@outlook.com'
  );
drop policy if exists "Admin can update home banner images" on storage.objects;
create policy "Admin can update home banner images" on storage.objects
  for update to authenticated using (
    bucket_id = 'site-home-banners'
    and lower(coalesce(auth.jwt()->>'email','')) = 'anowarali2707@outlook.com'
  ) with check (
    bucket_id = 'site-home-banners'
    and lower(coalesce(auth.jwt()->>'email','')) = 'anowarali2707@outlook.com'
  );
drop policy if exists "Admin can delete home banner images" on storage.objects;
create policy "Admin can delete home banner images" on storage.objects
  for delete to authenticated using (
    bucket_id = 'site-home-banners'
    and lower(coalesce(auth.jwt()->>'email','')) = 'anowarali2707@outlook.com'
  );
