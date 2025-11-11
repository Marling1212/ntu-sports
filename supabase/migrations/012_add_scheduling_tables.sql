-- 012_add_scheduling_tables.sql
-- Introduce scheduling support tables for event time slots, optional courts, and participant blackout windows.

-- Optional courts that belong to an event (allows multiple named venues/courts)
create table if not exists event_courts (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  name text not null,
  surface text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists event_courts_event_id_idx on event_courts (event_id);

-- Master list of available scheduling slots for an event
create table if not exists event_slots (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  court_id uuid references event_courts(id) on delete set null,
  slot_date date not null,
  start_time time not null,
  end_time time not null,
  capacity integer,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_slots_time_check check (end_time > start_time)
);

create index if not exists event_slots_event_id_idx on event_slots (event_id, slot_date, start_time);

-- Participant (team/player) blackout windows indicating when they cannot compete
create table if not exists team_blackouts (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  player_id uuid references players(id) on delete cascade,
  start_time timestamptz not null,
  end_time timestamptz not null,
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint team_blackouts_time_check check (end_time > start_time)
);

create index if not exists team_blackouts_event_idx on team_blackouts (event_id, start_time);
create index if not exists team_blackouts_player_idx on team_blackouts (player_id, start_time);

-- Link matches to their assigned slot when scheduled
alter table matches
  add column if not exists slot_id uuid references event_slots(id) on delete set null;

create index if not exists matches_slot_id_idx on matches (slot_id);

-- Allow events to configure blackout limit per participant/team
alter table events
  add column if not exists blackout_limit integer;
