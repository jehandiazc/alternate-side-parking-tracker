# 🚗 ParkShare — Alternate Side Parking Tracker

A free, public Progressive Web App for NYC roommates to coordinate alternate side parking without the mental overhead.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/jehandiazc/alternate-side-parking-tracker&env=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY,SUPABASE_SERVICE_ROLE_KEY,NEXT_PUBLIC_MAPTILER_API_KEY,NYC_OPEN_DATA_APP_TOKEN,NEXT_PUBLIC_VAPID_PUBLIC_KEY,VAPID_PRIVATE_KEY,VAPID_SUBJECT,CRON_SECRET&envDescription=API%20keys%20required%20to%20run%20ParkShare&envLink=https://github.com/jehandiazc/alternate-side-parking-tracker/blob/main/docs/SELF_HOSTING.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-F0A500.svg)](LICENSE)

> The Deploy button sets up hosting; you'll still provision Supabase and the API keys — see [docs/SELF_HOSTING.md](docs/SELF_HOSTING.md).

## Demo

▶️ **Try the live app:** https://alternate-side-parking-tracker.vercel.app

<!--
  Add a screenshot or demo GIF here once recorded, e.g.:
  ![ParkShare dashboard](docs/images/dashboard.png)
  Tip: drag an image into a GitHub issue/PR to get a hosted URL, or commit
  files under docs/images/.
-->

## What It Does

- **Track your car's location** — drop a pin every time it's parked
- **Auto-calculate move times** — pulls NYC street cleaning schedules from Open Data
- **Holiday intelligence** — syncs with the NYC 311 suspension calendar so you never get an unnecessary alert
- **Shared cars** — invite roommates with a link or code; everyone sees the same real-time status
- **Push notifications** — get alerted the night before and 2 hours before the car needs to move
- **Zero friction** — designed to be as fast as tapping a button

## Tech Stack

- **Frontend:** Next.js 16 (App Router) — PWA
- **Database & Auth:** Supabase (email one-time-code auth, real-time subscriptions, RLS)
- **Notifications:** Web Push API (VAPID), scheduled via a GitHub Actions cron
- **Data:** NYC Open Data (street cleaning schedules) + NYC 311 suspension feed *(Phase 3)*
- **Deployment:** Vercel

## Design

Visual language: **Urban Warmth** — warm off-whites, deep indigo, amber accents, sage green for success states.
Feel: Locket Widget × Things 3. Comforting, sophisticated, fun to use.

## Getting Started

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Run the development server
npm run dev
```

ParkShare depends on a few free services (Supabase, MapTiler, NYC Open Data,
Web Push). For a complete walkthrough of provisioning them and standing up your
own instance, see **[docs/SELF_HOSTING.md](docs/SELF_HOSTING.md)**.

## Environment Variables

See [`.env.example`](.env.example) for the full list (each documented inline);
[docs/SELF_HOSTING.md](docs/SELF_HOSTING.md) explains where to obtain each one.

## Project Structure

```
src/
├── app/                  # Next.js App Router pages
│   ├── (auth)/           # Login, invite flow
│   ├── (app)/            # Main app (dashboard, park, schedule, crew)
│   └── api/              # API routes (webhooks, cron)
├── components/           # Reusable UI components
├── lib/                  # Supabase client, NYC Open Data helpers
├── hooks/                # Custom React hooks
└── styles/               # Global styles, design tokens
```

## Roadmap

- [x] **Phase 1** — Core loop: log parking, schedule lookup, push notifications
- [x] **Phase 2** — Social layer: auth, car subscriptions, invite links, real-time sync
- [ ] **Phase 3** — Intelligence: 311 holiday feed, notification preferences, parking history
- [ ] **Phase 4** — Polish: animations, micro-interactions, lock screen widget

See **[ROADMAP.md](ROADMAP.md)** for the detailed breakdown and open tasks.

## Deployment

Hosted on Vercel with GitHub integration: pushes to `main` deploy to production, and every pull request gets its own preview deployment.

## Contributing

This is a public, free app — PRs welcome! See [CONTRIBUTING.md](CONTRIBUTING.md)
to get started, and [ROADMAP.md](ROADMAP.md) for what needs building.

## License

[MIT](LICENSE) © Jehan Diaz
