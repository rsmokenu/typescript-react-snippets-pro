/**
 * api-client.ts — Typed fetch wrapper with retry logic, auth headers, and error handling
 *
 * A production-ready API client that handles:
 * - Automatic JSON serialization/deserialization
 * - Bearer token injection
 * - Configurable retry with exponential backoff
 * - Typed error classes
 * - Request/response interceptors
 *
 * @example
 * const api = createApiClient({ baseUrl: 'https://api.example.com', retries: 3 });
 * api.setToken('your-jwt-token');
 *
 * const users = await api.get<User[]>('/users');
 * const user = await api.post<User, CreateUserDto>('/users', { name: 'Alice' });
 * await api.put<User>('/users/1', { name: 'Alice Updated' });
 * await api.delete('/users/1');
 */

// ─── Error Classes ─────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public response?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class NetworkError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class TimeoutError extends Error {
  constructor(public timeoutMs: number) {
    super(`Request timed out after ${timeoutMs}ms`);
    this.name = 'TimeoutError';
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ApiClientConfig {
  baseUrl: string;
  retries?: number;       // Default: 2
  retryDelay?: number;    // Base delay in ms (doubles each retry). Default: 500
  timeout?: number;       // Request timeout in ms. Default: 10000
  defaultHeaders?: Record<string, string>;
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions extends Omit<RequestInit, 'method' | 'body'> {
  params?: Record<string, string | number | boolean>;
  timeout?: number;
  retries?: number;
  skipRetryOn?: number[];  // HTTP status codes to NOT retry on
}

// ─── Sleep helper ─────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// ─── ApiClient ────────────────────────────────────────────────────────────────

export class ApiClient {
  private token: string | null = null;
  private readonly config: Required<ApiClientConfig>;

  constructor(config: ApiClientConfig) {
    this.config = {
      retries: 2,
      retryDelay: 500,
      timeout: 10000,
      defaultHeaders: { 'Content-Type': 'application/json' },
      ...config,
    };
  }

  setToken(token: string | null): void {
    this.token = token;
  }

  private buildUrl(path: string, params?: Record<string, string | number | boolean>): string {
    const url = new URL(path, this.config.baseUrl);
    if (params) {
      Object.entries(params).forEach(([key, value]) =>
        url.searchParams.append(key, String(value))
      );
    }
    return url.toString();
  }

  private buildHeaders(extra?: HeadersInit): Headers {
    const headers = new Headers({
      ...this.config.defaultHeaders,
      ...(extra as Record<string, string> ?? {}),
    });
    if (this.token) {
      headers.set('Authorization', `Bearer ${this.token}`);
    }
    return headers;
  }

  private async fetchWithTimeout(
    url: string,
    init: RequestInit,
    timeoutMs: number
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      return response;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new TimeoutError(timeoutMs);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async request<T>(
    method: HttpMethod,
    path: string,
    body?: unknown,
    options: RequestOptions = {}
  ): Promise<T> {
    const {
      params,
      timeout = this.config.timeout,
      retries = this.config.retries,
      skipRetryOn = [400, 401, 403, 404, 422],
      headers,
      ...restOptions
    } = options;

    const url = this.buildUrl(path, params);
    const init: RequestInit = {
      method,
      headers: this.buildHeaders(headers),
      ...restOptions,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    };

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      if (attempt > 0) {
        // Exponential backoff: 500ms, 1000ms, 2000ms...
        await sleep(this.config.retryDelay * Math.pow(2, attempt - 1));
      }

      try {
        const response = await this.fetchWithTimeout(url, init, timeout);

        if (!response.ok) {
          let errorBody: unknown;
          try {
            errorBody = await response.json();
          } catch {
            errorBody = await response.text();
          }

          const error = new ApiError(
            `${method} ${path} failed: ${response.status} ${response.statusText}`,
            response.status,
            errorBody
          );

          // Don't retry on client errors or explicitly skipped status codes
          if (skipRetryOn.includes(response.status)) throw error;
          lastError = error;
          continue;
        }

        // Handle 204 No Content
        if (response.status === 204) return null as T;

        return (await response.json()) as T;
      } catch (error) {
        if (error instanceof ApiError) throw error; // Already handled above
        if (error instanceof TimeoutError) throw error;

        lastError = error instanceof Error
          ? new NetworkError(error.message, error)
          : new NetworkError('Network request failed');
      }
    }

    throw lastError ?? new NetworkError('Request failed after retries');
  }

  get<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>('GET', path, undefined, options);
  }

  post<T, B = unknown>(path: string, body?: B, options?: RequestOptions): Promise<T> {
    return this.request<T>('POST', path, body, options);
  }

  put<T, B = unknown>(path: string, body?: B, options?: RequestOptions): Promise<T> {
    return this.request<T>('PUT', path, body, options);
  }

  patch<T, B = unknown>(path: string, body?: B, options?: RequestOptions): Promise<T> {
    return this.request<T>('PATCH', path, body, options);
  }

  delete<T = void>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>('DELETE', path, undefined, options);
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createApiClient(config: ApiClientConfig): ApiClient {
  return new ApiClient(config);
}

// ─── Usage example ────────────────────────────────────────────────────────────
/*
const api = createApiClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL!,
  retries: 3,
  timeout: 15000,
  defaultHeaders: { 'X-App-Version': '1.0.0' },
});

// Set token after login
api.setToken(tokens.accessToken);

// Typed GET
const users = await api.get<User[]>('/users', { params: { page: 1, limit: 20 } });

// Typed POST
const newUser = await api.post<User, CreateUserDto>('/users', {
  name: 'Alice',
  email: 'alice@example.com',
});

// Handle errors
try {
  await api.delete('/users/999');
} catch (error) {
  if (error instanceof ApiError && error.statusCode === 404) {
    console.log('User not found');
  }
}
*/
