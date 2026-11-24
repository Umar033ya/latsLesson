# API

Base path `/api/v1`. Interactive documentation: `/api/docs` when `SWAGGER_ENABLED=true`.

Errors always look like `{ "error": { "code", "message", "details?", "requestId" } }`. Lists that can grow return `{ total, page, pageSize, items }`.

| Area | Endpoints | Who |
| --- | --- | --- |
| Authentication | `POST /auth/login`, `/auth/code`, `/auth/refresh`, `/auth/logout`, `/auth/change-password`, `GET /auth/me` | public / signed in |
| Centers | `GET, POST /organizations`, `GET, PATCH /organizations/:id`, `PATCH /organizations/:id/status` | super admin |
| Administrators | `GET, POST /users/admins`, `POST /users/:id/assign`, `PATCH /users/:id/status`, `POST /users/:id/reset-password` | super admin |
| Platform | `GET, PUT /admin/settings`, `/admin/plans`, `GET /admin/security`, `GET /analytics/platform` | super admin |
| Own center | `GET /center/dashboard`, `GET, PATCH /center/profile`, `PUT /center/settings` | center admin |
| Students, groups | `/center/students` (+ `/bulk`, `/:id/code`), `/center/groups` (+ `/:id/campaigns`) | center admin |
| Access codes | `GET, POST /invitations`, `POST /invitations/:id/regenerate`, `/revoke`, `PATCH /invitations/:id` | center admin |
| Content | `/questions` (+ `/import`, `/export`), `/collections`, `/materials`, `/subjects` | center admin, super admin |
| Campaigns | `/campaigns` (+ `/check`, `/:id/preview`, `/publish`, `/unpublish`, `/duplicate`) | center admin, super admin |
| Results | `GET /game-results/organization`, `/game-results/mine`, `/game-results/:id/review`, `GET /analytics/organization` | by role |
| Student | `GET /student/home`, `/student/progress`, `/ai-preparation` (+ `/:id/practice`) | student |
| Sessions | `POST /game-sessions/launch`, `/:id/resume`, `/:id/abandon`, `GET /game-sessions/history` | student |
| Game client | `POST /play/exchange`, `GET /play/session`, `POST /play/answers`, `/play/hint`, `PUT /play/checkpoint`, `POST /play/complete` | game token |
| Game configuration | `GET /games/config` | signed in |
| Audit | `GET /audit-logs` | center admin (own), super admin |

Super admins add `?organizationId=` to center endpoints. Center admins are always limited to their own center.

Codes worth handling: `CODE_INVALID`, `CODE_EXPIRED`, `CODE_REVOKED`, `CODE_USED_UP`, `ACCESS_DISABLED`, `CENTER_SUSPENDED`, `SUBSCRIPTION_ENDED`, `PLAN_LIMIT`, `FEATURE_DISABLED`, `NOT_ENOUGH_QUESTIONS`, `CAMPAIGN_UNAVAILABLE`, `GAME_DISABLED`, `TICKET_INVALID`, `GAME_TOKEN_INVALID`, `GATE_LOCKED`, `ALREADY_RESOLVED`, `SESSION_FINISHED`, `SESSION_EXPIRED`, `RATE_LIMITED`.

## Question formats

| Type | `options` | `correctAnswer` |
| --- | --- | --- |
| `MULTIPLE_CHOICE` (one answer) | `[{id, text}]`, 2 to 6 | `"id"` |
| `MULTI_SELECT` | `[{id, text}]`, 3 to 6 | `["id"]` |
| `TRUE_FALSE` | `{}` | `true` / `false` |
| `TEXT` | `{}` | accepted answers `["…"]` |
| `MATCHING` | `{left: [], right: []}` | `{leftId: rightId}` |
| `ORDERING` | `{items: []}` | ids in order |
| `PUZZLE` (dials) | `{dials: [["A","T"], …]}` | one symbol per dial |
