import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { AppModule } from './app.module';
import { setupApp } from './app.setup';
import { assertConfig, ConfigError } from './config';

type Handler = (req: IncomingMessage, res: ServerResponse) => void;
let cached: Promise<Handler> | null = null;

async function boot(): Promise<Handler> {
  assertConfig();
  const app = await NestFactory.create(AppModule, { bodyParser: false, logger: ['error', 'warn', 'log'] });
  setupApp(app);
  await app.init();
  return app.getHttpAdapter().getInstance();
}

/** Vercel function entry. The Nest application is reused while the instance stays warm. */
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  cached ??= boot().catch((error) => {
    cached = null;
    throw error;
  });
  try {
    (await cached)(req, res);
  } catch (error) {
    // A missing variable is reported by name instead of as an anonymous crash of the function. Values are never shown.
    const message = error instanceof ConfigError ? error.message : 'The server could not start. See the function log.';
    console.error(error);
    res.writeHead(503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: { code: 'NOT_CONFIGURED', message } }));
  }
}
