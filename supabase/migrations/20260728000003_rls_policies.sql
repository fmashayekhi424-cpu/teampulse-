alter table teams enable row level security;
alter table profiles enable row level security;
alter table status_types enable row level security;
alter table schedule_entries enable row level security;

-- teams: only your own team is visible. There is deliberately no direct
-- INSERT policy — teams are only ever created through the create_team() RPC,
-- which runs as its (RLS-bypassing) definer and assigns the creator as admin
-- in the same transaction. A direct client-side insert would skip that.
create policy "teams: select own team" on teams
  for select to authenticated
  using (id = my_team_id());

create policy "teams: admin can update own team" on teams
  for update to authenticated
  using (id = my_team_id() and my_role() = 'admin');

-- profiles: teammates are visible to each other; you can always see yourself
-- (needed before you belong to any team). Writes are self-service for your
-- own basic fields, or admin-only for teammates; role/team_id changes are
-- further restricted by the guard_profile_privilege_change trigger.
create policy "profiles: select self or teammates" on profiles
  for select to authenticated
  using (id = auth.uid() or team_id = my_team_id());

create policy "profiles: update self" on profiles
  for update to authenticated
  using (id = auth.uid());

create policy "profiles: admin can update teammates" on profiles
  for update to authenticated
  using (team_id = my_team_id() and my_role() = 'admin');

-- status_types: global (team_id null) statuses plus your team's own; writes
-- restricted to admins (no custom status UI yet, but the policy is ready).
create policy "status_types: select global or own team" on status_types
  for select to authenticated
  using (team_id is null or team_id = my_team_id());

create policy "status_types: admin manages own team statuses" on status_types
  for all to authenticated
  using (team_id = my_team_id() and my_role() = 'admin')
  with check (team_id = my_team_id() and my_role() = 'admin');

-- schedule_entries: any teammate can see every entry on the team (that's the
-- whole point of the shared dashboard); only the owner or a team admin can
-- write it.
create policy "schedule_entries: select teammates" on schedule_entries
  for select to authenticated
  using (
    user_id in (select id from profiles where team_id = my_team_id())
  );

create policy "schedule_entries: owner writes" on schedule_entries
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "schedule_entries: admin writes for teammates" on schedule_entries
  for all to authenticated
  using (
    my_role() = 'admin'
    and user_id in (select id from profiles where team_id = my_team_id())
  )
  with check (
    my_role() = 'admin'
    and user_id in (select id from profiles where team_id = my_team_id())
  );
