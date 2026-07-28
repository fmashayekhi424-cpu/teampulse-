-- Helper functions used by RLS policies, plus the onboarding RPCs.
-- SECURITY DEFINER + a locked-down search_path is required so these can read
-- across rows RLS would otherwise hide (e.g. resolving an invite code before
-- the caller belongs to any team) without becoming an open door.

create function my_team_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select team_id from profiles where id = auth.uid();
$$;

create function my_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select role from profiles where id = auth.uid();
$$;

-- Creates a profile row the moment someone signs up via Supabase Auth.
-- team_id stays null until they create or join a team (see RPCs below).
create function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function handle_new_user();

-- Guards profiles.role / profiles.team_id from being escalated by a direct
-- client-side update. The one-time self-service assignment (create/join a
-- team) is allowed because it only fires while team_id is still null;
-- every change after that requires an admin of the target team.
create function guard_profile_privilege_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role or new.team_id is distinct from old.team_id then
    if old.team_id is not null and coalesce(my_role(), '') <> 'admin' then
      raise exception 'only an admin can change role or team membership';
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_guard_privilege_change
  before update on profiles
  for each row
  execute function guard_profile_privilege_change();

-- Onboarding: create a new team and become its first admin, atomically.
create function create_team(team_name text)
returns teams
language plpgsql
security definer
set search_path = public
as $$
declare
  new_team teams;
  generated_code text;
begin
  if my_team_id() is not null then
    raise exception 'you already belong to a team';
  end if;

  generated_code := substr(md5(random()::text || clock_timestamp()::text), 1, 8);

  insert into teams (name, invite_code)
  values (trim(team_name), generated_code)
  returning * into new_team;

  update profiles
  set team_id = new_team.id, role = 'admin'
  where id = auth.uid();

  return new_team;
end;
$$;

-- Onboarding: join an existing team via its invite code.
create function join_team_by_invite_code(code text)
returns teams
language plpgsql
security definer
set search_path = public
as $$
declare
  target_team teams;
begin
  if my_team_id() is not null then
    raise exception 'you already belong to a team';
  end if;

  select * into target_team from teams where invite_code = trim(code);

  if target_team.id is null then
    raise exception 'invalid invite code';
  end if;

  update profiles
  set team_id = target_team.id, role = 'member'
  where id = auth.uid();

  return target_team;
end;
$$;
