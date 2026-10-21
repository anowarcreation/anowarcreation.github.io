-- Run this if you only want to enable the Subscribe feature. The complete setup file already includes this section.


-- EMAIL SUBSCRIPTIONS (public can INSERT its own email; subscriber list stays private)
create table if not exists public.email_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  source text not null default 'website',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint email_subscribers_email_format check (
    char_length(email) between 3 and 254
    and email = lower(btrim(email))
    and email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
  )
);
create unique index if not exists email_subscribers_email_lower_uidx
  on public.email_subscribers (lower(email));
alter table public.email_subscribers enable row level security;
drop policy if exists "Public can subscribe by email" on public.email_subscribers;
create policy "Public can subscribe by email" on public.email_subscribers
  for insert to anon, authenticated
  with check (
    char_length(email) between 3 and 254
    and email = lower(btrim(email))
    and email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
    and source = 'website'
  );
revoke all on public.email_subscribers from anon, authenticated;
grant insert on public.email_subscribers to anon, authenticated;
grant select, insert, update, delete on public.email_subscribers to service_role;
-- No SELECT/UPDATE/DELETE policy is granted to public visitors. The server-side notice email function uses the private service-role key.
