import React from 'react';
import { cn } from '../../lib/cn';

/**
 * Card tone.
 *
 * Exposed as a prop rather than left to `className`, because a passed-in
 * `border-danger` cannot beat the base `border-border`: they have equal CSS
 * specificity, so which one wins depends on their order in the compiled
 * stylesheet, not on the order they appear in the class string. Anything a
 * caller genuinely needs to vary gets a prop; `className` is for layout and
 * spacing, not for overriding baked-in colour.
 */
export type CardTone = 'default' | 'danger';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Adds hover feedback. Only use when the whole card is clickable. */
  interactive?: boolean;
  tone?: CardTone;
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
export const Card: React.FC<CardProps> = ({
  interactive,
  tone = 'default',
  className,
  children,
  ...rest
}) => (
  <div
    className={cn(
      'overflow-hidden rounded-lg border bg-surface shadow-card',
      tone === 'danger' ? 'border-danger/40' : 'border-border',
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
  tone?: CardTone;
  children?: React.ReactNode;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  actions,
  tone = 'default',
  className,
  children,
  ...rest
}) => (
  <div
    className={cn(
      'flex items-center gap-3 border-b px-5 py-3.5',
      tone === 'danger' ? 'border-danger/40 bg-danger/5' : 'border-border bg-surface-raised',
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
  tone?: CardTone;
  children?: React.ReactNode;
}

export const CardTitle: React.FC<CardTitleProps> = ({
  as: Tag = 'h3',
  tone = 'default',
  className,
  children,
  ...rest
}) => (
  <Tag
    className={cn(
      'truncate text-base font-semibold',
      tone === 'danger' ? 'text-danger' : 'text-text-strong',
      className,
    )}
    {...rest}
  >
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
