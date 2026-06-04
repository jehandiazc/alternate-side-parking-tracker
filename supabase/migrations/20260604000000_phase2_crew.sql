-- ─────────────────────────────────────────────────────────────────────────────
-- ParkShare — Phase 2: Crew (social layer)
-- ─────────────────────────────────────────────────────────────────────────────
-- Adds the "crew" surface: viewing co-subscribers of a shared car, owner-only
-- member removal, the invite-code join flow, and friendly default display names.
--
-- Privacy posture (see safety/privacy feedback):
--   • No PII (email / auth UUID) is ever returned to non-owners. The crew RPC
--     exposes display_name + avatar only.
--   • Owner == cars.created_by. Owner-only actions are backed by RLS / SECURITY
--     DEFINER checks, never by the UI alone.
--
-- RLS recursion note: the cars⇄car_subscriptions cycle was previously broken by
-- making car_subscriptions SELECT a direct user_id check (see 20260527000000).
-- Every helper here is SECURITY DEFINER so it bypasses RLS internally and never
-- re-enters that cycle.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Owner check helper (SECURITY DEFINER → no RLS recursion) ─────────────────
create or replace function is_car_owner(p_car_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from cars
    where id = p_car_id and created_by = p_user_id
  );
$$;

-- ── Membership check helper ──────────────────────────────────────────────────
create or replace function is_car_member(p_car_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from car_subscriptions
    where car_id = p_car_id and user_id = p_user_id
  );
$$;

-- ── Crew listing — display-name-only, members only ───────────────────────────
-- Returns every subscriber of a car the caller belongs to. Never returns email.
create or replace function get_car_crew(p_car_id uuid)
returns table (
  user_id      uuid,
  display_name text,
  avatar_url   text,
  is_owner     boolean,
  joined_at    timestamptz
)
language sql
security definer
stable
set search_path = public
as $$
  select
    cs.user_id,
    p.display_name,
    p.avatar_url,
    (c.created_by = cs.user_id) as is_owner,
    cs.created_at               as joined_at
  from car_subscriptions cs
  join cars     c on c.id = cs.car_id
  join profiles p on p.id = cs.user_id
  where cs.car_id = p_car_id
    and is_car_member(p_car_id, auth.uid())   -- caller must belong to the car
  order by (c.created_by = cs.user_id) desc, cs.created_at asc;
$$;

-- ── Look up a car by invite code (no join) — for the invite landing page ─────
-- Granted to anon so a logged-out visitor sees "Join {car}" before signing in.
-- The invite code is the secret; revealing only the car name given a valid code
-- is acceptable (same trust model as any share link).
create or replace function get_car_by_invite(p_invite_code text)
returns table (car_id uuid, car_name text)
language sql
security definer
stable
set search_path = public
as $$
  select id, name
  from cars
  where invite_code = upper(trim(p_invite_code));
$$;

-- ── Join a car by invite code ────────────────────────────────────────────────
-- Subscribes the caller. Idempotent: returns already_member = true if they were
-- already in the crew. Raises on bad code / unauthenticated.
create or replace function join_car_by_invite(p_invite_code text)
returns table (car_id uuid, car_name text, already_member boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid        uuid := auth.uid();
  v_car        cars%rowtype;
  v_was_member boolean;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  select * into v_car from cars where invite_code = upper(trim(p_invite_code));
  if not found then
    raise exception 'Invalid invite code' using errcode = 'P0002';
  end if;

  v_was_member := is_car_member(v_car.id, v_uid);
  if not v_was_member then
    insert into car_subscriptions (car_id, user_id) values (v_car.id, v_uid);
  end if;

  return query select v_car.id, v_car.name, v_was_member;
end;
$$;

-- ── Regenerate a car's invite code — owner only ──────────────────────────────
-- Invalidates the old code so a removed member's stale link can't be reused.
create or replace function regenerate_invite_code(p_car_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid  uuid := auth.uid();
  v_code text;
begin
  if not is_car_owner(p_car_id, v_uid) then
    raise exception 'Only the car owner can regenerate the invite code'
      using errcode = '42501';
  end if;

  v_code := upper(substring(md5(random()::text), 1, 6));
  update cars set invite_code = v_code where id = p_car_id;
  return v_code;
end;
$$;

-- ── Owner-only member removal (RLS) ──────────────────────────────────────────
-- The owner can delete any subscription on their car except their own (removing
-- the owner would orphan the car — owners leave by deleting the car instead).
-- This sits alongside the existing self-unsubscribe policy ("Users can
-- unsubscribe themselves").
create policy "Owner can remove crew members"
  on car_subscriptions for delete
  using (
    is_car_owner(car_id, auth.uid())
    and user_id <> auth.uid()
  );

-- ── Friendly default display names ───────────────────────────────────────────
-- New users get a display name derived from their email local-part (initcap),
-- e.g. alex.kim@gmail.com → "Alex.kim". Users can edit it later. The raw email
-- is never surfaced in any UI.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    initcap(split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Backfill existing profiles that have no display name yet
update profiles
set display_name = initcap(split_part(email, '@', 1))
where display_name is null or display_name = '';

-- ── Grants ───────────────────────────────────────────────────────────────────
grant execute on function is_car_owner(uuid, uuid)        to authenticated;
grant execute on function is_car_member(uuid, uuid)       to authenticated;
grant execute on function get_car_crew(uuid)              to authenticated;
grant execute on function get_car_by_invite(text)         to authenticated, anon;
grant execute on function join_car_by_invite(text)        to authenticated;
grant execute on function regenerate_invite_code(uuid)    to authenticated;
