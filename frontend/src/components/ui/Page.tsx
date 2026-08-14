import React from 'react';
import { cn } from '../../lib/cn';
import type { BreadcrumbItem } from '../../types';
import { Breadcrumbs } from './Breadcrumbs';

export type PageWidth = 'narrow' | 'default' | 'wide' | 'full';

export interface PageContainerProps {
  width?: PageWidth;
  className?: string;
  children?: React.ReactNode;
}

const widths: Record<PageWidth, string> = {
  narrow: 'max-w-2xl', // forms, sign-in
  default: 'max-w-5xl', // dashboard, league
  wide: 'max-w-7xl', // standings, game board
  full: 'max-w-none',
};

/**
 * Standard page gutter and measure.
 *
 * Replaces the `mx-auto p-4 space-y-4 text-left bg-[#3a465b]/50 rounded`
 * string that was copy-pasted onto every page — including the tinted panel
 * background, which made each page look like a floating card inside itself.
 */
export const PageContainer: React.FC<PageContainerProps> = ({
  width = 'default',
  className,
  children,
}) => (
  <div className={cn('mx-auto w-full px-4 py-6 text-left sm:px-6 lg:py-8', widths[width], className)}>
    {children}
  </div>
);

export interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  /** Right-aligned actions. Wraps below the title on narrow screens. */
  actions?: React.ReactNode;
  /** Badges or metadata shown next to the title. */
  meta?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  breadcrumbs,
  actions,
  meta,
  className,
}) => (
  <header className={cn('mb-6 flex flex-col gap-4', className)}>
    {breadcrumbs && breadcrumbs.length > 0 && <Breadcrumbs items={breadcrumbs} />}

    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-text-strong sm:text-3xl">
            {title}
          </h1>
          {meta}
        </div>

        {description && <p className="mt-1.5 text-sm text-text-muted">{description}</p>}
      </div>

      {actions && <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div>}
    </div>
  </header>
);

export default PageContainer;
