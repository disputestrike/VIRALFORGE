/**
 * Base HTTP error class with status code.
 * Throw this from route handlers to send specific HTTP errors.
 */
export class HttpError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "HttpError";
  }
}

// Convenience error classes
export class BadRequestError extends HttpError {
  constructor(msg: string) { super(400, msg); this.name = "BadRequestError"; }
}
export class UnauthorizedError extends HttpError {
  constructor(msg: string) { super(401, msg); this.name = "UnauthorizedError"; }
}
export class ForbiddenError extends HttpError {
  constructor(msg: string) { super(403, msg); this.name = "ForbiddenError"; }
}
export class NotFoundError extends HttpError {
  constructor(msg: string) { super(404, msg); this.name = "NotFoundError"; }
}
