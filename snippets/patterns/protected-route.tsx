import React, { ReactNode } from 'react';

// ─── Minimal auth interface (swap in your own) ────────────────────────────────

interface AuthUser {
  id: string;
  roles?: string[];
}

// ─── ProtectedRoute ───────────────────────────────────────────────────────────

interface ProtectedRouteProps {
  children: ReactNode;
  /** The authenticated user. null/undefined = not authenticated */
  user: AuthUser | null | undefined;
  /** Still determining auth state */
  isLoading?: boolean;
  /** Required role(s). User must have at least one. */
  requiredRoles?: string[];
  /** Render this while auth state is loading */
  loadingFallback?: ReactNode;
  /** Render this when user is not authenticated */
  unauthenticatedFallback?: ReactNode;
  /** Render this when user is authenticated but lacks required role */
  unauthorizedFallback?: ReactNode;
  /** Called instead of rendering fallback — e.g., for router redirects */
  onUnauthenticated?: () => void;
  onUnauthorized?: () => void;
}

/**
 * ProtectedRoute — Auth-protected content wrapper
 *
 * Handles 3 states: loading, unauthenticated, unauthorized.
 * Works with any auth provider or routing library (Next.js, React Router, etc.)
 *
 * @example
 * // Basic auth check:
 * <ProtectedRoute
 *   user={currentUser}
 *   isLoading={authLoading}
 *   onUnauthenticated={() => router.push('/login')}
 * >
 *   <Dashboard />
 * </ProtectedRoute>
 *
 * // With role check:
 * <ProtectedRoute
 *   user={currentUser}
 *   requiredRoles={['admin']}
 *   unauthorizedFallback={<ForbiddenPage />}
 * >
 *   <AdminPanel />
 * </ProtectedRoute>
 */
export function ProtectedRoute({
  children,
  user,
  isLoading = false,
  requiredRoles,
  loadingFallback = <DefaultLoadingFallback />,
  unauthenticatedFallback = null,
  unauthorizedFallback = <DefaultUnauthorizedFallback />,
  onUnauthenticated,
  onUnauthorized,
}: ProtectedRouteProps): React.ReactElement | null {
  // 1. Loading state
  if (isLoading) return <>{loadingFallback}</>;

  // 2. Not authenticated
  if (!user) {
    onUnauthenticated?.();
    return <>{unauthenticatedFallback}</>;
  }

  // 3. Role check (if roles specified)
  if (requiredRoles && requiredRoles.length > 0) {
    const userRoles = user.roles ?? [];
    const hasRequiredRole = requiredRoles.some((role) => userRoles.includes(role));
    if (!hasRequiredRole) {
      onUnauthorized?.();
      return <>{unauthorizedFallback}</>;
    }
  }

  // 4. Authorized — render children
  return <>{children}</>;
}

// ─── Default fallback components ──────────────────────────────────────────────

function DefaultLoadingFallback() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
      <div style={{
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        border: '3px solid #e5e7eb',
        borderTopColor: '#6366f1',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function DefaultUnauthorizedFallback() {
  return (
    <div style={{ padding: '48px', textAlign: 'center' }}>
      <h2 style={{ color: '#dc2626' }}>Access Denied</h2>
      <p style={{ color: '#6b7280' }}>
        You don&apos;t have permission to view this page.
      </p>
    </div>
  );
}

// ─── useProtectedAction — Protect individual actions ─────────────────────────

import { useCallback } from 'react';

/**
 * useProtectedAction — Gate any function behind auth check
 *
 * @example
 * const protectedLike = useProtectedAction(
 *   () => likePost(postId),
 *   { user, onUnauthenticated: () => setShowLoginModal(true) }
 * );
 *
 * <button onClick={protectedLike}>Like</button>
 */
export function useProtectedAction<T extends (...args: any[]) => any>(
  action: T,
  options: {
    user: AuthUser | null | undefined;
    requiredRoles?: string[];
    onUnauthenticated?: () => void;
    onUnauthorized?: () => void;
  }
): T {
  const { user, requiredRoles, onUnauthenticated, onUnauthorized } = options;

  return useCallback(
    (...args: Parameters<T>): ReturnType<T> | undefined => {
      if (!user) {
        onUnauthenticated?.();
        return undefined;
      }
      if (requiredRoles?.length) {
        const userRoles = user.roles ?? [];
        const hasRole = requiredRoles.some((r) => userRoles.includes(r));
        if (!hasRole) {
          onUnauthorized?.();
          return undefined;
        }
      }
      return action(...args);
    },
    [action, user, requiredRoles, onUnauthenticated, onUnauthorized]
  ) as T;
}
