import { useState, useEffect, useCallback, Dispatch, SetStateAction } from 'react';

type StorageValue<T> = T | null;

/**
 * useLocalStorage — Synced, typed localStorage state
 *
 * Like useState, but persisted to localStorage. SSR-safe (no window access
 * during server render). Automatically serializes/deserializes JSON.
 *
 * @example
 * const [theme, setTheme] = useLocalStorage<'light' | 'dark'>('theme', 'light');
 * const [user, setUser] = useLocalStorage<User | null>('user', null);
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, Dispatch<SetStateAction<T>>, () => void] {
  // Read from localStorage on init (SSR-safe)
  const readValue = useCallback((): T => {
    if (typeof window === 'undefined') return initialValue;
    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch (error) {
      console.warn(`useLocalStorage: error reading key "${key}":`, error);
      return initialValue;
    }
  }, [initialValue, key]);

  const [storedValue, setStoredValue] = useState<T>(readValue);

  // Persist to localStorage whenever value changes
  const setValue: Dispatch<SetStateAction<T>> = useCallback(
    (value) => {
      if (typeof window === 'undefined') {
        console.warn(`useLocalStorage: cannot set "${key}" during SSR`);
        return;
      }
      try {
        const newValue = value instanceof Function ? value(storedValue) : value;
        window.localStorage.setItem(key, JSON.stringify(newValue));
        setStoredValue(newValue);
        // Sync across browser tabs
        window.dispatchEvent(new StorageEvent('storage', { key }));
      } catch (error) {
        console.warn(`useLocalStorage: error setting key "${key}":`, error);
      }
    },
    [key, storedValue]
  );

  // Remove from localStorage and reset to initial value
  const removeValue = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch (error) {
      console.warn(`useLocalStorage: error removing key "${key}":`, error);
    }
  }, [initialValue, key]);

  // Sync state when another tab changes the same key
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === key) {
        setStoredValue(readValue());
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key, readValue]);

  return [storedValue, setValue, removeValue];
}
