-- Supabase schema for the static profile engagement widgets.
-- Run this once in Supabase SQL Editor before deploying the frontend.

create table if not exists public.profile_stats (
  profile_id text primary key,
  views bigint not null default 0,
  likes bigint not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.profile_visits (
  profile_id text not null,
  visitor_key text not null,
  last_seen timestamptz not null default now(),
  primary key (profile_id, visitor_key)
);

create table if not exists public.profile_likes (
  profile_id text not null,
  visitor_key text not null,
  created_at timestamptz not null default now(),
  primary key (profile_id, visitor_key)
);

alter table public.profile_stats enable row level security;
alter table public.profile_visits enable row level security;
alter table public.profile_likes enable row level security;

drop policy if exists "public read profile stats" on public.profile_stats;
create policy "public read profile stats" on public.profile_stats for select to anon, authenticated using (true);

create or replace function public.record_profile_view(
  p_profile_id text,
  p_visitor_key text,
  p_cooldown_minutes integer default 30
) returns public.profile_stats
language plpgsql security definer set search_path = public
as $$
declare result public.profile_stats;
begin
  insert into profile_stats(profile_id) values (p_profile_id) on conflict (profile_id) do nothing;
  insert into profile_visits(profile_id, visitor_key, last_seen)
    values (p_profile_id, p_visitor_key, now())
    on conflict (profile_id, visitor_key) do nothing;
  if not exists (
    select 1 from profile_visits
    where profile_id = p_profile_id and visitor_key = p_visitor_key
      and last_seen > now() - make_interval(mins => p_cooldown_minutes)
  ) then
    update profile_visits set last_seen = now() where profile_id = p_profile_id and visitor_key = p_visitor_key;
    update profile_stats set views = views + 1, updated_at = now() where profile_id = p_profile_id;
  end if;
  select * into result from profile_stats where profile_id = p_profile_id;
  return result;
end;
$$;

authorize execute on function public.record_profile_view(text, text, integer) to anon, authenticated;

create or replace function public.toggle_profile_like(
  p_profile_id text,
  p_visitor_key text,
  p_like boolean
) returns public.profile_stats
language plpgsql security definer set search_path = public
as $$
declare result public.profile_stats;
begin
  insert into profile_stats(profile_id) values (p_profile_id) on conflict (profile_id) do nothing;
  if p_like then
    insert into profile_likes(profile_id, visitor_key) values (p_profile_id, p_visitor_key) on conflict do nothing;
  else
    delete from profile_likes where profile_id = p_profile_id and visitor_key = p_visitor_key;
  end if;
  update profile_stats set likes = (select count(*) from profile_likes where profile_id = p_profile_id), updated_at = now() where profile_id = p_profile_id;
  select * into result from profile_stats where profile_id = p_profile_id;
  return result;
end;
$$;

authorize execute on function public.toggle_profile_like(text, text, boolean) to anon, authenticated;

insert into public.profile_stats(profile_id) values ('spekco') on conflict (profile_id) do nothing;
