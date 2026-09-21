create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.research_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  title text not null,
  summary text,
  content text,
  is_published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  research_project_id uuid references public.research_projects (id) on delete set null,
  mode text not null check (mode in ('vent', 'roast', 'funding')),
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.funding_matches (
  id uuid primary key default gen_random_uuid(),
  research_project_id uuid not null references public.research_projects (id) on delete cascade,
  organization_name text not null,
  program_name text,
  description text,
  url text,
  relevance_note text,
  relevance_score numeric,
  created_at timestamptz not null default now()
);

create table if not exists public.support_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  research_project_id uuid not null unique references public.research_projects (id) on delete cascade,
  enabled boolean not null default false,
  payment_provider text,
  payment_account_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.support_transactions (
  id uuid primary key default gen_random_uuid(),
  support_settings_id uuid not null references public.support_settings (id) on delete restrict,
  research_project_id uuid not null references public.research_projects (id) on delete restrict,
  supporter_user_id uuid references public.users (id) on delete set null,
  amount numeric not null check (amount > 0),
  currency text not null default 'usd',
  status text not null default 'pending' check (status in ('pending', 'completed', 'failed')),
  provider_payment_id text,
  created_at timestamptz not null default now()
);

create index if not exists research_projects_user_id_idx on public.research_projects (user_id);
create index if not exists research_projects_published_idx on public.research_projects (is_published) where is_published;
create index if not exists conversations_user_id_idx on public.conversations (user_id);
create index if not exists messages_conversation_id_idx on public.messages (conversation_id);
create index if not exists funding_matches_project_id_idx on public.funding_matches (research_project_id);
create index if not exists support_transactions_project_id_idx on public.support_transactions (research_project_id);

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at
  before update on public.users
  for each row execute procedure public.set_updated_at();

drop trigger if exists research_projects_set_updated_at on public.research_projects;
create trigger research_projects_set_updated_at
  before update on public.research_projects
  for each row execute procedure public.set_updated_at();

drop trigger if exists conversations_set_updated_at on public.conversations;
create trigger conversations_set_updated_at
  before update on public.conversations
  for each row execute procedure public.set_updated_at();

drop trigger if exists support_settings_set_updated_at on public.support_settings;
create trigger support_settings_set_updated_at
  before update on public.support_settings
  for each row execute procedure public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

alter table public.users enable row level security;
alter table public.research_projects enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.funding_matches enable row level security;
alter table public.support_settings enable row level security;
alter table public.support_transactions enable row level security;

drop policy if exists users_select_own on public.users;
create policy users_select_own on public.users
  for select to authenticated
  using (auth.uid() = id);

drop policy if exists users_update_own on public.users;
create policy users_update_own on public.users
  for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists research_own on public.research_projects;
create policy research_own on public.research_projects
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists research_read_published on public.research_projects;
create policy research_read_published on public.research_projects
  for select to anon, authenticated
  using (is_published = true);

drop policy if exists conversations_own on public.conversations;
create policy conversations_own on public.conversations
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists messages_via_conversation on public.messages;
create policy messages_via_conversation on public.messages
  for all to authenticated
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  );

drop policy if exists funding_via_project on public.funding_matches;
create policy funding_via_project on public.funding_matches
  for all to authenticated
  using (
    exists (
      select 1 from public.research_projects p
      where p.id = research_project_id and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.research_projects p
      where p.id = research_project_id and p.user_id = auth.uid()
    )
  );

drop policy if exists support_settings_own on public.support_settings;
create policy support_settings_own on public.support_settings
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists support_settings_read_enabled on public.support_settings;
create policy support_settings_read_enabled on public.support_settings
  for select to anon, authenticated
  using (
    enabled = true
    and exists (
      select 1 from public.research_projects p
      where p.id = research_project_id and p.is_published = true
    )
  );

drop policy if exists support_transactions_recipient on public.support_transactions;
create policy support_transactions_recipient on public.support_transactions
  for select to authenticated
  using (
    exists (
      select 1 from public.support_settings s
      where s.id = support_settings_id and s.user_id = auth.uid()
    )
  );

drop policy if exists support_transactions_supporter on public.support_transactions;
create policy support_transactions_supporter on public.support_transactions
  for select to authenticated
  using (auth.uid() = supporter_user_id);

drop policy if exists support_transactions_insert on public.support_transactions;
create policy support_transactions_insert on public.support_transactions
  for insert to authenticated
  with check (supporter_user_id = auth.uid());

grant usage on schema public to anon, authenticated;

grant select, update on public.users to authenticated;
grant select on public.research_projects to anon, authenticated;
grant insert, update, delete on public.research_projects to authenticated;
grant all on public.conversations to authenticated;
grant all on public.messages to authenticated;
grant all on public.funding_matches to authenticated;
grant select on public.support_settings to anon, authenticated;
grant insert, update, delete on public.support_settings to authenticated;
grant select, insert on public.support_transactions to authenticated;
