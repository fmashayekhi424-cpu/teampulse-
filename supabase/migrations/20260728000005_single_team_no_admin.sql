-- TeamPulse is now single-tenant (Visual Optics only) with no admin role:
-- every signup auto-joins the one team, and everyone can only edit their own
-- schedule. This removes onboarding, invites, and role-based permissions.

-- 1. Drop policies that call my_role() or reference columns we're dropping,
--    so the functions/columns beneath them can be dropped.
drop policy "teams: admin can update own team" on teams;
drop policy "profiles: admin can update teammates" on profiles;
drop policy "status_types: admin manages own team statuses" on status_types;
drop policy "schedule_entries: admin writes for teammates" on schedule_entries;

-- 2. Drop the privilege-escalation guard — irrelevant once there's no role
--    to escalate to and team switching no longer exists.
drop trigger profiles_guard_privilege_change on profiles;
drop function guard_profile_privilege_change();

-- 3. Drop onboarding/role machinery.
drop function my_role();
drop function create_team(text);
drop function join_team_by_invite_code(text);

-- 4. Consolidate every existing profile onto a single "Visual Optics" team.
do $$
declare
  the_team_id uuid;
begin
  select id into the_team_id from teams order by created_at limit 1;

  if the_team_id is null then
    insert into teams (name, invite_code) values ('Visual Optics', 'visual-optics')
    returning id into the_team_id;
  else
    update teams set name = 'Visual Optics' where id = the_team_id;
  end if;

  update profiles set team_id = the_team_id where team_id is distinct from the_team_id;
end $$;

-- 5. Drop what's no longer needed: role (no admin), invite_code and settings
--    (no onboarding/admin UI to manage them).
alter table profiles drop column role;
alter table profiles alter column team_id set not null;
alter table teams drop column invite_code;
alter table teams drop column settings;

-- 6. Every signup now joins the one existing team directly — no more
--    transitional null team_id / onboarding step.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  the_team_id uuid;
begin
  select id into the_team_id from teams order by created_at limit 1;

  insert into public.profiles (id, team_id, full_name, avatar_url)
  values (
    new.id,
    the_team_id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

-- The remaining policies from the previous migration are untouched and are
-- now the complete picture: teammates can see everything ("select self or
-- teammates" / "select teammates" / "select own team" / "select global or
-- own team"), and "profiles: update self" / "schedule_entries: owner writes"
-- already restrict writes to your own row — exactly what a no-admin,
-- single-team app needs, with nothing left to drop.
