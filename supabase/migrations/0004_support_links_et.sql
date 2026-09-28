-- Support payments: richer researcher payout details + verified tip transactions.
-- links.et verifies receipts; we never store receipt URLs or screenshot bytes.

alter table public.support_settings
  add column if not exists payment_account_name text,
  add column if not exists payment_methods jsonb not null default '[]'::jsonb;

alter table public.support_transactions
  add column if not exists payment_reference text,
  add column if not exists supporter_name text,
  add column if not exists is_anonymous boolean not null default false,
  add column if not exists receipt_fingerprint text,
  add column if not exists receipt_source text,
  add column if not exists verified_amount numeric,
  add column if not exists verified_at timestamptz,
  add column if not exists failure_reason text,
  add column if not exists updated_at timestamptz not null default now();

-- Backfill payment_reference for any existing rows.
update public.support_transactions
set payment_reference = 'SBL-' || upper(substr(replace(id::text, '-', ''), 1, 12))
where payment_reference is null;

alter table public.support_transactions
  alter column payment_reference set not null;

create unique index if not exists support_transactions_payment_reference_uidx
  on public.support_transactions (payment_reference);

create unique index if not exists support_transactions_receipt_fingerprint_uidx
  on public.support_transactions (receipt_fingerprint)
  where receipt_fingerprint is not null;

-- Expand status set for the support modal (cancelled) while keeping pending/completed/failed.
alter table public.support_transactions
  drop constraint if exists support_transactions_status_check;

alter table public.support_transactions
  add constraint support_transactions_status_check
  check (status in ('pending', 'completed', 'failed', 'cancelled'));

-- Default tip currency is ETB for Ethiopian bank/wallet transfers.
alter table public.support_transactions
  alter column currency set default 'etb';

drop trigger if exists support_transactions_set_updated_at on public.support_transactions;
create trigger support_transactions_set_updated_at
  before update on public.support_transactions
  for each row execute procedure public.set_updated_at();

create or replace function public.support_has_payment(settings public.support_settings)
returns boolean
language sql
immutable
as $$
  select
    (
      nullif(btrim(coalesce(settings.payment_provider, '')), '') is not null
      and nullif(btrim(coalesce(settings.payment_account_id, '')), '') is not null
    )
    or jsonb_typeof(settings.payment_methods) = 'array'
      and jsonb_array_length(settings.payment_methods) > 0
$$;

create or replace function public.enforce_research_publish()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.is_published and not exists (
    select 1
    from public.support_settings s
    where s.research_project_id = new.id
      and s.enabled
      and public.support_has_payment(s)
  ) then
    raise exception 'public research requires enabled support and payment configuration';
  end if;
  return new;
end;
$$;

create or replace function public.enforce_support_payment()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    if exists (
      select 1 from public.research_projects p
      where p.id = old.research_project_id and p.is_published
    ) then
      raise exception 'public research cannot remove payment configuration';
    end if;
    return old;
  end if;

  if new.enabled and not public.support_has_payment(new) then
    raise exception 'support requires payment configuration';
  end if;

  if not new.enabled and exists (
    select 1 from public.research_projects p
    where p.id = new.research_project_id and p.is_published
  ) then
    raise exception 'public research cannot disable support';
  end if;

  return new;
end;
$$;

-- Authenticated supporters may insert their own tip rows.
-- Anonymous tips and verification updates go through the service-role API client.
drop policy if exists support_transactions_insert on public.support_transactions;
create policy support_transactions_insert on public.support_transactions
  for insert to authenticated
  with check (supporter_user_id = auth.uid());

-- Completed tips are readable for top-supporters UI (no receipt material in these rows).
drop policy if exists support_transactions_completed_public on public.support_transactions;
create policy support_transactions_completed_public on public.support_transactions
  for select to anon, authenticated
  using (status = 'completed');

grant select on public.support_transactions to anon;
