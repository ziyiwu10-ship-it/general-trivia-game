-- Trivia Battle Royale — Supabase schema
-- Run this in the Supabase SQL editor (or via `supabase db push`).

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────────
-- rooms
-- ─────────────────────────────────────────────────────────────
create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  host_token uuid not null default gen_random_uuid(),
  status text not null default 'lobby'
    check (status in ('lobby', 'active', 'finished')),
  category text not null default 'general',
  num_questions int not null default 10
    check (num_questions between 1 and 25),
  seconds_per_question int not null default 20
    check (seconds_per_question between 5 and 120),
  current_question_index int not null default -1,
  question_started_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '6 hours')
);

create index if not exists idx_rooms_code on rooms (code);
create index if not exists idx_rooms_expires_at on rooms (expires_at);

-- ─────────────────────────────────────────────────────────────
-- players
-- ─────────────────────────────────────────────────────────────
create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 20),
  avatar text not null default '🦸‍♀️',
  client_token uuid not null default gen_random_uuid(),
  score int not null default 0,
  is_host boolean not null default false,
  connected boolean not null default true,
  joined_at timestamptz not null default now(),
  unique (room_id, client_token)
);

create index if not exists idx_players_room_id on players (room_id);

-- ─────────────────────────────────────────────────────────────
-- questions (server-generated question bank, per room)
-- correct_index is never sent to clients pre-reveal — the API layer
-- strips it before broadcasting/returning "current question" data.
-- ─────────────────────────────────────────────────────────────
create table if not exists questions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms (id) on delete cascade,
  idx int not null,
  question text not null,
  choices jsonb not null,
  correct_index int not null check (correct_index between 0 and 3),
  category text,
  topic text not null default '',
  explanation text not null default '',
  created_at timestamptz not null default now(),
  unique (room_id, idx)
);

create index if not exists idx_questions_room_id on questions (room_id);
create index if not exists idx_questions_category_created_at on questions (category, created_at desc);

-- ─────────────────────────────────────────────────────────────
-- answers (server-authoritative scoring log)
-- ─────────────────────────────────────────────────────────────
create table if not exists answers (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms (id) on delete cascade,
  question_id uuid not null references questions (id) on delete cascade,
  player_id uuid not null references players (id) on delete cascade,
  choice_index int not null check (choice_index between 0 and 3),
  is_correct boolean not null,
  time_ms int not null,
  points_awarded int not null default 0,
  answered_at timestamptz not null default now(),
  unique (question_id, player_id)
);

create index if not exists idx_answers_room_id on answers (room_id);
create index if not exists idx_answers_question_id on answers (question_id);

-- ─────────────────────────────────────────────────────────────
-- api_usage — daily budget guard for Claude API calls
-- ─────────────────────────────────────────────────────────────
create table if not exists api_usage (
  usage_date date primary key default current_date,
  request_count int not null default 0
);

-- ─────────────────────────────────────────────────────────────
-- Row Level Security
-- All writes happen server-side via the Next.js API routes using the
-- Supabase *service role* key, which bypasses RLS. The browser only
-- ever holds the anon key and is granted narrow read access below —
-- this keeps game state server-authoritative (players can't edit
-- scores/questions/timers from the client) while still letting the
-- UI read room/player/leaderboard state directly if useful.
-- The `questions` table is intentionally NOT readable by anon: the
-- current question (without correct_index) is delivered exclusively
-- via the server API / realtime broadcast, so answers can't leak.
-- ─────────────────────────────────────────────────────────────
alter table rooms enable row level security;
alter table players enable row level security;
alter table questions enable row level security;
alter table answers enable row level security;
alter table api_usage enable row level security;

drop policy if exists "rooms are publicly readable" on rooms;
create policy "rooms are publicly readable" on rooms
  for select using (true);

drop policy if exists "players are publicly readable" on players;
create policy "players are publicly readable" on players
  for select using (true);

-- questions/answers/api_usage: no client policies -> only the
-- service role (server) can read or write them.

-- ─────────────────────────────────────────────────────────────
-- Realtime: rooms/players changes are consumed only server-side;
-- client sync happens over broadcast channels (see src/lib/realtime.ts)
-- so no publication changes are required here.
-- ─────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────
-- Idle room cleanup — call periodically (e.g. via a Vercel Cron
-- hitting /api/cleanup) or run manually:
--   delete from rooms where expires_at < now();
-- Cascades remove players/questions/answers automatically.
-- ─────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────
-- Migrations — if you already ran this file once against a live
-- project, `create table if not exists` won't retroactively add new
-- columns to a table that already exists. Run these by hand instead:
--
--   alter table players add column if not exists avatar text not null default '🦸‍♀️';
--   alter table questions add column if not exists topic text not null default '';
--   create index if not exists idx_questions_category_created_at on questions (category, created_at desc);
--   alter table questions add column if not exists explanation text not null default '';
-- ─────────────────────────────────────────────────────────────
