-- =========================================================================
-- Language support migration (run this in Supabase SQL Editor).
-- Adds a `language` column to scores and challenges, and upgrades the two admin
-- functions that create rows so they record the language. Safe to re-run.
-- =========================================================================

-- 1. Columns
alter table public.scores add column if not exists language text;
update public.scores set language = 'zulu' where language is null;

alter table public.challenges add column if not exists language text default 'zulu';
update public.challenges set language = 'zulu' where language is null;

-- 2. Language-aware challenge creation (replaces the 4-arg version)
drop function if exists public.admin_create_challenge(text, text, jsonb, text);
create or replace function public.admin_create_challenge(
  p_name text, p_description text, p_words jsonb, p_language text, p_password text
) returns public.challenges
language plpgsql security definer set search_path = public as $$
declare r public.challenges;
begin
  if not public.is_admin(p_password) then raise exception 'unauthorized'; end if;
  insert into public.challenges (name, description, words, language)
  values (p_name, p_description, p_words, coalesce(p_language, 'zulu'))
  returning * into r;
  return r;
end; $$;
grant execute on function public.admin_create_challenge(text, text, jsonb, text, text) to anon;

-- 3. Language-aware award (replaces the 4-arg version); stored as a normal score
drop function if exists public.admin_add_score(text, int, uuid, text);
create or replace function public.admin_add_score(
  p_display_name text, p_score int, p_challenge_id uuid, p_language text, p_password text
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin(p_password) then raise exception 'unauthorized'; end if;
  insert into public.scores (display_name, score, quiz_mode, category, accuracy, challenge_id, language)
  values (left(p_display_name, 24), greatest(0, p_score), null, null, null, p_challenge_id, coalesce(p_language, 'zulu'));
end; $$;
grant execute on function public.admin_add_score(text, int, uuid, text, text) to anon;
