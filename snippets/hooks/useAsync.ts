import { useState, useCallback, useRef } from 'react';

type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

interface AsyncState<T> {
  status: AsyncStatus;
  data: T | null;
  error: Error | null;
  loading: boolean;
}

interface UseAsyncReturn<T, Args extends unknown[]> extends AsyncState<T> {
  execute: (...args: Args) => Promise<T | null>;
  reset: () => void;
}

/**
 * useAsync — Run async functions with status tracking
 *
 * Wraps any async function and tracks its loading, success, and error states.
 * The `execute` function is memoized and safe to use in dependency arrays.
 *
 * @example
 * const { execute: login, loading, error, data } = useAsync(
 *   (email: string, password: string) => authService.login(email, password)
 * );
 *
 * // In a form submit handler:
 * const handleSubmit = async () => {
 *   const user = await login(email, password);
 *   if (user) navigate('/dashboard');
 * };
 */
export function useAsync<T, Args extends unknown[]>(
  asyncFunction: (...args: Args) => Promise<T>
): UseAsyncReturn<T, Args> {
  const [state, setState] = useState<AsyncState<T>>({
    status: 'idle',
    data: null,
    error: null,
    loading: false,
  });

  const isMountedRef = useRef(true);

  const execute = useCallback(
    async (...args: Args): Promise<T | null> => {
      setState({ status: 'loading', data: null, error: null, loading: true });
      try {
        const result = await asyncFunction(...args);
        if (isMountedRef.current) {
          setState({ status: 'success', data: result, error: null, loading: false });
        }
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        if (isMountedRef.current) {
          setState({ status: 'error', data: null, error, loading: false });
        }
        return null;
      }
    },
    [asyncFunction]
  );

  const reset = useCallback(() => {
    setState({ status: 'idle', data: null, error: null, loading: false });
  }, []);

  return { ...state, execute, reset };
}

/**
 * useAsyncEffect — Run an async function on mount with cleanup
 *
 * Like useEffect but safely handles async functions, preventing
 * state updates after unmount.
 *
 * @example
 * useAsyncEffect(async (isMounted) => {
 *   const data = await fetchData();
 *   if (isMounted()) setData(data);
 * }, []);
 */
export function useAsyncEffect(
  effect: (isMounted: () => boolean) => Promise<void>,
  deps: React.DependencyList
): void {
  const { useEffect } = require('react');
  useEffect(() => {
    let mounted = true;
    effect(() => mounted);
    return () => { mounted = false; };
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
}
