/**
 * HTTP client.
 *
 * One place that knows how to talk to the API: it always sends credentials (so
 * the httpOnly auth cookie travels with every request) and always converts a
 * non-2xx response into an `ApiError` carrying the server's user-safe message.
 * Components therefore never parse raw responses or invent their own wording.
 */

export interface FieldError {
  field: string;
  message: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fieldErrors: FieldError[];

  constructor(status: number, message: string, code = 'ERROR', fieldErrors: FieldError[] = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }
}

const BASE_URL = '/api';

const isFieldErrorArray = (value: unknown): value is FieldError[] =>
  Array.isArray(value) &&
  value.every(
    (item) =>
      typeof item === 'object' && item !== null && 'field' in item && 'message' in item,
  );

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  signal?: AbortSignal;
}

const buildUrl = (path: string, query?: RequestOptions['query']): string => {
  const url = `${BASE_URL}${path}`;
  if (!query) return url;

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    params.set(key, String(value));
  }
  const search = params.toString();
  return search ? `${url}?${search}` : url;
};

export const apiRequest = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const { method = 'GET', body, query, signal } = options;

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      // Required for the auth cookie.
      credentials: 'include',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    // Offline, DNS failure, server down — anything before an HTTP status.
    throw new ApiError(0, 'Cannot reach the server. Check your connection and try again.', 'NETWORK_ERROR');
  }

  if (response.status === 204) return undefined as T;

  let payload: unknown = null;
  const text = await response.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const errorPayload =
      typeof payload === 'object' && payload !== null && 'error' in payload
        ? (payload as { error: { message?: string; code?: string; details?: unknown } }).error
        : null;

    throw new ApiError(
      response.status,
      errorPayload?.message ?? 'Something went wrong. Please try again.',
      errorPayload?.code ?? 'ERROR',
      isFieldErrorArray(errorPayload?.details) ? errorPayload.details : [],
    );
  }

  return payload as T;
};

/** Most endpoints wrap their result in `{ data }`. */
export interface Envelope<T> {
  data: T;
  message?: string;
}
