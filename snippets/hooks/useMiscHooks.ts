import {
  useState,
  useEffect,
  useRef,
  useCallback,
  RefObject,
} from 'react';

// ─── usePrevious ──────────────────────────────────────────────────────────────

/**
 * usePrevious — Track the previous value of any state/prop
 *
 * @example
 * const prevCount = usePrevious(count);
 * // prevCount holds the value from the previous render
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

// ─── useToggle ────────────────────────────────────────────────────────────────

/**
 * useToggle — Boolean toggle with explicit set methods
 *
 * @example
 * const [isOpen, toggle, open, close] = useToggle(false);
 * <button onClick={toggle}>Toggle</button>
 * <button onClick={open}>Open</button>
 * <button onClick={close}>Close</button>
 */
export function useToggle(
  initialValue: boolean = false
): [boolean, () => void, () => void, () => void] {
  const [value, setValue] = useState(initialValue);
  const toggle = useCallback(() => setValue((v) => !v), []);
  const setTrue = useCallback(() => setValue(true), []);
  const setFalse = useCallback(() => setValue(false), []);
  return [value, toggle, setTrue, setFalse];
}

// ─── useCounter ───────────────────────────────────────────────────────────────

/**
 * useCounter — Counter with increment, decrement, reset, and set
 *
 * @example
 * const { count, increment, decrement, reset, set } = useCounter(0, { min: 0, max: 10 });
 */
export function useCounter(
  initialValue: number = 0,
  options: { min?: number; max?: number; step?: number } = {}
) {
  const { min = -Infinity, max = Infinity, step = 1 } = options;
  const [count, setCount] = useState(() =>
    Math.min(Math.max(initialValue, min), max)
  );

  const increment = useCallback(
    () => setCount((c) => Math.min(c + step, max)),
    [step, max]
  );
  const decrement = useCallback(
    () => setCount((c) => Math.max(c - step, min)),
    [step, min]
  );
  const reset = useCallback(() => setCount(initialValue), [initialValue]);
  const set = useCallback(
    (value: number) => setCount(Math.min(Math.max(value, min), max)),
    [min, max]
  );

  return { count, increment, decrement, reset, set };
}

// ─── useClickOutside ─────────────────────────────────────────────────────────

/**
 * useClickOutside — Detect clicks outside an element
 *
 * @example
 * const ref = useClickOutside<HTMLDivElement>(() => setIsOpen(false));
 * <div ref={ref}>...</div>
 */
export function useClickOutside<T extends HTMLElement = HTMLElement>(
  handler: () => void
): RefObject<T> {
  const ref = useRef<T>(null);

  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) return;
      handler();
    };
    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);
    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [handler]);

  return ref;
}

// ─── useMediaQuery ────────────────────────────────────────────────────────────

/**
 * useMediaQuery — Responsive breakpoint detection
 *
 * @example
 * const isMobile = useMediaQuery('(max-width: 768px)');
 * const isDark = useMediaQuery('(prefers-color-scheme: dark)');
 * const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);
    const handler = (event: MediaQueryListEvent) => setMatches(event.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

// ─── useWindowSize ────────────────────────────────────────────────────────────

/**
 * useWindowSize — Track window dimensions (throttled)
 *
 * @example
 * const { width, height } = useWindowSize();
 */
export function useWindowSize(): { width: number; height: number } {
  const [size, setSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    const handler = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setSize({ width: window.innerWidth, height: window.innerHeight });
      }, 100);
    };
    window.addEventListener('resize', handler);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handler);
    };
  }, []);

  return size;
}

// ─── useOnlineStatus ─────────────────────────────────────────────────────────

/**
 * useOnlineStatus — Network connectivity detection
 *
 * @example
 * const isOnline = useOnlineStatus();
 * if (!isOnline) return <OfflineBanner />;
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

// ─── useCopyToClipboard ───────────────────────────────────────────────────────

/**
 * useCopyToClipboard — Copy text with status feedback
 *
 * @example
 * const { copy, copied, error } = useCopyToClipboard();
 * <button onClick={() => copy(secretCode)}>
 *   {copied ? 'Copied!' : 'Copy Code'}
 * </button>
 */
export function useCopyToClipboard(resetDelay: number = 2000) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const copy = useCallback(
    async (text: string): Promise<boolean> => {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setError(null);
        setTimeout(() => setCopied(false), resetDelay);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Copy failed'));
        setCopied(false);
        return false;
      }
    },
    [resetDelay]
  );

  return { copy, copied, error };
}

// ─── useKeyPress ──────────────────────────────────────────────────────────────

/**
 * useKeyPress — Detect keyboard shortcuts
 *
 * @example
 * useKeyPress('Escape', () => setIsOpen(false));
 * useKeyPress('s', () => save(), { ctrlKey: true });
 */
export function useKeyPress(
  targetKey: string,
  handler: (event: KeyboardEvent) => void,
  modifiers: { ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean; altKey?: boolean } = {}
): void {
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if (event.key !== targetKey) return;
      if (modifiers.ctrlKey && !event.ctrlKey) return;
      if (modifiers.metaKey && !event.metaKey) return;
      if (modifiers.shiftKey && !event.shiftKey) return;
      if (modifiers.altKey && !event.altKey) return;
      handler(event);
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [targetKey, handler, modifiers]);
}

// ─── useInterval ──────────────────────────────────────────────────────────────

/**
 * useInterval — Safe setInterval with automatic cleanup
 *
 * @example
 * useInterval(() => { setTime(Date.now()); }, 1000);
 * // Pass null to pause
 * useInterval(callback, isPaused ? null : 1000);
 */
export function useInterval(
  callback: () => void,
  delay: number | null
): void {
  const savedCallback = useRef(callback);
  useEffect(() => { savedCallback.current = callback; }, [callback]);

  useEffect(() => {
    if (delay === null) return;
    const id = setInterval(() => savedCallback.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
}
