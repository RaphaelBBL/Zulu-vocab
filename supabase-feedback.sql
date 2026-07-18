-- =========================================================================
-- Suggestions / feedback (run this in Supabase SQL Editor). Safe to re-run.
-- Anyone can submit a suggestion; only the admin (password) can read or delete
-- them, so submissions stay private to you.
-- =========================================================================

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  name text,
  message text not null,
  created_at timestamptz default now()
);
alter table public.feedback enable row level security;

-- Anyone can submit (but nobody can read via the public key — no select policy).
drop policy if exists "anyone can add feedback" on public.feedback;
create policy "anyone can add feedback"
  on public.feedback for insert
  with check (
    char_length(message) between 1 and 2000
    and char_length(coalesce(name, '')) <= 40
  );

-- Admin-only: list all suggestions (verified server-side).
create or replace function public.admin_list_feedback(p_password text)
returns setof public.feedback
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin(p_password) then raise exception 'unauthorized'; end if;
  return query select * from public.feedback order by created_at desc;
end; $$;
grant execute on function public.admin_list_feedback(text) to anon;

-- Admin-only: delete a suggestion.
create or replace function public.admin_delete_feedback(p_id uuid, p_password text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin(p_password) then raise exception 'unauthorized'; end if;
  delete from public.feedback where id = p_id;
end; $$;
grant execute on function public.admin_delete_feedback(uuid, text) to anon;
