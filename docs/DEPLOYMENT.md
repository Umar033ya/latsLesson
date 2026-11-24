# Deployment: Neon and Vercel

One Vercel project serves everything from one origin: panels at `/`, the game at `/play/`, the API at `/api/v1`. One origin means no CORS and first-party cookies.

1. **Import the repository in Vercel.** `vercel.json` already sets the install command, build command and output.
2. **Add Neon** (Vercel, Storage, Neon). It creates `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED` (direct). Prisma uses the first for the API and the second for migrations.
3. **Environment variables** (Production):

| Name | Value |
| --- | --- |
| `JWT_ACCESS_SECRET`, `GAME_TOKEN_SECRET`, `CODE_PEPPER` | three different random values (32+ characters) |
| `WEB_ORIGIN` | `https://your-domain` |
| `GAME_URL` | `https://your-domain/play/` |
| `TRUST_PROXY` | `1` |
| `AI_PROVIDER`, `AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL` | optional |

4. **Deploy.** Production builds run `prisma migrate deploy`.
5. **Seed once** from your machine, with the Neon variables and a strong password in the environment:

```bash
NODE_ENV=production SEED_PASSWORD=... DATABASE_URL=... DATABASE_URL_UNPOOLED=... CODE_PEPPER=... pnpm db:seed
```

The production seed creates accounts and content but no demo access codes.

What has been verified: `pnpm vercel:build` and the function entry `api/index.js` with production settings, locally. The first real deployment still has to be done.

## Docker

`docker compose up --build` with `POSTGRES_PASSWORD` and the three secrets in `.env` serves everything on port 8080. The images were not built on the development machine (no Docker there).

## Environment variables

See `.env.example`; every variable is described there.
