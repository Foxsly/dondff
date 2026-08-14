/** @type {import('tailwindcss').Config} */

/**
 * Every colour resolves to a CSS custom property defined in src/styles/tokens.css.
 * The `<alpha-value>` placeholder is what lets Tailwind's opacity modifiers keep
 * working — `bg-surface/50`, `border-brand/35` and so on — which the old code
 * relied on heavily via arbitrary values like `bg-[#3a465b]/50`.
 */
const token = (name) => `rgb(var(--color-${name}) / <alpha-value>)`;

module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}', './public/index.html'],
  theme: {
    extend: {
      colors: {
        // Surfaces
        bg: token('bg'),
        'surface-sunken': token('surface-sunken'),
        surface: token('surface'),
        'surface-raised': token('surface-raised'),
        'surface-overlay': token('surface-overlay'),

        // Borders — `border-border` reads badly, so these are also exposed as
        // `border-subtle` / `border-strong` via borderColor below.
        border: token('border'),
        'border-strong': token('border-strong'),

        // Text ramp
        'text-strong': token('text-strong'),
        text: token('text'),
        'text-muted': token('text-muted'),
        'text-subtle': token('text-subtle'),
        'text-faint': token('text-faint'),

        // Brand
        brand: {
          DEFAULT: token('brand'),
          hover: token('brand-hover'),
          active: token('brand-active'),
          contrast: token('brand-contrast'),
        },

        // Gold — briefcases and first place only
        gold: {
          DEFAULT: token('gold'),
          bg: token('gold-bg'),
          border: token('gold-border'),
        },

        // Status
        success: token('success'),
        danger: token('danger'),
        warn: token('warn'),
        info: token('info'),

        // Podium chips
        'rank-1': {
          bg: token('rank-1-bg'),
          text: token('rank-1-text'),
          border: token('rank-1-border'),
        },
        'rank-2': {
          bg: token('rank-2-bg'),
          text: token('rank-2-text'),
          border: token('rank-2-border'),
        },
        'rank-3': {
          bg: token('rank-3-bg'),
          text: token('rank-3-text'),
          border: token('rank-3-border'),
        },

        // DEPRECATED — original literal values, kept only so Briefcase.tsx and
        // CaseBoard.tsx keep rendering pixel-identically. The briefcase art is
        // being preserved as-is, so these are removed in Phase 7 when the rest
        // of the game screen around it is rebuilt. Do not use in new code.
        navy: '#102131',
        slate: '#3a465b',
        teal: '#00ceb8',
        'teal-light': '#3ab4cc',
      },

      borderColor: {
        DEFAULT: token('border'),
        subtle: token('border'),
        strong: token('border-strong'),
      },

      fontFamily: {
        display: 'var(--font-display)',
        sans: 'var(--font-sans)',
        mono: 'var(--font-mono)',
      },

      fontSize: {
        // Micro-label used throughout the data-dense surfaces: 10px uppercase
        // with wide tracking. Was repeated inline on every EntryCard row.
        label: ['0.625rem', { lineHeight: '1', letterSpacing: '0.08em' }],
      },

      borderRadius: {
        sm: 'var(--radius-sm)',
        DEFAULT: 'var(--radius)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        full: 'var(--radius-full)',
      },

      boxShadow: {
        sm: 'var(--shadow-sm)',
        card: 'var(--shadow-card)',
        lg: 'var(--shadow-lg)',
        overlay: 'var(--shadow-overlay)',
      },

      keyframes: {
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 8px 2px rgb(var(--color-brand) / 0.4)' },
          '50%': { boxShadow: '0 0 16px 6px rgb(var(--color-brand) / 0.7)' },
        },
        'lid-open': {
          '0%': { transform: 'rotateX(0deg)' },
          '100%': { transform: 'rotateX(-110deg)' },
        },
        'reveal-content': {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        spotlight: {
          '0%, 100%': {
            boxShadow:
              '0 0 20px 8px rgb(var(--color-gold) / 0.4), 0 0 60px 20px rgb(var(--color-gold) / 0.15)',
            transform: 'scale(1)',
          },
          '50%': {
            boxShadow:
              '0 0 30px 12px rgb(var(--color-gold) / 0.6), 0 0 80px 30px rgb(var(--color-gold) / 0.25)',
            transform: 'scale(1.03)',
          },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },

      animation: {
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'lid-open': 'lid-open 0.5s ease-out forwards',
        'reveal-content': 'reveal-content 0.4s ease-out 0.3s forwards',
        spotlight: 'spotlight 2.5s ease-in-out infinite',
        'fade-in': 'fade-in 150ms ease-out',
        'slide-up': 'slide-up 200ms ease-out',
      },
    },
  },
  plugins: [],
};
