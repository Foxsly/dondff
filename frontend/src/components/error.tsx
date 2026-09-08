import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { PageContainer, buttonVariants } from './ui';

/**
 * 404 route.
 *
 * The previous version was a bare `<h2>` telling the user to return to the
 * homepage without giving them a link to do it with.
 */
const NotFound: React.FC = () => {
  const { pathname } = useLocation();

  return (
    <PageContainer width="narrow">
      <div className="flex flex-col items-center py-16 text-center">
        <p className="font-display text-6xl font-bold leading-none text-brand/25 sm:text-7xl">
          404
        </p>

        <h1 className="mt-6 text-2xl font-bold text-text-strong">This page doesn't exist</h1>

        <p className="mt-2 max-w-md text-sm text-text-muted">
          We couldn't find anything at{' '}
          <code className="rounded bg-surface-raised px-1.5 py-0.5 text-xs text-text">
            {pathname}
          </code>
          . It may have moved, or the link may be wrong.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link to="/" className={buttonVariants({ variant: 'primary' })}>
            Back to home
          </Link>
          <Link to="/dashboard" className={buttonVariants({ variant: 'secondary' })}>
            Go to dashboard
          </Link>
        </div>
      </div>
    </PageContainer>
  );
};

export default NotFound;
