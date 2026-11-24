// Tests always use their own database; it is wiped before the run.
const url = process.env.TEST_DATABASE_URL || 'postgresql://lastlesson:lastlesson@127.0.0.1:5433/lastlesson_test?schema=public';
Object.assign(process.env, {
  NODE_ENV: 'test',
  DATABASE_URL: url,
  DATABASE_URL_UNPOOLED: url,
  JWT_ACCESS_SECRET: 'test-access-secret-test-access-secret-01',
  GAME_TOKEN_SECRET: 'test-game-secret-test-game-secret-0000002',
  CODE_PEPPER: 'test-pepper-test-pepper-test-pepper-0003',
  WEB_ORIGIN: 'http://localhost:5173',
  SWAGGER_ENABLED: 'false',
  AI_PROVIDER: 'local',
});
