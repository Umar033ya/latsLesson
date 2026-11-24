import { Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

const logger = new Logger('Http');

/** Logs method, path, status and duration. Bodies, tokens and query strings are never logged. */
export function requestLog(req: Request & { requestId?: string }, res: Response, next: NextFunction) {
  const started = process.hrtime.bigint();
  req.requestId = randomUUID();
  res.setHeader('X-Request-Id', req.requestId);
  res.on('finish', () => {
    if (process.env.NODE_ENV === 'test') return;
    const ms = Number(process.hrtime.bigint() - started) / 1e6;
    const line = `${req.method} ${req.originalUrl.split('?')[0]} ${res.statusCode} ${ms.toFixed(0)}ms ${req.requestId}`;
    if (res.statusCode >= 500) logger.error(line);
    else if (res.statusCode >= 400) logger.warn(`${line} ${res.locals?.errorCode ?? ''}`);
    else logger.log(line);
  });
  next();
}
