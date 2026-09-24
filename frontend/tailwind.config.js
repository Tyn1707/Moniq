/** @type {import('tailwindcss').Config} */

/**
 * FinanceTrack design tokens.
 *
 * The palette stays deliberately narrow (brief §26): one accent for neutral and
 * balance figures, emerald for income, rose for expense, amber for warnings.
 * Everything else is a step on the `ink` grey ramp. Restraint is what keeps a
 * dense financial screen readable — colour is reserved for meaning, never
 * decoration.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        /** Neutral ramp. Cool, slightly blue-shifted so it sits under the accent. */
        ink: {
          50: '#f7f8fa',
          100: '#eef0f4',
          200: '#dfe3ea',
          300: '#c5ccd8',
          400: '#98a2b3',
          500: '#6b7688',
          600: '#4d566a',
          700: '#3a4253',
          800: '#252b38',
          900: '#161a24',
          950: '#0b0e15',
        },
        /** Accent: indigo, used for balance, primary actions and active nav. */
        accent: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
        /** Violet, only ever used as the far end of the accent gradient. */
        grape: {
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
        },
        income: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          DEFAULT: '#059669',
        },
        expense: {
          50: '#fff1f2',
          100: '#ffe4e6',
          200: '#fecdd3',
          400: '#fb7185',
          500: '#f43f5e',
          600: '#e11d48',
          700: '#be123c',
          DEFAULT: '#e11d48',
        },
        warn: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          DEFAULT: '#d97706',
        },
      },

      fontFamily: {
        // Plus Jakarta Sans has slightly more character than Inter in large
        // sizes, so headings and money figures use it while body text stays
        // on Inter for legibility at 13–14px.
        display: ['"Plus Jakarta Sans"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },

      fontSize: {
        // Display sizes get negative tracking; large type looks loose without it.
        'display-sm': ['1.75rem', { lineHeight: '1.15', letterSpacing: '-0.02em', fontWeight: '700' }],
        'display-md': ['2.25rem', { lineHeight: '1.1', letterSpacing: '-0.025em', fontWeight: '700' }],
        'display-lg': ['3rem', { lineHeight: '1.05', letterSpacing: '-0.03em', fontWeight: '700' }],
        'display-xl': ['3.75rem', { lineHeight: '1', letterSpacing: '-0.035em', fontWeight: '700' }],
      },

      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.125rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },

      boxShadow: {
        // Layered, low-opacity shadows: one tight shadow for the edge and one
        // wide shadow for the lift. A single blurry shadow reads as muddy.
        subtle: '0 1px 2px 0 rgb(16 24 40 / 0.04), 0 1px 3px 0 rgb(16 24 40 / 0.06)',
        card: '0 1px 2px 0 rgb(16 24 40 / 0.04), 0 4px 12px -2px rgb(16 24 40 / 0.06)',
        lift: '0 2px 4px -1px rgb(16 24 40 / 0.06), 0 12px 24px -6px rgb(16 24 40 / 0.10)',
        float: '0 8px 16px -4px rgb(16 24 40 / 0.08), 0 24px 48px -12px rgb(16 24 40 / 0.14)',
        glow: '0 8px 24px -6px rgb(79 70 229 / 0.45)',
        'glow-income': '0 8px 24px -6px rgb(5 150 105 / 0.35)',
        'inner-top': 'inset 0 1px 0 0 rgb(255 255 255 / 0.10)',
      },

      backgroundImage: {
        'accent-gradient': 'linear-gradient(135deg, #4f46e5 0%, #6366f1 45%, #8b5cf6 100%)',
        'income-gradient': 'linear-gradient(135deg, #047857 0%, #10b981 100%)',
        'expense-gradient': 'linear-gradient(135deg, #be123c 0%, #f43f5e 100%)',
        // Soft radial blooms used behind the balance hero and auth panel.
        'mesh-accent':
          'radial-gradient(at 18% 12%, rgb(129 140 248 / 0.45) 0px, transparent 55%), radial-gradient(at 88% 8%, rgb(167 139 250 / 0.40) 0px, transparent 50%), radial-gradient(at 70% 92%, rgb(99 102 241 / 0.35) 0px, transparent 55%)',
        shimmer:
          'linear-gradient(90deg, transparent 0%, rgb(255 255 255 / 0.65) 50%, transparent 100%)',
        'grid-faint':
          'linear-gradient(to right, rgb(255 255 255 / 0.06) 1px, transparent 1px), linear-gradient(to bottom, rgb(255 255 255 / 0.06) 1px, transparent 1px)',
      },

      transitionTimingFunction: {
        // A gentle overshoot makes dialogs and toasts feel physical rather than
        // linear, without the cost of a spring animation library.
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },

      keyframes: {
        'reveal-up': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'reveal-scale': {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'sheet-up': {
          from: { transform: 'translateY(100%)' },
          to: { transform: 'translateY(0)' },
        },
        'toast-in': {
          from: { opacity: '0', transform: 'translateY(8px) scale(0.97)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        shimmer: { from: { transform: 'translateX(-100%)' }, to: { transform: 'translateX(100%)' } },
        'pulse-ring': {
          '0%': { transform: 'scale(0.9)', opacity: '0.7' },
          '70%': { transform: 'scale(1.3)', opacity: '0' },
          '100%': { transform: 'scale(1.3)', opacity: '0' },
        },
        'draw-ring': { from: { strokeDashoffset: 'var(--ring-circumference)' }, to: { strokeDashoffset: 'var(--ring-offset)' } },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },

      animation: {
        'reveal-up': 'reveal-up 520ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'reveal-scale': 'reveal-scale 420ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'sheet-up': 'sheet-up 340ms cubic-bezier(0.16, 1, 0.3, 1)',
        'toast-in': 'toast-in 320ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        'fade-in': 'fade-in 200ms ease-out',
        shimmer: 'shimmer 1.6s infinite',
        'pulse-ring': 'pulse-ring 2.4s cubic-bezier(0.16, 1, 0.3, 1) infinite',
        'draw-ring': 'draw-ring 900ms cubic-bezier(0.16, 1, 0.3, 1) both',
        float: 'float 5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
