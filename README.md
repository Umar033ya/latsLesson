# LAST LESSON

Educational horror survival platform: students answer subject questions while surviving a dark school. Web + PWA only (no desktop/native build).

## Stack

- **Backend:** NestJS, TypeScript, PostgreSQL, Prisma, JWT + refresh, RBAC, REST, Swagger
- **Frontend:** React, TypeScript, Vite, Tailwind, React Router, TanStack Query, Zustand, React Hook Form, Zod, Phaser 3
- **Monorepo:** pnpm workspaces; Docker Compose for PostgreSQL (deployment artifact)
- **Roles:** `SUPER_ADMIN`, `CENTER_ADMIN`, `GAMER` (public registration always creates `GAMER`)

## Quick start

```bash
pnpm install
cp .env.example .env      # already present locally
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

- API: `http://localhost:3000/api` (Swagger: `/api/docs`)
- Web: `http://localhost:5173`

## Demo accounts

Password for all: `Admin123!`

| Role | Email |
| --- | --- |
| SUPER_ADMIN | `super@lastlesson.dev` |
| CENTER_ADMIN | `admin@lastlesson.dev` |
| GAMER | `student@lastlesson.dev` |

Demo invitation code: `LL-DEMO-2026`

## Security notes

- Invitation codes are stored hashed, expire, have a max-use count and are redeemed transactionally.
- Correct answers are never sent to the client; grading happens on the backend.
- AI keys are backend-only. With no provider key, a deterministic local study planner is used (pre-game only).
- The service worker never caches auth or private API data.

## Scripts

`pnpm dev`, `pnpm build`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm db:generate`, `pnpm db:migrate`, `pnpm db:seed`.
