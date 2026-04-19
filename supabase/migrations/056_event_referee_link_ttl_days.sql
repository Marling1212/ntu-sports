-- Default validity (days) for signed referee portal links; admins can override per copy in the API.
alter table public.events
  add column if not exists referee_link_ttl_days integer not null default 14;

alter table public.events
  drop constraint if exists events_referee_link_ttl_days_range;

alter table public.events
  add constraint events_referee_link_ttl_days_range
  check (referee_link_ttl_days >= 1 and referee_link_ttl_days <= 365);

comment on column public.events.referee_link_ttl_days is 'Default number of days referee portal magic links remain valid (1–365).';
