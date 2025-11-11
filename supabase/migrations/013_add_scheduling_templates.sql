-- 013_add_scheduling_templates.sql
-- Weekly templates and bulk scheduling helpers for events and team blackouts

create table if not exists event_slot_templates (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  court_id uuid references event_courts(id) on delete set null,
  capacity integer,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_slot_templates_time_check check (end_time > start_time)
);

create index if not exists event_slot_templates_event_idx on event_slot_templates (event_id, day_of_week);

create table if not exists team_blackout_templates (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint team_blackout_templates_time_check check (end_time > start_time)
);

create index if not exists team_blackout_templates_event_idx on team_blackout_templates (event_id, player_id, day_of_week);
