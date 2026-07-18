-- =========================================================================
-- Schools support (run in Supabase SQL Editor). Safe to re-run.
-- Adds a schools directory (with aliases for normalisation), a `school` column
-- on scores, and admin functions to manage schools and assign people to them.
-- =========================================================================

-- 1. Schools directory (public read; only admin can change, via functions).
create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  aliases text[] default '{}',
  created_at timestamptz default now()
);
alter table public.schools enable row level security;

drop policy if exists "anyone can read schools" on public.schools;
create policy "anyone can read schools" on public.schools for select using (true);

-- 2. Tag scores with a school (null / empty = independent).
alter table public.scores add column if not exists school text;

-- 3. A couple of starter schools with aliases (edit/extend in the admin centre).
insert into public.schools (name, aliases) values
  ('St Katherine''s School', array['st kaths','st kath''s','stkaths','st katherines','katherines']),
  ('St John''s College', array['sjc','st johns','st john''s','stjohns'])
on conflict (name) do nothing;

-- 4. Admin: add / update a school (name + aliases).
create or replace function public.admin_add_school(p_name text, p_aliases text[], p_password text)
returns public.schools language plpgsql security definer set search_path = public as $$
declare r public.schools;
begin
  if not public.is_admin(p_password) then raise exception 'unauthorized'; end if;
  insert into public.schools (name, aliases) values (p_name, coalesce(p_aliases, '{}'))
  on conflict (name) do update set aliases = excluded.aliases
  returning * into r;
  return r;
end; $$;
grant execute on function public.admin_add_school(text, text[], text) to anon;

-- 5. Admin: delete a school.
create or replace function public.admin_delete_school(p_id uuid, p_password text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin(p_password) then raise exception 'unauthorized'; end if;
  delete from public.schools where id = p_id;
end; $$;
grant execute on function public.admin_delete_school(uuid, text) to anon;

-- 5b. Upgrade admin_add_score to also record a school on the awarded points.
drop function if exists public.admin_add_score(text, int, uuid, text, text);
create or replace function public.admin_add_score(
  p_display_name text, p_score int, p_challenge_id uuid, p_language text, p_school text, p_password text
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin(p_password) then raise exception 'unauthorized'; end if;
  insert into public.scores (display_name, score, quiz_mode, category, accuracy, challenge_id, language, school)
  values (left(p_display_name, 24), greatest(0, p_score), null, null, null, p_challenge_id, coalesce(p_language, 'zulu'), nullif(p_school, ''));
end; $$;
grant execute on function public.admin_add_score(text, int, uuid, text, text, text) to anon;

-- 6. Admin: assign a person (by display name) to a school — updates all their runs.
create or replace function public.admin_set_school(p_name text, p_school text, p_password text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin(p_password) then raise exception 'unauthorized'; end if;
  update public.scores set school = nullif(p_school, '') where lower(display_name) = lower(p_name);
end; $$;
grant execute on function public.admin_set_school(text, text, text) to anon;
