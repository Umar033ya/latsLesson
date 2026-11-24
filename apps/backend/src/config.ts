/** Names the variables that are missing or unsafe, never their values. */
export class ConfigError extends Error {}

/** Fails fast on unsafe configuration instead of running with weak secrets. */
export function assertConfig(env: NodeJS.ProcessEnv = process.env) {
  const secrets = ['JWT_ACCESS_SECRET', 'GAME_TOKEN_SECRET', 'CODE_PEPPER'];
  const problems = ['DATABASE_URL', ...secrets].filter((key) => !env[key]).map((key) => `${key} is not set`);
  if (env.NODE_ENV === 'production') {
    for (const key of secrets) {
      if ((env[key] ?? '').length < 32) problems.push(`${key} must be at least 32 characters`);
      if (/change-me|^dev-/i.test(env[key] ?? '')) problems.push(`${key} looks like a placeholder`);
    }
    if (!env.WEB_ORIGIN) problems.push('WEB_ORIGIN is not set');
  }
  if (env.JWT_ACCESS_SECRET && env.JWT_ACCESS_SECRET === env.GAME_TOKEN_SECRET) problems.push('JWT_ACCESS_SECRET and GAME_TOKEN_SECRET must differ');
  if (problems.length) throw new ConfigError(`Invalid configuration:\n - ${problems.join('\n - ')}`);
}

export const webOrigins = () =>
  (process.env.WEB_ORIGIN ?? 'http://localhost:5173,http://localhost:5174')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
