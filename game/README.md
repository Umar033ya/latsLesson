# LAST LESSON: the game

Independent Phaser 3 + TypeScript + Vite application. It talks to the platform only through `src/platform` (the `/play` API).

```bash
pnpm --filter @last-lesson/game dev        # http://localhost:5174
pnpm --filter @last-lesson/game test
pnpm --filter @last-lesson/game build
```

Opened without a launch link it offers a demo night with bundled questions that is not recorded. See `../docs/GAME.md` and `../docs/ARCHITECTURE.md`. Credits: `public/assets/CREDITS.md`.
