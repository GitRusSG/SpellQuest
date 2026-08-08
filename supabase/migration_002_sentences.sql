-- Migration 002: Add sentences column to word_lists
-- Run this in the Supabase SQL Editor

alter table public.word_lists
    add column if not exists sentences text[] not null default array[]::text[];
