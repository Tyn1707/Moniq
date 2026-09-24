import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ZodError, type ZodTypeAny, type z } from 'zod';
import { AppError } from '../utils/app-error';

type Source = 'body' | 'query' | 'params';

export interface FieldError {
  field: string;
  message: string;
}

const toFieldErrors = (error: ZodError): FieldError[] =>
  error.issues.map((issue) => ({
    field: issue.path.join('.') || '_root',
    message: issue.message,
  }));

/**
 * Validates and *replaces* the given request section with the parsed result, so
 * downstream handlers receive coerced, trimmed, fully-typed values and can
 * never accidentally read an unvalidated field.
 */
export const validate =
  <T extends ZodTypeAny>(schema: T, source: Source = 'body'): RequestHandler =>
  (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const fieldErrors = toFieldErrors(result.error);
      const firstMessage = fieldErrors[0]?.message ?? 'Invalid request.';
      next(AppError.validation(firstMessage, fieldErrors));
      return;
    }
    Object.defineProperty(req, source, { value: result.data, writable: true, configurable: true });
    next();
  };

/** Typed accessor for a validated request section. */
export const validated = <T extends ZodTypeAny>(value: unknown): z.infer<T> => value as z.infer<T>;
