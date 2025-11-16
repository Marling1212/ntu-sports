-- Store Web Push subscriptions (VAPID)
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text unique not null,
  p256dh text not null,
  auth text not null,
  player_id uuid null references public.players(id) on delete set null,
  event_id uuid null references public.events(id) on delete cascade,
  created_at timestamp with time zone default now()
);

create index if not exists idx_push_subs_event on public.push_subscriptions(event_id);
create index if not exists idx_push_subs_player on public.push_subscriptions(player_id);

comment on table public.push_subscriptions is 'Web Push API subscriptions bound to players/events';
comment on column public.push_subscriptions.endpoint is 'Push service endpoint URL';
comment on column public.push_subscriptions.p256dh is 'Client public key';
comment on column public.push_subscriptions.auth is 'Client auth secret';

