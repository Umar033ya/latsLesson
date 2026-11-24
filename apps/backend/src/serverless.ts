import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { AppModule } from './app.module';
import { setupApp } from './app.setup';

type Handler = (req: IncomingMessage, res: ServerResponse) => void;
let cached: Promise<Handler> | null = null;

async function boot(): Promise<Handler> {
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
  (await cached)(req, res);
}
