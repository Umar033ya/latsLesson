# Development

From the repository root:

```bash
pnpm --dir game install
pnpm --dir game dev
pnpm --dir game typecheck
pnpm --dir game build
```

The game uses port 5174; the existing React app uses 5173. Keep platform calls in `src/services/api`, educational content in JSON, and gameplay modules typed. Do not add React to Phaser scenes.
