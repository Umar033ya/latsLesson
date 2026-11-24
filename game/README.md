# LAST LESSON — Independent Game

Separate Phaser 3 + TypeScript + Vite application inside the existing monorepo. The React platform in `apps/web` remains untouched.

Run independently from the repository root with `pnpm --dir game install`, then `pnpm --dir game dev`. The game uses port 5174 to avoid conflict with the platform web app on 5173. Move with WASD/arrows, reach the red terminal, press E, and answer the educational question.

The game is offline-first. `src/services/api` exposes a typed provider boundary: local JSON works now, while `VITE_API_BASE_URL` can later point to the platform API. Progress is stored in LocalStorage.

See `docs/ARCHITECTURE.md`, `docs/GAMEPLAY.md`, `docs/API_INTEGRATION.md`, and `docs/DEVELOPMENT.md`.
