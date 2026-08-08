-- Migration 001: Add status and test_date to word_lists
-- Run this in the Supabase SQL Editor

alter table public.word_lists
    add column if not exists status    text not null default 'active'
        check (status in ('active', 'archived')),
    add column if not exists test_date date;

create index if not exists word_lists_status_idx
    on public.word_lists(user_id, status);
