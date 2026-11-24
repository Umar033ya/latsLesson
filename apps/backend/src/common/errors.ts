import { HttpException, HttpStatus } from '@nestjs/common';

/** Every error the API returns has a stable machine-readable code and a message safe to show to a person. */
export class ApiException extends HttpException {
  constructor(
    readonly code: string,
    message: string,
    status: number = HttpStatus.BAD_REQUEST,
    readonly details?: Record<string, unknown>,
  ) {
    super({ code, message, details }, status);
  }
}

export const notFound = (what: string) => new ApiException('NOT_FOUND', `${what} was not found`, 404);
export const forbidden = (message = 'You do not have access to this') => new ApiException('FORBIDDEN', message, 403);
export const conflict = (message: string) => new ApiException('CONFLICT', message, 409);
export const invalid = (message: string, details?: Record<string, unknown>) => new ApiException('VALIDATION_FAILED', message, 400, details);
