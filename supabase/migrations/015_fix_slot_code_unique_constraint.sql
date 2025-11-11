-- 015_fix_slot_code_unique_constraint.sql
-- Ensure slot code uniqueness uses standard constraints (partial indexes can break upsert)

drop index if exists event_slot_templates_event_code_idx;
drop index if exists event_slots_event_code_idx;

alter table event_slot_templates
  add constraint event_slot_templates_event_code_unique
  unique (event_id, code);

alter table event_slots
  add constraint event_slots_event_code_unique
  unique (event_id, code);
