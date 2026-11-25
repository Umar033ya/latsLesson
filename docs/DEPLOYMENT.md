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
| `GOOGLE_CLIENT_ID` | optional, see below |
| `AI_PROVIDER`, `AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL` | optional |

4. **Deploy.** Production builds run `prisma migrate deploy`.
5. **Content and the first administrator.** The first production deploy fills an empty database with the official subjects, questions, lessons, campaigns and levels; later deploys leave them alone. For the platform owner add `SEED_PASSWORD` (strong) to the Vercel project and redeploy: it creates `super@lastlesson.dev` and the sample centers once. Then change the passwords in the panel and remove the variable. Sample access codes are never created in production.

## Several Vercel projects instead of one

`apps/web`, `game` and `apps/backend` also carry their own `vercel.json`, so projects whose Root Directory is one of these folders build too. The site then forwards `/api` and `/play` to the other two; their addresses are written in `apps/web/vercel.json` and `game/vercel.json`. One project with the repository root is simpler and shows the real address of each visitor to the rate limits.

## API on Render

New, Blueprint, this repository: `render.yaml` describes the service and lets Render generate the three secrets. Fill in the Neon strings, `WEB_ORIGIN` and `GAME_URL`, then put the Render address into the `/api` rewrite of `apps/web/vercel.json` and `game/vercel.json`. Migrations run when the container starts.

## Google sign-in (optional)

1. Google Cloud console, APIs and Services, Credentials, Create credentials, OAuth client ID, type "Web application".
2. Authorised JavaScript origins: `https://your-domain` and, for development, `http://localhost:5173`. No redirect URI is needed.
3. Put the client id into `GOOGLE_CLIENT_ID`. It is public; the client secret is not used.

Without the variable the button is hidden and everything else works.

What has been verified: `pnpm vercel:build` and the function entry `api/index.js` with production settings, locally. The first real deployment still has to be done.

## Docker

`docker compose up --build` with `POSTGRES_PASSWORD` and the three secrets in `.env` serves everything on port 8080. The images were not built on the development machine (no Docker there).

## Environment variables

See `.env.example`; every variable is described there.
