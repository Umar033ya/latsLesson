# Security checklist

| Item | State | Where / proof |
| --- | --- | --- |
| Password hashing | argon2id | `auth.service.ts` |
| Session handling | 15 min access token in memory; rotating refresh token in an httpOnly SameSite cookie; reuse closes the family | tests: authentication |
| CSRF | Cookie endpoints need `X-LL-Client` and a known Origin; all others need a bearer token | tests: authentication |
| Brute force | Database-backed limits count wrong guesses (a whole class may share one address) under an atomic ceiling on all attempts; account lock after 8 failures; decoy hash for unknown accounts | tests: authentication |
| Authorization | Deny by default: every controller names its roles | `guards.ts` |
| Tenant isolation | `resolveOrg`, `hostOrg`, `studentOrg`, ownership checks; foreign ids answer 404 | tests: tenant isolation |
| Role escalation | The role is never read from a request: a code creates a student, center registration creates the admin of a new trial center, only admins create teachers | tests: registration, teachers |
| Account takeover | An access code can add an e-mail only in the center that owns the profile; linking Google needs the password; a Google e-mail is never matched to a password account | tests: profile ownership, google sign-in |
| Google sign-in | ID token checked on the server by the official library: signature, audience, expiry, verified e-mail | `google-identity.ts` |
| Rooms | Separate token audience, six-digit codes valid only while open, counted guesses, phrases from a fixed list, nicknames limited to letters and digits, race time by the server clock | tests: rooms |
| Access codes | 40 random bits, stored as HMAC with a server secret, expiry, use limit (atomic), revocation | tests: student access codes |
| Input validation | zod on every body and query; uuid pipes on ids; 1 MB body limit | tests |
| SQL injection | Prisma; raw SQL only through tagged templates | `analytics.service.ts`, `rate-limit.ts` |
| XSS | React and `textContent` only; no HTML injection; logos limited to https or PNG/JPEG/WebP data; CSP in `vercel.json` | tests: rejects script-like logos |
| CSV export | Cells that start a formula are neutralised | `results.tsx` |
| Uploads | Logo only: type and size checked on both sides, never SVG | `validation/index.ts` |
| Secrets | Only in environment variables; the API refuses weak or missing secrets in production | `config.ts`, tests |
| AI key | Server side only; replies are validated; 20 s timeout; fallback to prepared notes | `study-guide.provider.ts` |
| Game integrity | Server grading, idempotency, attempt limits, gate order, one-time tickets, recomputed scores, flags | tests: game session |
| Errors | One shape, no stacks or SQL | `http-exception.filter.ts` |
| Logs | Method, path, status, duration, request id. No bodies, tokens or query strings | `request-log.middleware.ts` |
| Audit log | Administrative, sign-in and security events | `/audit-logs`, `/admin/security` |
| Children's data | Students are a name and results. No e-mail, no password, no tracking | data model |

## Dependency audit (24 November 2026)

`pnpm audit --prod` went from 30 findings to 4. Remaining:

| Package | Severity | Why it stays |
| --- | --- | --- |
| `deepmerge-ts` (inside the Prisma CLI) | high | Build-time tool, merges our own config only. Fixed by a Prisma major update. |
| `@nestjs/core` 10 | moderate | Fixed in Nest 11 (Express 5 migration). The affected server-sent events are not used. |
| `file-type` (2 findings, inside Nest 10) | moderate | Only used by Nest's file validator, which is not used. |

## Before production

- [ ] Generate new values for `JWT_ACCESS_SECRET`, `GAME_TOKEN_SECRET`, `CODE_PEPPER`.
- [ ] Set `NODE_ENV=production`, `WEB_ORIGIN`, `GAME_URL`, `TRUST_PROXY=1`, `SWAGGER_ENABLED=false`.
- [ ] Run the seed with a strong `SEED_PASSWORD` once, then change it in the panel.
- [ ] Changing `CODE_PEPPER` invalidates every access code: plan it.
- [ ] Turn on Neon point-in-time restore.
