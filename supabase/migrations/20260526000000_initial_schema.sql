-- ─────────────────────────────────────────────────────────────────────────────
-- ParkShare — Initial Schema
-- ─────────────────────────────────────────────────────────────────────────────
-- Order: functions → tables → triggers → RLS enable → RLS policies → realtime
-- All tables are created before any cross-referencing RLS policies are applied.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Shared trigger function ─────────────────────────────────────────────────

create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLES
-- ─────────────────────────────────────────────────────────────────────────────

-- profiles — mirrors auth.users, auto-created on sign-up via trigger
create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text not null,
  display_name  text,
  avatar_url    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- cars — the central organizing unit
create table cars (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  license_plate text,
  created_by    uuid not null references profiles(id) on delete cascade,
  invite_code   text not null unique default upper(substring(md5(random()::text), 1, 6)),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index on cars (created_by);
create index on cars (invite_code);

-- car_subscriptions — links users to cars with per-user notification prefs
create table car_subscriptions (
  id                        uuid primary key default gen_random_uuid(),
  car_id                    uuid not null references cars(id) on delete cascade,
  user_id                   uuid not null references profiles(id) on delete cascade,
  notify_night_before       boolean not null default true,
  notify_two_hours_before   boolean not null default true,
  notify_morning_of         boolean not null default false,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  unique (car_id, user_id)
);

create index on car_subscriptions (car_id);
create index on car_subscriptions (user_id);

-- street_side enum
create type street_side as enum ('N', 'S', 'E', 'W');

-- parking_logs — one active log per car at a time
create table parking_logs (
  id              uuid primary key default gen_random_uuid(),
  car_id          uuid not null references cars(id) on delete cascade,
  logged_by       uuid not null references profiles(id),
  latitude        double precision not null,
  longitude       double precision not null,
  street_address  text not null,
  street_side     street_side not null,
  next_move_at    timestamptz,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index on parking_logs (car_id, is_active);
create index on parking_logs (car_id, created_at desc);

-- push_subscriptions — Web Push endpoint + keys per device
create table push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  created_at  timestamptz not null default now()
);

create index on push_subscriptions (user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- TRIGGERS
-- ─────────────────────────────────────────────────────────────────────────────

create trigger profiles_updated_at
  before update on profiles
  for each row execute function update_updated_at();

create trigger cars_updated_at
  before update on cars
  for each row execute function update_updated_at();

create trigger car_subscriptions_updated_at
  before update on car_subscriptions
  for each row execute function update_updated_at();

create trigger parking_logs_updated_at
  before update on parking_logs
  for each row execute function update_updated_at();

-- Auto-create a profile row whenever a new user signs up
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- When a new parking log is inserted, deactivate all prior logs for that car
create or replace function deactivate_prior_logs()
returns trigger language plpgsql as $$
begin
  update parking_logs
    set is_active = false
    where car_id = new.car_id
      and id != new.id
      and is_active = true;
  return new;
end;
$$;

create trigger on_parking_log_insert
  after insert on parking_logs
  for each row execute function deactivate_prior_logs();

-- ─────────────────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- Enable on all tables first, then create policies.
-- All tables exist by this point so cross-table references are safe.
-- ─────────────────────────────────────────────────────────────────────────────

alter table profiles          enable row level security;
alter table cars              enable row level security;
alter table car_subscriptions enable row level security;
alter table parking_logs      enable row level security;
alter table push_subscriptions enable row level security;

-- profiles
create policy "Users can view their own profile"
  on profiles for select using (auth.uid() = id);

create policy "Users can update their own profile"
  on profiles for update using (auth.uid() = id);

-- cars (safe to reference car_subscriptions now — it exists)
create policy "Subscribers can view a car"
  on cars for select
  using (
    auth.uid() = created_by or
    exists (
      select 1 from car_subscriptions
      where car_subscriptions.car_id = cars.id
        and car_subscriptions.user_id = auth.uid()
    )
  );

create policy "Creator can update their car"
  on cars for update using (auth.uid() = created_by);

create policy "Authenticated users can create cars"
  on cars for insert with check (auth.uid() = created_by);

create policy "Creator can delete their car"
  on cars for delete using (auth.uid() = created_by);

-- car_subscriptions
create policy "Users can view subscriptions for their cars"
  on car_subscriptions for select
  using (
    user_id = auth.uid() or
    exists (
      select 1 from cars
      where cars.id = car_subscriptions.car_id
        and cars.created_by = auth.uid()
    )
  );

create policy "Users can subscribe themselves"
  on car_subscriptions for insert with check (auth.uid() = user_id);

create policy "Users can update their own subscription"
  on car_subscriptions for update using (auth.uid() = user_id);

create policy "Users can unsubscribe themselves"
  on car_subscriptions for delete using (auth.uid() = user_id);

-- parking_logs
create policy "Subscribers can view parking logs"
  on parking_logs for select
  using (
    exists (
      select 1 from car_subscriptions
      where car_subscriptions.car_id = parking_logs.car_id
        and car_subscriptions.user_id = auth.uid()
    ) or
    exists (
      select 1 from cars
      where cars.id = parking_logs.car_id
        and cars.created_by = auth.uid()
    )
  );

create policy "Subscribers can create parking logs"
  on parking_logs for insert
  with check (
    auth.uid() = logged_by and (
      exists (
        select 1 from car_subscriptions
        where car_subscriptions.car_id = parking_logs.car_id
          and car_subscriptions.user_id = auth.uid()
      ) or
      exists (
        select 1 from cars
        where cars.id = parking_logs.car_id
          and cars.created_by = auth.uid()
      )
    )
  );

create policy "Logger can update their own log"
  on parking_logs for update using (auth.uid() = logged_by);

-- push_subscriptions
create policy "Users manage their own push subscriptions"
  on push_subscriptions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- REALTIME
-- ─────────────────────────────────────────────────────────────────────────────

alter publication supabase_realtime add table parking_logs;
alter publication supabase_realtime add table car_subscriptions;
