/**
 * PRODUCTION ERROR HANDLING & RATE LIMITING
 * 
 * - API rate limiting (prevent abuse)
 * - Graceful error recovery
 * - Circuit breaker pattern
 * - Request validation
 * - Security headers
 */

import { Request, Response, NextFunction } from 'express';
import { RateLimiterMemory, RateLimiterRes } from 'rate-limiter-flexible';
import * as db from '../db';

/**
 * RATE LIMITERS
 */

// General API rate limit: 100 requests per minute per API key
const rateLimiterAPI = new RateLimiterMemory({
  points: 100,
  duration: 60,
});

// Lead ingestion: 1000 leads per minute per customer
const rateLimiterLeads = new RateLimiterMemory({
  points: 1000,
  duration: 60,
});

// Call initiation: 50 calls per minute per customer
const rateLimiterCalls = new RateLimiterMemory({
  points: 50,
  duration: 60,
});

// Webhook endpoints: 500 events per minute
const rateLimiterWebhooks = new RateLimiterMemory({
  points: 500,
  duration: 60,
});

/**
 * MIDDLEWARE: API Rate Limiting
 */
export async function rateLimitAPI(req: Request, res: Response, next: NextFunction) {
  try {
    const apiKey = req.headers['authorization']?.replace('Bearer ', '') || req.ip;

    await rateLimiterAPI.consume(apiKey);
    next();
  } catch (err) {
    if (err instanceof RateLimiterRes) {
      const retryAfter = Math.round(err.remainingPoints === 0 ? err.msBeforeNext / 1000 : 60);
      res.set('Retry-After', retryAfter.toString());

      return res.status(429).json({
        error: 'Too many requests',
        retryAfter,
      });
    }

    next(err);
  }
}

/**
 * MIDDLEWARE: Lead Ingestion Rate Limit
 */
export async function rateLimitLeads(req: Request, res: Response, next: NextFunction) {
  try {
    const customerId = (req as any).customerId || req.ip;

    await rateLimiterLeads.consume(customerId);
    next();
  } catch (err) {
    if (err instanceof RateLimiterRes) {
      return res.status(429).json({
        error: 'Lead ingestion limit exceeded',
        message: 'Too many leads being processed. Please try again later.',
      });
    }

    next(err);
  }
}

/**
 * MIDDLEWARE: Call Initiation Rate Limit
 */
