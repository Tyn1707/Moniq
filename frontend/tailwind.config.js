/** @type {import('tailwindcss').Config} */

/**
 * Moniq design tokens.
 *
 * The palette stays deliberately narrow (brief §26): one accent for neutral and
 * balance figures, emerald for income, rose for expense, amber for warnings.
 * Everything else is a step on the `ink` grey ramp. Restraint is what keeps a
 * dense financial screen readable — colour is reserved for meaning, never
 * decoration.
 */
/** Maps each step of a ramp to its CSS variable, e.g. ink-500 → --ink-500. */
const ramp = (name, steps, defaultStep) => {
  const colors = Object.fromEntries(
    steps.map((step) => [step, `rgb(var(--${name}-${step}) / <alpha-value>)`]),
  );
  if (defaultStep) colors.DEFAULT = colors[defaultStep];
  return colors;
};

export default {
  // `dark:` applies under <html class="dark">, except inside `.theme-static`
  // regions, which always render with the light tokens.
  darkMode: ['variant', '&:is(.dark *):not(.theme-static *)'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      /*
       * Themeable ramps resolve to CSS variables (see index.css), so one class
       * such as `text-ink-900` is correct in both light and dark mode without a
       * `dark:` twin. Values are space-separated RGB so `/<alpha>` still works.
       */
      colors: {
        /** Neutral ramp. Cool, slightly blue-shifted; inverted in dark mode. */
        ink: ramp('ink', [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]),
        /** Accent: indigo, used for balance, primary actions and active nav. */
        accent: ramp('accent', [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]),
        /** Violet, only ever used as the far end of the accent gradient. */
        grape: {
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
        },
        income: ramp('income', [50, 100, 200, 400, 500, 600, 700], 600),
        expense: ramp('expense', [50, 100, 200, 400, 500, 600, 700], 600),
        warn: ramp('warn', [50, 100, 200, 400, 500, 600, 700], 600),
        /** Card / panel background: white in light mode, raised slate in dark. */
        surface: 'rgb(var(--surface) / <alpha-value>)',
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
          'linear-gradient(90deg, transparent 0%, rgb(var(--shimmer)) 50%, transparent 100%)',
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
        // Slow organic drift for the auth-page background blooms.
        blob: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%': { transform: 'translate(40px, -50px) scale(1.08)' },
          '66%': { transform: 'translate(-30px, 30px) scale(0.94)' },
        },
        // Short horizontal shake for a rejected form submission.
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%, 60%': { transform: 'translateX(-5px)' },
          '40%, 80%': { transform: 'translateX(5px)' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '25%': { transform: 'rotate(-8deg)' },
          '75%': { transform: 'rotate(8deg)' },
        },
        // Soap-bubble life cycle: a soft squish while drifting, a burst, a re-form.
        'bubble-wobble': {
          '0%, 100%': { transform: 'scale(1, 1)' },
          '33%': { transform: 'scale(1.045, 0.96)' },
          '66%': { transform: 'scale(0.965, 1.035)' },
        },
        // Puffer-fish inflate: two gulps of air, a final swell, a tense tremble.
        'bubble-inflate': {
          '0%': { transform: 'scale(1)' },
          '22%': { transform: 'scale(1.2, 1.12)' },
          '34%': { transform: 'scale(1.12)' },
          '58%': { transform: 'scale(1.42, 1.34)' },
          '70%': { transform: 'scale(1.34)' },
          '88%': { transform: 'scale(1.6)' },
          '92%': { transform: 'scale(1.57, 1.63)' },
          '96%': { transform: 'scale(1.63, 1.57)' },
          '100%': { transform: 'scale(1.6)' },
        },
        // Picks up from the inflated size and bursts almost instantly, like soap film.
        'bubble-burst': {
          '0%': { transform: 'scale(1.6)', opacity: '1' },
          '40%': { transform: 'scale(1.85)', opacity: '0.5' },
          '100%': { transform: 'scale(2)', opacity: '0' },
        },
        'bubble-in': {
          '0%': { transform: 'scale(0.15)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        droplet: {
          '0%': { transform: 'translate(-50%, -50%) scale(1)', opacity: '0.9' },
          '100%': {
            transform: 'translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) scale(0.2)',
            opacity: '0',
          },
        },
        // Description card zooming out of a popped bubble, centred on it
        // (`--sx/--sy` nudge it back on-screen near the edges).
        'card-zoom': {
          '0%': {
            transform: 'translate(calc(-50% + var(--sx, 0px)), calc(-50% + var(--sy, 0px))) scale(0.25)',
            opacity: '0',
          },
          '60%': {
            transform: 'translate(calc(-50% + var(--sx, 0px)), calc(-50% + var(--sy, 0px))) scale(1.05)',
            opacity: '1',
          },
          '100%': {
            transform: 'translate(calc(-50% + var(--sx, 0px)), calc(-50% + var(--sy, 0px))) scale(1)',
            opacity: '1',
          },
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
        'float-slow': 'float 7s ease-in-out infinite',
        blob: 'blob 18s ease-in-out infinite',
        'blob-slow': 'blob 24s ease-in-out infinite reverse',
        shake: 'shake 420ms cubic-bezier(0.36, 0.07, 0.19, 0.97) both',
        wiggle: 'wiggle 600ms ease-in-out',
        'bubble-wobble': 'bubble-wobble 3.6s ease-in-out infinite',
        // Must match INFLATE_MS in FeatureBubbles.tsx.
        'bubble-inflate': 'bubble-inflate 520ms cubic-bezier(0.45, 0, 0.55, 1) forwards',
        'bubble-burst': 'bubble-burst 170ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'bubble-in': 'bubble-in 520ms cubic-bezier(0.34, 1.56, 0.64, 1) both',
        droplet: 'droplet 480ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
        // Starts ~90ms in, as the burst peaks, so the card reads as coming out of it.
        'card-zoom': 'card-zoom 460ms cubic-bezier(0.34, 1.56, 0.64, 1) 200ms both',
        'spin-slow': 'spin 9s linear infinite',
      },
    },
  },
  plugins: [],
};
