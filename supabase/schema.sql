-- =============================================
-- SpellQuest Database Schema
-- Run this in the Supabase SQL Editor
-- =============================================

-- =============================================
-- PROFILES
-- One row per child account, extends auth.users
-- =============================================
create table if not exists public.profiles (
    id              uuid primary key references auth.users(id) on delete cascade,
    username        text not null default 'Speller',
    xp              integer not null default 0,
    level           integer not null default 1,
    coins           integer not null default 0,
    selected_hero   text not null default 'robot',
    unlocked_heroes text[] not null default array['robot'],
    premium         boolean not null default false,
    premium_plan    text,
    premium_expiry  timestamptz,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

-- Auto-create a profile when a new user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
    insert into public.profiles (id, username)
    values (
        new.id,
        coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
    );
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_user();

-- =============================================
-- WORD LISTS
-- Saved spelling lists belonging to a user
-- =============================================
create table if not exists public.word_lists (
    id         uuid primary key default gen_random_uuid(),
    user_id    uuid not null references public.profiles(id) on delete cascade,
    name       text not null default 'My Word List',
    words      text[] not null default array[]::text[],
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists word_lists_user_id_idx on public.word_lists(user_id);

-- =============================================
-- TEST RESULTS
-- One row per completed spelling test
-- =============================================
create table if not exists public.test_results (
    id               uuid primary key default gen_random_uuid(),
    user_id          uuid not null references public.profiles(id) on delete cascade,
    list_id          uuid references public.word_lists(id) on delete set null,
    list_name        text,
    words_attempted  integer not null default 0,
    words_correct    integer not null default 0,
    mistakes         text[] not null default array[]::text[],
    completed_at     timestamptz not null default now()
);

create index if not exists test_results_user_id_idx on public.test_results(user_id);
create index if not exists test_results_completed_at_idx on public.test_results(completed_at desc);

-- =============================================
-- ROW LEVEL SECURITY
-- Users can only read/write their own data
-- =============================================

alter table public.profiles enable row level security;
alter table public.word_lists enable row level security;
alter table public.test_results enable row level security;

-- Profiles: user can read and update their own row
create policy "profiles: own read"
    on public.profiles for select
    using (auth.uid() = id);

create policy "profiles: own update"
    on public.profiles for update
    using (auth.uid() = id);

-- Word lists: full CRUD on own rows
create policy "word_lists: own read"
    on public.word_lists for select
    using (auth.uid() = user_id);

create policy "word_lists: own insert"
    on public.word_lists for insert
    with check (auth.uid() = user_id);

create policy "word_lists: own update"
    on public.word_lists for update
    using (auth.uid() = user_id);

create policy "word_lists: own delete"
    on public.word_lists for delete
    using (auth.uid() = user_id);

-- Test results: user can insert and read their own rows
create policy "test_results: own read"
    on public.test_results for select
    using (auth.uid() = user_id);

create policy "test_results: own insert"
    on public.test_results for insert
    with check (auth.uid() = user_id);

-- =============================================
-- UPDATED_AT trigger helper
-- =============================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create trigger profiles_updated_at
    before update on public.profiles
    for each row execute procedure public.set_updated_at();

create trigger word_lists_updated_at
    before update on public.word_lists
    for each row execute procedure public.set_updated_at();
