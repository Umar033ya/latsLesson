import { ArgumentMetadata, BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { ZodType } from 'zod';

export function zodPipe(schema: ZodType) {
  return new ZodValidationPipe(schema);
}

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodType) {}

  transform(value: unknown, metadata: ArgumentMetadata): unknown {
    if (metadata.type === 'body' || metadata.type === 'query' || metadata.type === 'param') {
      const result = this.schema.safeParse(value);
      if (!result.success) {
        throw new BadRequestException({
          message: 'Validation failed',
          errors: result.error.flatten().fieldErrors,
        });
      }
      return result.data;
    }
    return value;
  }
}
