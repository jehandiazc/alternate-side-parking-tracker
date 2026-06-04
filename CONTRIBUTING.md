# Contributing to ParkShare

Thanks for your interest! ParkShare is a free, public PWA and PRs are welcome.
New here? Start with [docs/SELF_HOSTING.md](docs/SELF_HOSTING.md) to run your own
instance, and [ROADMAP.md](ROADMAP.md) for what needs building.

## Workflow

`main` is the source of truth and is always production-ready. Hosting is wired to
GitHub: **merging to `main` deploys production, and every pull request gets its
own preview deployment** automatically.

1. **Branch off `main`:**
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feat/your-feature-name
   ```
2. **Make your change.** Keep it focused. Run the checks below before pushing.
3. **Open a pull request → `main`.** A Vercel preview is created automatically —
   use it to verify your change in a real deploy.
4. **Merge once it's green and reviewed.** Production deploys from `main` on merge.

## Before you push

```bash
npm run lint        # eslint
npx tsc --noEmit    # type check
npm run build       # production build
```

## Commit conventions

Format: `type: short description` (present tense, lowercase). Add a longer body
when useful.

| Type | When to use |
|------|-------------|
| `feat` | New feature or user-facing change |
| `fix` | Bug fix |
| `chore` | Tooling, config, dependencies |
| `docs` | README, comments, documentation |
| `style` | Formatting, design tokens (no logic change) |
| `refactor` | Code restructure with no behavior change |
| `test` | Adding or updating tests |

Examples:
```
feat: add GPS pin drop to parking logger
fix: correct 311 feed date parsing for holiday suspensions
docs: document VAPID key generation
```

## Branch naming

```
feat/short-description     ← new features
fix/short-description      ← bug fixes
chore/short-description    ← tooling/config
docs/short-description     ← documentation
```

## Database changes

Schema lives in `supabase/migrations/`. Add a new timestamped migration file
rather than editing existing ones, and follow the existing RLS patterns (see
[docs/SELF_HOSTING.md](docs/SELF_HOSTING.md) for how migrations are applied).

## Code of Conduct

By participating you agree to uphold our
[Code of Conduct](CODE_OF_CONDUCT.md).
