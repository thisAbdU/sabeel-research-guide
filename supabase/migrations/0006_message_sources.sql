-- Persist funder cards / literature / research directions with each assistant message
alter table public.messages
  add column if not exists sources jsonb not null default '[]'::jsonb,
  add column if not exists research_directions jsonb not null default '[]'::jsonb;
