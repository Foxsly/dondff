import React from 'react';
import { cn } from '../../lib/cn';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Adds hover feedback. Only use when the whole card is clickable. */
  interactive?: boolean;
  children?: React.ReactNode;
}

/**
 * Surface container. Header / Body / Footer are separate pieces rather than
 * props so a card can have any combination, in any order, with arbitrary
 * content — which is what the league, dashboard and standings screens all need.
 *
 * `overflow-hidden` lets the header's background meet the rounded corner
 * cleanly without the header needing its own radius.
 */
export const Card: React.FC<CardProps> = ({ interactive, className, children, ...rest }) => (
  <div
    className={cn(
      'overflow-hidden rounded-lg border border-border bg-surface shadow-card',
      interactive &&
        'cursor-pointer transition-colors duration-150 hover:border-border-strong hover:bg-surface-raised',
      className,
    )}
    {...rest}
  >
    {children}
  </div>
);

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Rendered at the right edge — actions, badges, a menu. */
  actions?: React.ReactNode;
  children?: React.ReactNode;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  actions,
  className,
  children,
  ...rest
}) => (
  <div
    className={cn(
      'flex items-center gap-3 border-b border-border bg-surface-raised px-5 py-3.5',
      className,
    )}
    {...rest}
  >
    <div className="min-w-0 flex-1">{children}</div>
    {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
  </div>
);

export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  as?: 'h2' | 'h3' | 'h4';
  children?: React.ReactNode;
}

export const CardTitle: React.FC<CardTitleProps> = ({
  as: Tag = 'h3',
  className,
  children,
  ...rest
}) => (
  <Tag className={cn('truncate text-base font-semibold text-text-strong', className)} {...rest}>
    {children}
  </Tag>
);

export const CardBody: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...rest
}) => (
  <div className={cn('p-5', className)} {...rest}>
    {children}
  </div>
);

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...rest
}) => (
  <div
    className={cn('flex items-center gap-3 border-t border-border px-5 py-4', className)}
    {...rest}
  >
    {children}
  </div>
);

export default Card;
