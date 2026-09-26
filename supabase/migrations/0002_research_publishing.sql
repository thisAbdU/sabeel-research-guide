alter table public.research_projects
  add column if not exists researcher_name text,
  add column if not exists field text,
  add column if not exists description text,
  add column if not exists abstract text,
  add column if not exists research_url text,
  add column if not exists institution text,
  add column if not exists location text,
  add column if not exists keywords text[] not null default '{}';

update public.research_projects
set description = summary
where description is null and summary is not null;

update public.research_projects
set abstract = content
where abstract is null and content is not null;

-- Owner can read and change their rows. Inserts stay private.
-- Publish/unpublish are the only API paths that set is_published.
drop policy if exists research_own on public.research_projects;

drop policy if exists research_select_own on public.research_projects;
create policy research_select_own on public.research_projects
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists research_insert_private on public.research_projects;
create policy research_insert_private on public.research_projects
  for insert to authenticated
  with check (auth.uid() = user_id and is_published = false);

drop policy if exists research_update_own on public.research_projects;
create policy research_update_own on public.research_projects
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists research_delete_own on public.research_projects;
create policy research_delete_own on public.research_projects
  for delete to authenticated
  using (auth.uid() = user_id);
