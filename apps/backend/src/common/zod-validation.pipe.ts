import { Injectable, PipeTransform } from '@nestjs/common';
import { z, ZodType } from 'zod';
import { invalid, notFound } from './errors';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodType) {}

  transform(value: unknown): unknown {
    const result = this.schema.safeParse(value ?? {});
    if (result.success) return result.data;
    const first = result.error.issues[0];
    const field = first.path.join('.');
    throw invalid(field ? `${field}: ${first.message}` : first.message, { fields: result.error.flatten().fieldErrors });
  }
}

export const zodPipe = (schema: ZodType) => new ZodValidationPipe(schema);

const isUuid = (value: unknown) => z.string().uuid().safeParse(value).success;

/** Rejects anything that is not a uuid before it reaches the database. */
export class IdPipe implements PipeTransform {
  transform(value: unknown): string {
    if (!isUuid(value)) throw notFound('Record');
    return value as string;
  }
}

/** Same, for optional query parameters. */
export class OptionalIdPipe implements PipeTransform {
  transform(value: unknown): string | undefined {
    if (value === undefined || value === '') return undefined;
    if (!isUuid(value)) throw invalid('Invalid identifier');
    return value as string;
  }
}
