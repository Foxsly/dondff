import React from 'react';
import { cn } from '../../lib/cn';

export interface LogoProps {
  /** Hides the wordmark, leaving just the briefcase mark. */
  markOnly?: boolean;
  className?: string;
}

/**
 * Brand mark — a briefcase, echoing the case art on the game board.
 *
 * Drawn rather than imported so it inherits `currentColor` for the case body
 * and picks up the gold token for the clasp, staying consistent with the board
 * without shipping another image.
 */
export const Logo: React.FC<LogoProps> = ({ markOnly = false, className }) => (
  <span className={cn('inline-flex items-center gap-2.5', className)}>
    <svg
      viewBox="0 0 32 32"
      className="h-7 w-7 shrink-0"
      role="img"
      aria-label="DOND Fantasy Football"
    >
      {/* Handle */}
      <path
        d="M12 8V6.5A1.5 1.5 0 0 1 13.5 5h5A1.5 1.5 0 0 1 20 6.5V8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Case body */}
      <rect x="4" y="8" width="24" height="18" rx="2.5" className="fill-gold" />
      {/* Lid seam */}
      <path d="M4 16h24" stroke="rgb(var(--color-bg))" strokeWidth="1.5" opacity="0.35" />
      {/* Clasp */}
      <rect x="13.5" y="13.5" width="5" height="5" rx="1" className="fill-bg" />
    </svg>

    {!markOnly && (
      <span className="font-display text-lg font-bold uppercase leading-none tracking-tight text-text-strong">
        DOND<span className="text-brand">.FF</span>
      </span>
    )}
  </span>
);

export default Logo;
