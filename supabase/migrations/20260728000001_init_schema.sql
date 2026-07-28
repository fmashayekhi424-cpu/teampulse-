-- TeamPulse core schema.
-- auth.users (Supabase Auth) is the source of truth for identity; profiles
-- holds only app-specific fields and is created by a trigger on signup.

create extension if not exists pgcrypto;

create table teams (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  invite_code text not null unique,
  settings    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create table profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  team_id    uuid references teams (id) on delete set null,
  full_name  text,
  avatar_url text,
  role       text not null default 'member' check (role in ('member', 'admin')),
  created_at timestamptz not null default now()
);

create table status_types (
  id             uuid primary key default gen_random_uuid(),
  team_id        uuid references teams (id) on delete cascade, -- null = built-in, available to every team
  key            text not null,
  label          text not null,
  icon           text not null,
  color          text not null,
  allows_comment boolean not null default false,
  sort_order     int not null default 0,
  is_active      boolean not null default true
);

-- NULL team_id means "global": can't use a plain UNIQUE(team_id, key) constraint
-- because SQL treats every NULL as distinct, so this uses a normalized index instead.
create unique index status_types_team_key_idx
  on status_types (coalesce(team_id, '00000000-0000-0000-0000-000000000000'::uuid), key);

create table schedule_entries (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references profiles (id) on delete cascade,
  date           date not null,
  status_type_id uuid not null references status_types (id),
  comment        text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (user_id, date)
);

create index schedule_entries_date_idx on schedule_entries (date);

create function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger schedule_entries_set_updated_at
  before update on schedule_entries
  for each row
  execute function set_updated_at();
