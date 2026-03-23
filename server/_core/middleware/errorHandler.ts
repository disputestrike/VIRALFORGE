/**
 * ERROR HANDLER - FIXED
 * Placeholder implementation
 */

import { Request, Response, NextFunction } from 'express';

export class APIError extends Error {
  constructor(public statusCode: number, message: string, public code: string = 'UNKNOWN_ERROR') {
    super(message);
    this.name = 'APIError';
  }
}

export class ValidationError extends APIError {
  constructor(message: string, public fields?: Record<string, string[]>) {
    super(400, message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends APIError {
  constructor(message: string = 'Resource not found') {
    super(404, message, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends APIError {
  constructor(message: string = 'Unauthorized') {
    super(401, message, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  console.error('[Error]', {
    name: err.name,
    message: err.message,
    status: err.statusCode || 500,
    path: req.path,
    timestamp: new Date().toISOString(),
  });

  if (err instanceof APIError) {
    return res.status(err.statusCode).json({
      error: err.code,
      message: err.message,
      ...(err instanceof ValidationError && { fields: err.fields }),
    });
  }

  res.status(500).json({
    error: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred',
  });
}

export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
}

export function validateInput(data: any, schema: Record<string, any>): Record<string, any> {
  const errors: Record<string, string[]> = {};

  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field];

    if (rules.required && !value) {
      errors[field] = errors[field] || [];
      errors[field].push(`${field} is required`);
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Input validation failed', errors);
  }

  return data;
}

export default {
  errorHandler,
  securityHeaders,
  validateInput,
};
