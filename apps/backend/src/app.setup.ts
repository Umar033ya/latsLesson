import { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AllExceptionsFilter } from './common/http-exception.filter';
import { requestLog } from './common/request-log.middleware';
import { assertConfig, webOrigins } from './config';

export const API_PREFIX = 'api/v1';

/** Shared by the long-running server, the Vercel function and the tests. */
export function setupApp(app: INestApplication) {
  assertConfig();
  const express = app.getHttpAdapter().getInstance();
  express.set('trust proxy', Number(process.env.TRUST_PROXY ?? (process.env.VERCEL ? 1 : 0)));
  express.disable('x-powered-by');
  app.use(requestLog);
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cookieParser());
  (app as NestExpressApplication).useBodyParser('json', { limit: '1mb' });
  app.enableCors({ origin: webOrigins(), credentials: true, maxAge: 600 });
  app.useGlobalFilters(new AllExceptionsFilter());
  app.setGlobalPrefix(API_PREFIX, { exclude: ['health'] });

  if (process.env.SWAGGER_ENABLED === 'true' && !process.env.VERCEL) {
    const config = new DocumentBuilder()
      .setTitle('LAST LESSON API')
      .setDescription('Multi-tenant API for education centers, students and the LAST LESSON game.')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config));
  }
  return app;
}
