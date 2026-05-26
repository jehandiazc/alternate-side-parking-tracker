# Git Workflow

## Branch Structure

```
main          ← production-ready code only. Protected — no direct pushes.
└── develop   ← integration branch. All feature branches merge here first.
    ├── feat/parking-logger
    ├── feat/nyc-open-data-integration
    ├── fix/notification-timing
    └── ...
```

## Day-to-Day Flow

### 1. Always branch off `develop`

```bash
git checkout develop
git pull origin develop
git checkout -b feat/your-feature-name
```

### 2. Keep commits clean and conventional

Format: `type: short description (present tense, lowercase)`

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
chore: add web-push vapid key generation script
```

### 3. Merge into `develop` via PR

- Open a pull request from your feature branch → `develop`
- PRs to `develop` don't require review (solo dev) but should pass any CI checks
- Squash commits if the branch history is noisy

### 4. Promote `develop` → `main` only when ready

- `main` is protected — direct pushes are blocked
- Open a PR from `develop` → `main` only when:
  - The feature/fix has been tested locally
  - The build passes
  - Behavior has been manually verified
- Use a descriptive PR title: `Release: phase 1 core loop`

## Branch Naming

```
feat/short-description       ← new features
fix/short-description        ← bug fixes
chore/short-description      ← tooling/config
release/v1.0.0               ← release candidates
```
