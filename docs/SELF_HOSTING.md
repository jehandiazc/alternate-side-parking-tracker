# Self-Hosting ParkShare

ParkShare is a Next.js PWA backed by Supabase, with a few free third-party
services for maps, NYC data, and push notifications. This guide walks you
through standing up your own instance from scratch.

Estimated time: ~30–45 minutes, mostly account sign-ups.

---

## 0. Prerequisites
- **Node.js** — see [`.nvmrc`](../.nvmrc) for the version (`nvm use`).
- **npm** (ships with Node).
- A **GitHub** account (to fork + run the notification cron).
- Free accounts you'll create below: **Supabase**, **MapTiler**, **NYC Open Data**.
- Optional for deploy: a **Vercel** account (or any Node host / Docker).

```bash
git clone https://github.com/<you>/alternate-side-parking-tracker.git
cd alternate-side-parking-tracker
nvm use            # or ensure your Node matches .nvmrc
npm install
cp .env.example .env.local
```

Keep `.env.local` open — you'll fill it in as you go.

---

## 1. Supabase (database, auth, realtime)

1. Create a project at [supabase.com](https://supabase.com).
2. **Settings → API**: copy the values into `.env.local`:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (server-only, keep secret)
3. **Apply the database schema.** Install the
   [Supabase CLI](https://supabase.com/docs/guides/cli), then:
   ```bash
   supabase login
   supabase link --project-ref <your-project-ref>
   supabase db push          # applies everything in supabase/migrations/
   ```
   (Alternatively, paste each file in `supabase/migrations/` into the Supabase
   SQL Editor, in filename order.)

### Auth configuration (email OTP)
ParkShare signs users in with a **6-digit email code** (no passwords, no magic
links). In the Supabase dashboard:

1. **Authentication → Providers → Email**: enable Email. Turn **off
   "Confirm email"** — with OTP, entering the code already proves ownership, and
   leaving it on sends a confirmation *link* instead of a code to new users.
2. **Authentication → Email Templates → Magic Link**: change the body to send
   the token instead of a link, e.g. include `{{ .Token }}` as the code.
3. **Authentication → URL Configuration**:
   - **Site URL**: your app's base URL (e.g. `http://localhost:3000` for dev,
     your domain in production).
   - **Redirect URLs**: add your dev and production origins.

---

## 2. MapTiler (map tiles)

1. Sign up at [maptiler.com](https://www.maptiler.com/) and create an API key.
2. **Add your origins** to the key's *Allowed origins (HTTP referrers)* —
   e.g. `http://localhost:*` and your deploy domain. Skipping this makes the map
   render an "Invalid key" tile.
3. Put the key in `.env.local` as `NEXT_PUBLIC_MAPTILER_API_KEY`.

> If you leave this unset, the app falls back to keyless CARTO tiles — fine for
> development, just less pretty.

---

## 3. NYC Open Data (street cleaning schedules)

1. Get a free app token at
   [data.cityofnewyork.us/profile/app_tokens](https://data.cityofnewyork.us/profile/app_tokens).
2. Set it as `NYC_OPEN_DATA_APP_TOKEN`.

> Note: ParkShare is NYC-specific — it relies on NYC Open Data and (Phase 3) the
> 311 suspension calendar. Adapting it to another city means swapping these data
> sources and the schedule-parsing logic in `src/lib/nyc-open-data.ts`.

---

## 4. Web Push (move reminders)

Generate a VAPID keypair:
```bash
npx web-push generate-vapid-keys
```
Set in `.env.local`:
- Public key → `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- Private key → `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT` → `mailto:your@email.com`

---

## 5. Run locally

```bash
npm run dev
```
Open the dev URL (defaults to `http://localhost:3000`). Sign in with your email,
enter the 6-digit code, create a car, and log a parking spot.

> iOS note: installed PWAs use a separate cookie store from Safari, so you'll
> sign in once inside the installed app. See the session-lifetime notes in
> `src/lib/supabase/session.ts`.

---

## 6. Deploy

### Vercel (recommended)
1. Import the repo at [vercel.com](https://vercel.com) (framework auto-detected
   as Next.js).
2. Add every variable from your `.env.local` under **Settings → Environment
   Variables** (Production + Preview).
3. **Settings → Git**: connect the GitHub repo and set the Production Branch to
   `main`. Pushes to `main` then deploy production; pull requests get preview
   deployments automatically.
4. Update the Supabase **Site URL / Redirect URLs** (step 1) and your MapTiler
   **Allowed origins** to include the production domain.

### Other hosts / Docker
A `Dockerfile` and `docker-compose.yml` are included for any Node-capable host.
Provide the same environment variables.

---

## 7. Notification cron

Push reminders are driven by a scheduled job that calls `/api/cron/notify`.
It's wired as a GitHub Actions workflow (`.github/workflows/cron-notify.yml`,
every 15 min). In your repo's **Settings → Secrets and variables → Actions**, add:
- `CRON_SECRET` — the same value as your `CRON_SECRET` env var (generate with
  `openssl rand -hex 32`). The endpoint rejects requests without it.
- `APP_URL` — your deployed base URL.

You can trigger it manually from the Actions tab (`workflow_dispatch`) to test.

---

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| Map shows "Invalid key" | MapTiler key missing, or your origin isn't in the key's Allowed Origins. |
| New signups get a *link*, not a code | "Confirm email" is still on in Supabase, or the Magic Link template wasn't switched to `{{ .Token }}`. |
| Stuck on login after deploy | Supabase **Site URL / Redirect URLs** don't include the deployed domain. |
| Push notifications never arrive | VAPID keys mismatched, or the cron `CRON_SECRET`/`APP_URL` secrets aren't set. |
| Dashboard shows "Where's the car?" right after parking | A saved log with no street-cleaning schedule still shows as parked with a "no schedule found" state — that's expected, not a save failure. |

For the feature roadmap, see [`../ROADMAP.md`](../ROADMAP.md).
