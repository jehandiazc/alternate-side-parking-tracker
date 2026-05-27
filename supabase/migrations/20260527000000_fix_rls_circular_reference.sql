-- Fix infinite recursion in RLS policies.
--
-- Root cause: cars SELECT policy queries car_subscriptions,
-- and car_subscriptions SELECT policy queries cars — a cycle.
--
-- Fix: simplify car_subscriptions policies to only check user_id directly,
-- removing the back-reference to cars. This is safe because the car creator
-- is always inserted as a subscriber in the setup flow anyway.

-- ── car_subscriptions ────────────────────────────────────────────────────────

drop policy if exists "Users can view subscriptions for their cars" on car_subscriptions;

create policy "Users can view subscriptions for their cars"
  on car_subscriptions for select
  using (user_id = auth.uid());

-- ── parking_logs ─────────────────────────────────────────────────────────────
-- Same pattern: the SELECT and INSERT policies query both cars and
-- car_subscriptions, which then re-triggers the cars policy.
-- Simplify to a direct user_id lookup via car_subscriptions only.

drop policy if exists "Subscribers can view parking logs" on parking_logs;
drop policy if exists "Subscribers can create parking logs" on parking_logs;

create policy "Subscribers can view parking logs"
  on parking_logs for select
  using (
    exists (
      select 1 from car_subscriptions
      where car_subscriptions.car_id = parking_logs.car_id
        and car_subscriptions.user_id = auth.uid()
    )
  );

create policy "Subscribers can create parking logs"
  on parking_logs for insert
  with check (
    auth.uid() = logged_by and
    exists (
      select 1 from car_subscriptions
      where car_subscriptions.car_id = parking_logs.car_id
        and car_subscriptions.user_id = auth.uid()
    )
  );
