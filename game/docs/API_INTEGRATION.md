# API Integration

No backend is built for this prototype. `LocalDemoProvider` supplies offline JSON. `ApiProviderAdapter` is ready for a future HTTP service when `VITE_API_BASE_URL` is configured.

Proposed contracts: `GET /game/questions?subject=&difficulty=` returns `Question`; `POST /game/sessions` creates a session; `POST /game/sessions/:id/result` accepts `SessionResult`; `GET /game/campaigns/:id` returns assigned level metadata. Authentication and platform user context must remain outside Phaser scenes.
