import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';

const STATUS_CODES: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHENTICATED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  413: 'TOO_LARGE',
  429: 'RATE_LIMITED',
};

const PRISMA_ERRORS: Record<string, [number, string, string]> = {
  P2002: [409, 'CONFLICT', 'A record with these values already exists'],
  P2025: [404, 'NOT_FOUND', 'Record not found'],
  P2003: [409, 'CONFLICT', 'This record is still in use'],
  P2023: [400, 'VALIDATION_FAILED', 'Invalid identifier'],
};

/** Single error shape: { error: { code, message, details?, requestId } }. Never leaks stacks or SQL. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Api');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse();
    const req = ctx.getRequest();
    const requestId = req.requestId;
    let status = 500;
    let code = 'INTERNAL';
    let message = 'Something went wrong on our side. Please try again.';
    let details: unknown;

    if (exception instanceof ZodError) {
      [status, code, message] = [400, 'VALIDATION_FAILED', exception.issues[0]?.message ?? 'Check the highlighted fields'];
      details = { fields: exception.flatten().fieldErrors };
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse() as any;
      code = body?.code ?? STATUS_CODES[status] ?? 'ERROR';
      message = typeof body === 'string' ? body : Array.isArray(body?.message) ? body.message.join(', ') : (body?.message ?? exception.message);
      details = body?.details;
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError && PRISMA_ERRORS[exception.code]) {
      [status, code, message] = PRISMA_ERRORS[exception.code];
    } else if ((exception as any)?.type === 'entity.too.large') {
      [status, code, message] = [413, 'TOO_LARGE', 'The request is too large'];
    } else if ((exception as any)?.type === 'entity.parse.failed') {
      [status, code, message] = [400, 'BAD_REQUEST', 'The request is not valid JSON'];
    }

    if (status >= 500) this.logger.error(`[${requestId}] ${req.method} ${req.path} ${(exception as Error)?.stack ?? exception}`);
    res.locals.errorCode = code;
    res.status(status).json({ error: { code, message, ...(details ? { details } : {}), requestId } });
  }
}
