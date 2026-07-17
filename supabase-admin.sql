-- =========================================================================
-- Admin controls for Funda amaGama (run this in Supabase SQL Editor).
--
-- Security model: there is no user login, and the anon key is public, so we
-- CANNOT trust the browser to decide who is admin. Instead, the admin password
-- lives ONLY in the database (in app_secrets, which the public anon role cannot
-- read), and every destructive action goes through a SECURITY DEFINER function
-- that checks the password server-side. The admin types the password in the
-- app; it is sent to these functions and verified in the database.
--
-- >>> CHANGE THE PASSWORD on the line marked below before running. <<<
-- =========================================================================

-- 1. Secret store (anon role gets no policy, so it can't read this table) ----
create table if not exists public.app_secrets (
  key text primary key,
  value text not null
);
alter table public.app_secrets enable row level security;

insert into public.app_secrets (key, value)
values ('admin_password', 'CHANGE-ME-to-your-admin-password')   -- <<< CHANGE THIS
on conflict (key) do nothing;
-- To change it later:
--   update public.app_secrets set value = 'new-password' where key = 'admin_password';

-- 2. Password check --------------------------------------------------------
create or replace function public.is_admin(p_password text)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from public.app_secrets
    where key = 'admin_password' and value = p_password
  );
$$;

-- 3. Admin-only create (creation now requires the admin password) ----------
create or replace function public.admin_create_challenge(
  p_name text, p_description text, p_words jsonb, p_password text
) returns public.challenges
language plpgsql security definer set search_path = public as $$
declare r public.challenges;
begin
  if not public.is_admin(p_password) then raise exception 'unauthorized'; end if;
  insert into public.challenges (name, description, words)
  values (p_name, p_description, p_words)
  returning * into r;
  return r;
end; $$;

-- 4. Admin-only delete challenge (also clears its leaderboard) --------------
create or replace function public.admin_delete_challenge(p_id uuid, p_password text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin(p_password) then raise exception 'unauthorized'; end if;
  delete from public.scores where challenge_id = p_id;
  delete from public.challenges where id = p_id;
end; $$;

-- 5. Admin-only delete a leaderboard row (remove offensive names) ----------
create or replace function public.admin_delete_score(p_id uuid, p_password text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin(p_password) then raise exception 'unauthorized'; end if;
  delete from public.scores where id = p_id;
end; $$;

-- 5b. Admin-only remove a whole person from a board (all their entries) -----
create or replace function public.admin_delete_name(p_name text, p_challenge_id uuid, p_password text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin(p_password) then raise exception 'unauthorized'; end if;
  if p_challenge_id is null then
    delete from public.scores where lower(display_name) = lower(p_name) and challenge_id is null;
  else
    delete from public.scores where lower(display_name) = lower(p_name) and challenge_id = p_challenge_id;
  end if;
end; $$;

-- 6. Admin-only award points to a name -------------------------------------
create or replace function public.admin_add_score(
  p_display_name text, p_score int, p_challenge_id uuid, p_password text
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin(p_password) then raise exception 'unauthorized'; end if;
  -- Stored as a normal score (no 'admin' tag) so it blends into the board.
  insert into public.scores (display_name, score, quiz_mode, category, accuracy, challenge_id)
  values (left(p_display_name, 24), greatest(0, p_score), null, null, null, p_challenge_id);
end; $$;

-- 7. Let the app (anon role) call these functions --------------------------
grant execute on function public.is_admin(text) to anon;
grant execute on function public.admin_create_challenge(text, text, jsonb, text) to anon;
grant execute on function public.admin_delete_challenge(uuid, text) to anon;
grant execute on function public.admin_delete_score(uuid, text) to anon;
grant execute on function public.admin_delete_name(text, uuid, text) to anon;
grant execute on function public.admin_add_score(text, int, uuid, text) to anon;

-- 8. Now that creation is admin-only, block anonymous direct inserts --------
drop policy if exists "anyone can add a challenge" on public.challenges;
-- (Scores can still be inserted by anyone — that's how friends post quiz
--  results. Deleting scores is admin-only, via the function above.)
