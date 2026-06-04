# ParkShare Roadmap

A free, public PWA for NYC roommates to coordinate alternate-side parking.
Development is organized into phases. Phases 1–2 are complete and deployed;
Phases 3–4 are open for contribution.

> **Want to pick this up?** See [`docs/SELF_HOSTING.md`](docs/SELF_HOSTING.md)
> to stand up your own instance, then grab a Phase 3 task below.

---

## ✅ Phase 1 — Core loop  *(done)*
Log a parking location, look up the NYC street-cleaning schedule for that block,
and send push reminders before the car must move.

## ✅ Phase 2 — Social layer  *(done)*
Email-OTP auth, a "car" as the shared unit, invite links/codes, a crew roster
with an owner role (remove members, regenerate invite code), real-time sync of
parking status, and per-launch-context session lifetime (90-day installed PWA
vs. session-only in a browser tab).

---

## 🔭 Phase 3 — Intelligence

Much of the groundwork already exists in the schema and UI; these tasks are
largely "wire up the data."

### 3a. 311 holiday / suspension feed
NYC suspends alternate-side parking on certain holidays. Surface that so users
aren't told to move on a suspended day.
- [ ] Add a `suspensions` table (`date`, `reason`) with public-read RLS.
- [ ] Add a sync job (mirror the existing GitHub Actions cron in
      `.github/workflows/cron-notify.yml`) that pulls the DSNY/311 alternate-side
      suspension calendar into the table.
- [ ] Wire it into move-time logic and the dashboard. **The UI already exists**
      — `isSuspended`, the "Holiday!" badge, and the `SuspensionDay` type are
      stubbed in `src/app/(app)/page.tsx` and `src/types/index.ts`; replace the
      hardcoded `isSuspended = false` with a real lookup.
- [ ] Skip/adjust notifications that fall on a suspended day.

### 3b. Notification preferences
Per-user control over which reminders fire.
- [ ] Build a settings UI for the toggles that **already exist** on
      `car_subscriptions`: `notify_night_before`, `notify_two_hours_before`,
      `notify_morning_of` (a new Settings page or a section on the Crew tab).
- [ ] Confirm `src/app/api/cron/notify/route.ts` honors each flag per subscriber.

### 3c. Parking history
- [ ] A history/timeline view of past spots. `parking_logs` already retains every
      prior log (`is_active = false`), so this is mostly a read + presentation.
- [ ] Optional: simple stats (e.g. moves per week, most-used blocks).

## 🎨 Phase 4 — Polish
- [ ] Animations & micro-interactions (the design language is "Locket × Things 3").
- [ ] Lock-screen / home-screen widget.
- [ ] Onboarding refinements and empty-state delight.

---

## Architecture at a glance
- **Frontend:** Next.js 16 (App Router) as an installable PWA.
- **Backend/Auth/Realtime:** Supabase (Postgres + RLS, email-OTP auth, realtime).
- **Data:** NYC Open Data (street cleaning) + (Phase 3) NYC 311/DSNY suspensions.
- **Notifications:** Web Push (VAPID) triggered by a GitHub Actions cron hitting
  `/api/cron/notify`.
- **Hosting:** Vercel (any Node host works; a `Dockerfile` is included).

Database schema lives in `supabase/migrations/`. The data model centers on
`cars` (the shared unit), `car_subscriptions` (membership + notification prefs),
`parking_logs` (location history), and `push_subscriptions` (device endpoints).
