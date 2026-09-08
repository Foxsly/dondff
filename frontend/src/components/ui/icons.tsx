import React from 'react';

/**
 * The small set of icons the primitives need, inlined as components.
 *
 * Deliberately not a dependency: the whole app needs about eight glyphs, and
 * an icon package would ship thousands. Each takes `className` so size and
 * colour come from Tailwind (`h-4 w-4 text-text-muted`) rather than props.
 *
 * All use `stroke="currentColor"` and no fixed dimensions, so they inherit
 * colour from the element around them and scale with the class they are given.
 */

export interface IconProps {
  className?: string;
}

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  focusable: false,
};

export const ChevronDownIcon: React.FC<IconProps> = ({ className }) => (
  <svg {...base} className={className}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export const ChevronRightIcon: React.FC<IconProps> = ({ className }) => (
  <svg {...base} className={className}>
    <path d="m9 18 6-6-6-6" />
  </svg>
);

export const CheckIcon: React.FC<IconProps> = ({ className }) => (
  <svg {...base} strokeWidth={3} className={className}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

export const CloseIcon: React.FC<IconProps> = ({ className }) => (
  <svg {...base} className={className}>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

export const InfoIcon: React.FC<IconProps> = ({ className }) => (
  <svg {...base} className={className}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4M12 8h.01" />
  </svg>
);

export const WarningIcon: React.FC<IconProps> = ({ className }) => (
  <svg {...base} className={className}>
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
    <path d="M12 9v4M12 17h.01" />
  </svg>
);

export const CopyIcon: React.FC<IconProps> = ({ className }) => (
  <svg {...base} className={className}>
    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
  </svg>
);

export const InboxIcon: React.FC<IconProps> = ({ className }) => (
  <svg {...base} className={className}>
    <path d="M22 12h-6l-2 3h-4l-2-3H2" />
    <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
  </svg>
);
