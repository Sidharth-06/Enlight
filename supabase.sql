-- ============================================================
-- INTERVIEW PREP BOT — Supabase Schema v2 (with Auth)
-- ============================================================

create extension if not exists pgcrypto;

-- ============================================================
-- PROFILES TABLE
-- ============================================================
create table if not exists public.interview_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  display_name text,
  target_role text not null default 'Software Engineer',
  difficulty text not null default 'Intermediate',
  preferred_types text[] not null default '{}',
  persona text not null default 'friendly',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- SESSIONS TABLE
-- ============================================================
create table if not exists public.interview_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  target_role text not null,
  difficulty text not null,
  persona text not null,
  average_score numeric not null default 0,
  total_questions integer not null default 0,
  total_hints integer not null default 0,
  question_types text[] not null default '{}',
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists interview_sessions_user_id_created_at_idx
  on public.interview_sessions (user_id, created_at desc);

-- ============================================================
-- RLS POLICIES — Users own their own data
-- ============================================================
alter table public.interview_profiles enable row level security;
alter table public.interview_sessions enable row level security;

-- Profiles
drop policy if exists "Users manage own profile" on public.interview_profiles;
create policy "Users manage own profile"
  on public.interview_profiles
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Sessions — read own
drop policy if exists "Users read own sessions" on public.interview_sessions;
create policy "Users read own sessions"
  on public.interview_sessions
  for select
  using (auth.uid() = user_id);

-- Sessions — insert own
drop policy if exists "Users insert own sessions" on public.interview_sessions;
create policy "Users insert own sessions"
  on public.interview_sessions
  for insert
  with check (auth.uid() = user_id);

-- Service role bypass for API routes
drop policy if exists "Service role bypass profiles" on public.interview_profiles;
create policy "Service role bypass profiles"
  on public.interview_profiles
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "Service role bypass sessions" on public.interview_sessions;
create policy "Service role bypass sessions"
  on public.interview_sessions
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ============================================================
-- STATS VIEW — Dashboard aggregations per user
-- ============================================================
create or replace view public.user_interview_stats as
select
  user_id,
  count(*)::int as total_sessions,
  round(avg(average_score)::numeric, 1) as overall_avg_score,
  max(average_score) as best_score,
  max(created_at) as last_session_at
from public.interview_sessions
group by user_id;

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.interview_profiles (user_id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
