-- 014_add_slot_codes.sql
-- Add optional code fields for event slots and templates to support numbered scheduling.

alter table event_slot_templates
  add column if not exists code text;

alter table event_slots
  add column if not exists code text;

create unique index if not exists event_slot_templates_event_code_idx
  on event_slot_templates (event_id, code)
  where code is not null;

create unique index if not exists event_slots_event_code_idx
  on event_slots (event_id, code)
  where code is not null;
