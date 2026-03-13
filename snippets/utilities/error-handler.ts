/**
 * error-handler.ts — Typed error classes and async error utilities
 *
 * Stop using try/catch everywhere. Use these typed utilities to handle
 * errors consistently across your entire codebase.
 *
 * @example
 * // Instead of try/catch everywhere:
 * const [data, error] = await tryCatch(fetchUser(id));
 * if (error) return <ErrorState error={error} />;
 * return <UserProfile user={data} />;
 */

// ─── Typed Error Classes ──────────────────────────────────────────────────────

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(
    public field: string,
    message: string,
    context?: Record<string, unknown>
  ) {
    super(message, 'VALIDATION_ERROR', context);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 'AUTH_ERROR');
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'You do not have permission to perform this action') {
    super(message, 'AUTHORIZATION_ERROR');
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string | number) {
    super(
      id ? `${resource} with id "${id}" not found` : `${resource} not found`,
      'NOT_FOUND_ERROR',
      { resource, id }
    );
    this.name = 'NotFoundError';
  }
}

export class NetworkError extends AppError {
  constructor(message: string = 'Network request failed', public cause?: Error) {
    super(message, 'NETWORK_ERROR');
    this.name = 'NetworkError';
  }
}

export class RateLimitError extends AppError {
  constructor(public retryAfterMs?: number) {
    super(
      retryAfterMs
        ? `Rate limited. Retry after ${retryAfterMs}ms`
        : 'Rate limited. Please slow down.',
      'RATE_LIMIT_ERROR'
    );
    this.name = 'RateLimitError';
  }
}

// ─── Type Guards ──────────────────────────────────────────────────────────────

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

export function isAuthError(error: unknown): error is AuthenticationError {
  return error instanceof AuthenticationError;
}

export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError;
}

// ─── tryCatch — Go-style error handling ──────────────────────────────────────

/**
 * tryCatch — Wrap a promise in [data, error] tuple (Go-style)
 *
 * Eliminates nested try/catch blocks. Returns either [data, null] or [null, error].
 *
 * @example
 * const [user, error] = await tryCatch(userService.getById(id));
 * if (error) {
 *   if (isNotFoundError(error)) return res.status(404).json({ message: 'Not found' });
 *   return res.status(500).json({ message: 'Internal error' });
 * }
 * return res.json(user);
 */
export async function tryCatch<T>(
  promise: Promise<T>
): Promise<[T, null] | [null, Error]> {
  try {
    const data = await promise;
    return [data, null];
  } catch (error) {
    return [null, error instanceof Error ? error : new Error(String(error))];
  }
}

/**
 * tryCatchSync — Synchronous version of tryCatch
 *
 * @example
 * const [parsed, error] = tryCatchSync(() => JSON.parse(rawInput));
 * if (error) return defaultValue;
 */
export function tryCatchSync<T>(
  fn: () => T
): [T, null] | [null, Error] {
  try {
    return [fn(), null];
  } catch (error) {
    return [null, error instanceof Error ? error : new Error(String(error))];
  }
}

// ─── withRetry — Retry any async operation ───────────────────────────────────

interface RetryOptions {
  retries?: number;        // Default: 3
  delay?: number;          // Base delay in ms. Default: 1000
  backoff?: 'linear' | 'exponential'; // Default: 'exponential'
  shouldRetry?: (error: Error, attempt: number) => boolean;
  onRetry?: (error: Error, attempt: number) => void;
}

/**
 * withRetry — Retry any async operation with backoff
 *
 * @example
 * const data = await withRetry(() => unstableApiCall(), {
 *   retries: 3,
 *   delay: 1000,
 *   backoff: 'exponential',
 *   onRetry: (error, attempt) => console.log(`Retry ${attempt}:`, error.message),
 * });
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    retries = 3,
    delay = 1000,
    backoff = 'exponential',
    shouldRetry = () => true,
    onRetry,
  } = options;

  let lastError: Error;

  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt > retries) break;
      if (!shouldRetry(lastError, attempt)) break;

      onRetry?.(lastError, attempt);

      const waitMs =
        backoff === 'exponential'
          ? delay * Math.pow(2, attempt - 1)
          : delay * attempt;

      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }

  throw lastError!;
}

// ─── normalizeError — Convert anything to Error ───────────────────────────────

/**
 * normalizeError — Convert unknown caught values to Error instances
 *
 * TypeScript catch clauses give you `unknown`. Use this to safely
 * convert whatever was thrown to a proper Error object.
 *
 * @example
 * try {
 *   await riskyOperation();
 * } catch (unknown) {
 *   const error = normalizeError(unknown);
 *   console.error(error.message);
 * }
 */
export function normalizeError(error: unknown): Error {
  if (error instanceof Error) return error;
  if (typeof error === 'string') return new Error(error);
  if (typeof error === 'object' && error !== null) {
    const obj = error as Record<string, unknown>;
    if (typeof obj['message'] === 'string') return new Error(obj['message']);
  }
  return new Error(`Unknown error: ${JSON.stringify(error)}`);
}

// ─── getUserFriendlyMessage ────────────────────────────────────────────────────

/**
 * getUserFriendlyMessage — Convert error to user-facing message
 *
 * Maps typed errors to friendly UI messages. Keeps stack traces
 * and technical details out of the UI.
 *
 * @example
 * const message = getUserFriendlyMessage(error);
 * toast.error(message);
 */
export function getUserFriendlyMessage(error: unknown): string {
  if (error instanceof ValidationError) return error.message;
  if (error instanceof AuthenticationError) return 'Please sign in to continue.';
  if (error instanceof AuthorizationError) return "You don't have permission to do that.";
  if (error instanceof NotFoundError) return error.message;
  if (error instanceof RateLimitError) return 'Too many requests. Please wait a moment.';
  if (error instanceof NetworkError) return 'Connection error. Please check your internet.';
  if (error instanceof AppError) return error.message;
  if (error instanceof Error) return 'Something went wrong. Please try again.';
  return 'An unexpected error occurred.';
}
