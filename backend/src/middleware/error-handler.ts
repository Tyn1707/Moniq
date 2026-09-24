import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { isProduction, isTest } from '../config/env';
import { AppError } from '../utils/app-error';

export const notFoundHandler = (req: Request, _res: Response, next: NextFunction): void => {
  next(AppError.notFound(`Route ${req.method} ${req.originalUrl} does not exist.`));
};

interface ErrorBody {
  error: {
    message: string;
    code: string;
    details?: unknown;
  };
}

/** Map known Prisma failures onto user-safe HTTP errors. */
const fromPrisma = (error: Prisma.PrismaClientKnownRequestError): AppError => {
  switch (error.code) {
    case 'P2002':
      return AppError.conflict('That record already exists.');
    case 'P2003':
      return AppError.badRequest('Related record not found.');
    case 'P2025':
      return AppError.notFound('Resource not found.');
    default:
      return new AppError(500, 'Something went wrong. Please try again.', 'DATABASE_ERROR');
  }
};

/**
 * Terminal error handler. Unexpected errors are logged server-side but the
 * client only ever receives a generic message — no stack traces, no SQL,
 * no internal identifiers (brief §29).
 */
export const errorHandler = (
  error: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (res.headersSent) {
    next(error);
    return;
  }

  let appError: AppError;

  if (error instanceof AppError) {
    appError = error;
  } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    appError = fromPrisma(error);
  } else if (error instanceof Prisma.PrismaClientValidationError) {
    appError = AppError.badRequest('Invalid request data.');
  } else if (error instanceof SyntaxError && 'body' in error) {
    appError = AppError.badRequest('Request body is not valid JSON.');
  } else {
    appError = new AppError(500, 'Something went wrong. Please try again.', 'INTERNAL_ERROR');
  }

  if (appError.statusCode >= 500 && !isTest) {
    console.error('[error]', error);
  }

  const body: ErrorBody = {
    error: {
      message: appError.message,
      code: appError.code,
    },
  };

  if (appError.details !== undefined) {
    body.error.details = appError.details;
  }

  // Extra diagnostics for developers, never in production.
  if (!isProduction && appError.statusCode >= 500 && error instanceof Error) {
    body.error.details = { debug: error.message };
  }

  res.status(appError.statusCode).json(body);
};