export async function rateLimitCalls(req: Request, res: Response, next: NextFunction) {
  try {
    const customerId = (req as any).customerId;

    if (!customerId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await rateLimiterCalls.consume(customerId);
    next();
  } catch (err) {
    if (err instanceof RateLimiterRes) {
      return res.status(429).json({
        error: 'Call rate limit exceeded',
        message: 'Too many calls being made. Please try again later.',
      });
    }

    next(err);
  }
}

/**
 * MIDDLEWARE: Webhook Rate Limiting
 */
export async function rateLimitWebhooks(req: Request, res: Response, next: NextFunction) {
  try {
    const provider = req.path.split('/')[2]; // /webhooks/{provider}

    await rateLimiterWebhooks.consume(provider);
    next();
  } catch (err) {
    if (err instanceof RateLimiterRes) {
      // Still process webhook but log as throttled
      console.warn(`[Webhooks] Throttled: ${provider}`);
      next();
    }
  }
}

/**
 * CIRCUIT BREAKER PATTERN
 * Prevent cascading failures
 */
interface CircuitState {
  failures: number;
  lastFailureTime: number;
  state: 'closed' | 'open' | 'half-open';
}

const circuitBreakers = new Map<string, CircuitState>();

const FAILURE_THRESHOLD = 5; // Failures before opening
const RESET_TIMEOUT = 60000; // 1 minute

export function getCircuitBreakerState(service: string): CircuitState {
  if (!circuitBreakers.has(service)) {
    circuitBreakers.set(service, {
      failures: 0,
      lastFailureTime: 0,
      state: 'closed',
    });
  }

  const state = circuitBreakers.get(service)!;

  // If open, try half-open after timeout
  if (state.state === 'open' && Date.now() - state.lastFailureTime > RESET_TIMEOUT) {
    state.state = 'half-open';
    state.failures = 0;
  }

  return state;
}

export function recordSuccess(service: string) {
  const state = getCircuitBreakerState(service);

  if (state.state === 'half-open') {
    state.state = 'closed';
    state.failures = 0;
  }
}

export function recordFailure(service: string) {
  const state = getCircuitBreakerState(service);
  state.failures++;
  state.lastFailureTime = Date.now();

  if (state.failures >= FAILURE_THRESHOLD) {
    state.state = 'open';
  }
}

export function isCircuitOpen(service: string): boolean {
  const state = getCircuitBreakerState(service);
  return state.state === 'open';
}

/**
 * ERROR CLASSES
 */

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

export class ForbiddenError extends APIError {
  constructor(message: string = 'Forbidden') {
    super(403, message, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

export class ConflictError extends APIError {
  constructor(message: string = 'Conflict') {
    super(409, message, 'CONFLICT');
    this.name = 'ConflictError';
  }
}

/**
 * GLOBAL ERROR HANDLER MIDDLEWARE
 */
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  console.error('[Error]', {
    name: err.name,
    message: err.message,
    status: err.statusCode || 500,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
  });

  if (err instanceof APIError) {
    return res.status(err.statusCode).json({
      error: err.code,
      message: err.message,
      ...(err instanceof ValidationError && { fields: err.fields }),
    });
  }

  // Unhandled error
  res.status(500).json({
    error: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred',
    ...(process.env.NODE_ENV === 'development' && { details: err.message }),
  });
}

/**
 * TIMEOUT HANDLER
 * Prevent requests from hanging
 */
export function timeoutHandler(seconds: number = 30) {
  return (req: Request, res: Response, next: NextFunction) => {
    const timeoutId = setTimeout(() => {
      if (!res.headersSent) {
        res.status(408).json({
          error: 'REQUEST_TIMEOUT',
          message: `Request exceeded ${seconds}s timeout`,
        });
      }
    }, seconds * 1000);

    res.on('finish', () => clearTimeout(timeoutId));
    res.on('close', () => clearTimeout(timeoutId));

    next();
  };
}

/**
 * SECURITY HEADERS MIDDLEWARE
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // Prevent MIME sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // XSS Protection
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Content Security Policy
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'");

  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // CORS
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGINS || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  next();
}

/**
 * INPUT VALIDATION HELPER
 */
export function validateInput(data: any, schema: Record<string, any>): Record<string, any> {
  const errors: Record<string, string[]> = {};

  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field];

    if (rules.required && !value) {
      errors[field] = errors[field] || [];
      errors[field].push(`${field} is required`);
    }

    if (rules.type && value && typeof value !== rules.type) {
      errors[field] = errors[field] || [];
      errors[field].push(`${field} must be ${rules.type}`);
    }

    if (rules.minLength && value && value.length < rules.minLength) {
      errors[field] = errors[field] || [];
      errors[field].push(`${field} must be at least ${rules.minLength} characters`);
    }

    if (rules.maxLength && value && value.length > rules.maxLength) {
      errors[field] = errors[field] || [];
      errors[field].push(`${field} must not exceed ${rules.maxLength} characters`);
    }

    if (rules.pattern && value && !rules.pattern.test(value)) {
      errors[field] = errors[field] || [];
      errors[field].push(`${field} has invalid format`);
    }

    if (rules.email && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      errors[field] = errors[field] || [];
      errors[field].push(`${field} must be a valid email`);
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Input validation failed', errors);
  }

  return data;
}

export default {
  rateLimitAPI,
  rateLimitLeads,
  rateLimitCalls,
  rateLimitWebhooks,
  errorHandler,
  timeoutHandler,
  securityHeaders,
  validateInput,
  getCircuitBreakerState,
  recordSuccess,
  recordFailure,
  isCircuitOpen,
};
