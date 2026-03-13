import { useState, useCallback, useEffect, createContext, useContext } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string;
  roles: string[];
  [key: string]: unknown;
}

interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number; // Unix timestamp (ms)
}

interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthActions {
  login: (tokens: AuthTokens, user: User) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  hasRole: (role: string) => boolean;
  isTokenExpired: () => boolean;
}

export type AuthContextValue = AuthState & AuthActions;

// ─── Storage keys (customize as needed) ──────────────────────────────────────

const STORAGE_KEYS = {
  user: 'auth_user',
  tokens: 'auth_tokens',
} as const;

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * useAuth — Auth state management with JWT support
 *
 * Manages user state, JWT tokens, persistence, and role checks.
 * Use this with a Context provider (pattern below) for app-wide auth.
 *
 * @example
 * // In _app.tsx / layout.tsx:
 * export function AuthProvider({ children }: { children: React.ReactNode }) {
 *   const auth = useAuthState();
 *   return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
 * }
 *
 * // In any component:
 * const { user, isAuthenticated, login, logout, hasRole } = useAuth();
 */
export function useAuthState(): AuthContextValue {
  const [state, setState] = useState<AuthState>(() => {
    // Hydrate from localStorage on init
    if (typeof window === 'undefined') {
      return { user: null, tokens: null, isAuthenticated: false, isLoading: true };
    }
    try {
      const savedUser = localStorage.getItem(STORAGE_KEYS.user);
      const savedTokens = localStorage.getItem(STORAGE_KEYS.tokens);
      const user = savedUser ? (JSON.parse(savedUser) as User) : null;
      const tokens = savedTokens ? (JSON.parse(savedTokens) as AuthTokens) : null;
      return {
        user,
        tokens,
        isAuthenticated: !!user && !!tokens,
        isLoading: false,
      };
    } catch {
      return { user: null, tokens: null, isAuthenticated: false, isLoading: false };
    }
  });

  // Finish loading after mount (handles SSR hydration)
  useEffect(() => {
    setState((prev) => ({ ...prev, isLoading: false }));
  }, []);

  const login = useCallback((tokens: AuthTokens, user: User) => {
    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
    localStorage.setItem(STORAGE_KEYS.tokens, JSON.stringify(tokens));
    setState({ user, tokens, isAuthenticated: true, isLoading: false });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.user);
    localStorage.removeItem(STORAGE_KEYS.tokens);
    setState({ user: null, tokens: null, isAuthenticated: false, isLoading: false });
  }, []);

  const updateUser = useCallback((updates: Partial<User>) => {
    setState((prev) => {
      if (!prev.user) return prev;
      const updatedUser = { ...prev.user, ...updates };
      localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(updatedUser));
      return { ...prev, user: updatedUser };
    });
  }, []);

  const hasRole = useCallback(
    (role: string): boolean => {
      return state.user?.roles?.includes(role) ?? false;
    },
    [state.user]
  );

  const isTokenExpired = useCallback((): boolean => {
    if (!state.tokens?.expiresAt) return false;
    return Date.now() > state.tokens.expiresAt;
  }, [state.tokens]);

  return { ...state, login, logout, updateUser, hasRole, isTokenExpired };
}

// ─── Context pattern ──────────────────────────────────────────────────────────

export const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * useAuth — Consume auth context in any component
 *
 * @throws Error if used outside <AuthProvider>
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an <AuthProvider>');
  }
  return context;
}
