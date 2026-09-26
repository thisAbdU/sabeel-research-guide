-- Public research must have support on, and support cannot be on without payment details.
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
      and nullif(btrim(coalesce(s.payment_provider, '')), '') is not null
      and nullif(btrim(coalesce(s.payment_account_id, '')), '') is not null
  ) then
    raise exception 'public research requires enabled support and payment configuration';
  end if;
  return new;
end;
$$;

drop trigger if exists research_projects_enforce_publish on public.research_projects;
create trigger research_projects_enforce_publish
  before insert or update on public.research_projects
  for each row execute procedure public.enforce_research_publish();

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

  if new.enabled and (
    nullif(btrim(coalesce(new.payment_provider, '')), '') is null
    or nullif(btrim(coalesce(new.payment_account_id, '')), '') is null
  ) then
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

drop trigger if exists support_settings_enforce_payment on public.support_settings;
create trigger support_settings_enforce_payment
  before insert or update or delete on public.support_settings
  for each row execute procedure public.enforce_support_payment();
