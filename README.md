# 🚗 ParkShare — Alternate Side Parking Tracker

A free, public Progressive Web App for NYC roommates to coordinate alternate side parking without the mental overhead.

## What It Does

- **Track your car's location** — drop a pin every time it's parked
- **Auto-calculate move times** — pulls NYC street cleaning schedules from Open Data
- **Holiday intelligence** — syncs with the NYC 311 suspension calendar so you never get an unnecessary alert
- **Shared cars** — invite roommates via magic link; everyone sees the same real-time status
- **Push notifications** — get alerted the night before and 2 hours before the car needs to move
- **Zero friction** — designed to be as fast as tapping a button

## Tech Stack

- **Frontend:** Next.js 15 (App Router) — PWA
- **Database & Auth:** Supabase (magic link email auth, real-time subscriptions)
- **Notifications:** Web Push API via Supabase Edge Functions
- **Data:** NYC Open Data (street cleaning schedules) + NYC 311 suspension feed
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

## Environment Variables

See `.env.example` for required keys:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NYC_OPEN_DATA_APP_TOKEN`

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

## Phases

- [ ] **Phase 1** — Core loop: log parking, schedule lookup, push notifications
- [ ] **Phase 2** — Social layer: auth, car subscriptions, invite links, real-time sync
- [ ] **Phase 3** — Intelligence: 311 holiday feed, notification preferences, parking history
- [ ] **Phase 4** — Polish: animations, micro-interactions, lock screen widget

## Contributing

This is a public, free app. PRs welcome.
