import React from 'react';
import { Button, WarningIcon } from './ui';

interface State {
  hasError: boolean;
  error: unknown;
}

/**
 * Top-level crash screen.
 *
 * Sits outside the Router (see index.tsx), so it cannot use Link or navigate —
 * recovery is a full page load, which is also the more reliable way out of a
 * corrupted render tree.
 *
 * The raw error text is kept, but only in development: in production it is
 * noise at best and an internals leak at worst.
 */
export default class ErrorBoundary extends React.Component<React.PropsWithChildren<{}>, State> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo): void {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex min-h-screen items-center justify-center bg-bg px-4 py-16">
        <div className="w-full max-w-lg text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-danger/15 text-danger">
            <WarningIcon className="h-7 w-7" />
          </div>

          <h1 className="text-2xl font-bold text-text-strong">Something went wrong</h1>

          <p className="mt-2 text-sm text-text-muted">
            The app hit an unexpected error. Reloading usually clears it.
          </p>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Button onClick={() => window.location.reload()}>Reload page</Button>
            <Button
              variant="secondary"
              onClick={() => {
                window.location.href = '/';
              }}
            >
              Back to home
            </Button>
          </div>

          {process.env.NODE_ENV === 'development' && this.state.error != null && (
            <details className="mt-8 text-left">
              <summary className="cursor-pointer text-xs uppercase tracking-wide text-text-subtle">
                Error detail (development only)
              </summary>
              <pre className="mt-2 max-h-64 overflow-auto rounded border border-border bg-surface-sunken p-3 text-xs text-danger">
                {String(
                  this.state.error instanceof Error
                    ? (this.state.error.stack ?? this.state.error.message)
                    : this.state.error,
                )}
              </pre>
            </details>
          )}
        </div>
      </div>
    );
  }
}
