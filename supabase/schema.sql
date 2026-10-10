-- CV Roaster schema. Run this once in Supabase: Dashboard > SQL Editor > New query > paste > Run.

create table if not exists public.cv_analyses (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  cv_text          text not null,
  job_description  text,
  score            int  not null check (score between 0 and 100),
  verdict          text,
  result           jsonb not null,
  created_at       timestamptz not null default now()
);

create table if not exists public.generated_cvs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  full_name     text,
  title         text,
  cv            jsonb not null,
  conversation  jsonb,
  created_at    timestamptz not null default now()
);

create index if not exists cv_analyses_user_created_idx on public.cv_analyses (user_id, created_at desc);
create index if not exists generated_cvs_user_created_idx on public.generated_cvs (user_id, created_at desc);

-- Row Level Security: each user can only see and manage their own rows.
alter table public.cv_analyses enable row level security;
alter table public.generated_cvs enable row level security;

drop policy if exists "own analyses" on public.cv_analyses;
create policy "own analyses" on public.cv_analyses
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "own generated cvs" on public.generated_cvs;
create policy "own generated cvs" on public.generated_cvs
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
