import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/cn';
import type { BreadcrumbItem } from '../../types';
import { ChevronRightIcon } from './icons';

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

/**
 * Trail of ancestor pages.
 *
 * An ordered list inside a labelled `<nav>`, with the final crumb marked
 * `aria-current="page"` and rendered as plain text rather than a link to the
 * page you are already on.
 */
export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items, className }) => (
  <nav aria-label="Breadcrumb" className={className}>
    <ol className="flex flex-wrap items-center gap-1.5 text-sm">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <li key={`${item.label}-${index}`} className="flex items-center gap-1.5">
            {item.to && !isLast ? (
              <Link
                to={item.to}
                className="rounded text-text-muted transition-colors hover:text-brand hover:underline"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={cn(isLast ? 'font-medium text-text' : 'text-text-muted')}
                aria-current={isLast ? 'page' : undefined}
              >
                {item.label}
              </span>
            )}

            {!isLast && <ChevronRightIcon className="h-3.5 w-3.5 shrink-0 text-text-faint" />}
          </li>
        );
      })}
    </ol>
  </nav>
);

export default Breadcrumbs;
