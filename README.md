# LAST LESSON

An educational 2D pixel-art mystery game, and the platform education centers use to run it.
*Knowledge is your only way out.*

| Part | Folder | Address in development |
| --- | --- | --- |
| Game (Phaser 3, TypeScript, Vite) | `game/` | http://localhost:5174 |
| Panels: super admin, center, student (React, Vite) | `apps/web/` | http://localhost:5173 |
| API (NestJS, Prisma, PostgreSQL) | `apps/backend/` | http://localhost:3000/api/v1 (docs: `/api/docs`) |
| Shared game design data and validation | `packages/` | |

## Start

Needs Node 22+, pnpm 12 (`npm i -g pnpm@12.5.1`) and PostgreSQL binaries (the setup starts a private cluster on port 5433 and does not touch other databases).

```bash
pnpm install
pnpm run setup
pnpm dev
```

Demo sign-in (development seed only, password `LastLesson-2026` unless `SEED_PASSWORD` is set):

| Who | How |
| --- | --- |
| Super admin | `/staff`: `super@lastlesson.dev` |
| Center admin | `/staff`: `admin@lastlesson.dev` (second center: `riverside@lastlesson.dev`) |
| Student | `/`: code `LL-PLAY-2026` (known student) or `LL-DEMO-2026` (group code, asks for a name) |

`pnpm db:demo` lets the demo students play through the real API, so dashboards have data.

## Commands

| Command | Does |
| --- | --- |
| `pnpm test` | Unit and integration tests (API tests use the `lastlesson_test` database) |
| `pnpm test:e2e` | Playwright: the whole journey in a real browser |
| `node e2e/play.mjs <folder>` | Plays the demo night to the end and saves screenshots |
| `pnpm typecheck`, `pnpm lint`, `pnpm build` | Checks and production builds |
| `python game/tools/art.py`, `python game/tools/audio.py <packs>` | Regenerate art and audio |

## Documentation

[Architecture](docs/ARCHITECTURE.md), [API](docs/API.md), [Security checklist](docs/SECURITY.md), [Deployment (Neon and Vercel)](docs/DEPLOYMENT.md), [Game design](docs/GAME.md)
