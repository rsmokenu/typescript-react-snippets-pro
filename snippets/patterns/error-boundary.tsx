import React, { Component, ErrorInfo, ReactNode } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Custom fallback component or element */
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
  /** Called when an error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Reset keys — boundary resets when any key changes */
  resetKeys?: unknown[];
}

// ─── ErrorBoundary ────────────────────────────────────────────────────────────

/**
 * ErrorBoundary — Catch React render errors with reset support
 *
 * Catches errors thrown during rendering, lifecycle methods, and
 * constructors of child components. Provides a reset mechanism.
 *
 * @example
 * // Basic usage with default fallback:
 * <ErrorBoundary>
 *   <MyComponent />
 * </ErrorBoundary>
 *
 * // Custom fallback:
 * <ErrorBoundary
 *   fallback={(error, reset) => (
 *     <div>
 *       <p>Something went wrong: {error.message}</p>
 *       <button onClick={reset}>Try again</button>
 *     </div>
 *   )}
 *   onError={(error) => logToSentry(error)}
 *   resetKeys={[userId]} // Reset when userId changes
 * >
 *   <UserProfile />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);

    // Log to console in dev, external service in prod
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught:', error, errorInfo);
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    // Reset if resetKeys changed
    if (this.state.hasError && prevProps.resetKeys !== this.props.resetKeys) {
      const changed = (this.props.resetKeys ?? []).some(
        (key, i) => key !== (prevProps.resetKeys ?? [])[i]
      );
      if (changed) this.reset();
    }
  }

  reset = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render(): ReactNode {
    const { hasError, error } = this.state;
    const { children, fallback } = this.props;

    if (!hasError || !error) return children;

    if (fallback) {
      return typeof fallback === 'function' ? fallback(error, this.reset) : fallback;
    }

    // Default fallback UI
    return (
      <div style={{
        padding: '24px',
        margin: '16px',
        border: '1px solid #fca5a5',
        borderRadius: '8px',
        backgroundColor: '#fef2f2',
      }}>
        <h2 style={{ color: '#dc2626', marginTop: 0 }}>Something went wrong</h2>
        <p style={{ color: '#6b7280' }}>{error.message}</p>
        <button
          onClick={this.reset}
          style={{
            padding: '8px 16px',
            backgroundColor: '#dc2626',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
      </div>
    );
  }
}

// ─── withErrorBoundary HOC ────────────────────────────────────────────────────

/**
 * withErrorBoundary — HOC to wrap any component in an ErrorBoundary
 *
 * @example
 * const SafeUserProfile = withErrorBoundary(UserProfile, {
 *   fallback: <p>Failed to load profile</p>,
 * });
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  boundaryProps?: Omit<ErrorBoundaryProps, 'children'>
): React.ComponentType<P> {
  const displayName = Component.displayName ?? Component.name ?? 'Component';

  function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary {...boundaryProps}>
        <Component {...props} />
      </ErrorBoundary>
    );
  }

  WithErrorBoundary.displayName = `withErrorBoundary(${displayName})`;
  return WithErrorBoundary;
}
