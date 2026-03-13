import { useState, useEffect, useCallback, useRef } from 'react';

type FetchState<T> =
  | { status: 'idle'; data: null; error: null; loading: false }
  | { status: 'loading'; data: null; error: null; loading: true }
  | { status: 'success'; data: T; error: null; loading: false }
  | { status: 'error'; data: null; error: Error; loading: false };

interface UseFetchOptions extends RequestInit {
  /** Run fetch immediately on mount (default: true) */
  immediate?: boolean;
}

interface UseFetchReturn<T> extends FetchState<T> {
  refetch: () => Promise<void>;
}

/**
 * useFetch — Generic typed fetch hook with loading/error states
 *
 * Handles loading, success, and error states automatically.
 * Cancels in-flight requests when the component unmounts.
 *
 * @example
 * const { data, loading, error, refetch } = useFetch<User[]>('/api/users');
 *
 * // With options
 * const { data } = useFetch<Post>('/api/posts/1', { immediate: true });
 */
export function useFetch<T>(
  url: string,
  options: UseFetchOptions = {}
): UseFetchReturn<T> {
  const { immediate = true, ...fetchOptions } = options;

  const [state, setState] = useState<FetchState<T>>({
    status: 'idle',
    data: null,
    error: null,
    loading: false,
  });

  // Track whether component is mounted to avoid state updates after unmount
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  const execute = useCallback(async () => {
    // Cancel previous in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setState({ status: 'loading', data: null, error: null, loading: true });

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: T = await response.json();

      if (isMountedRef.current) {
        setState({ status: 'success', data, error: null, loading: false });
      }
    } catch (error) {
      // Ignore abort errors (component unmounted or refetch called)
      if (error instanceof Error && error.name === 'AbortError') return;

      if (isMountedRef.current) {
        setState({
          status: 'error',
          data: null,
          error: error instanceof Error ? error : new Error(String(error)),
          loading: false,
        });
      }
    }
  }, [url]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    isMountedRef.current = true;
    if (immediate) execute();
    return () => {
      isMountedRef.current = false;
      abortControllerRef.current?.abort();
    };
  }, [execute, immediate]);

  return { ...state, refetch: execute };
}

/**
 * usePost — Typed POST request hook
 *
 * Returns a `mutate` function that sends a POST request.
 * Tracks loading/error state automatically.
 *
 * @example
 * const { mutate, loading, error } = usePost<User, CreateUserDto>('/api/users');
 * await mutate({ name: 'Alice', email: 'alice@example.com' });
 */
export function usePost<TResponse, TBody = unknown>(url: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<TResponse | null>(null);

  const mutate = useCallback(
    async (body: TBody): Promise<TResponse | null> => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const result: TResponse = await response.json();
        setData(result);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [url]
  );

  return { mutate, loading, error, data };
}
