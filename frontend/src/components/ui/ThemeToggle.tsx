import { useRef } from 'react';
import { flushSync } from 'react-dom';
import clsx from 'clsx';
import { setTheme, useTheme } from '../../hooks/useTheme';
import { useReducedMotion } from '../../hooks/useMotion';

/**
 * Day/night theme switch.
 *
 * A small sky: by day a sun knob over a blue sky with drifting clouds; by
 * night the knob rolls across, turns into a cratered moon, and stars come out.
 * Switching paints the new theme as a circle expanding from the toggle (View
 * Transitions API, Chromium/Safari 18+); elsewhere, or under reduced motion,
 * it simply switches.
 *
 * Semantics: a `switch` labelled "Dark mode", so it is announced as on/off.
 * The scenery is colour-independent of the app theme by design.
 */

const STARS = [
  { top: '22%', left: '18%', size: 2, delay: '0ms' },
  { top: '58%', left: '30%', size: 1.5, delay: '400ms' },
  { top: '30%', left: '42%', size: 1, delay: '800ms' },
  { top: '68%', left: '14%', size: 1, delay: '1200ms' },
  { top: '16%', left: '34%', size: 1, delay: '600ms' },
];

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => { ready: Promise<void> };
};

export const ThemeToggle = ({ className }: { className?: string }) => {
  const { isDark } = useTheme();
  const reducedMotion = useReducedMotion();
  const buttonRef = useRef<HTMLButtonElement>(null);

  const toggle = () => {
    const next = isDark ? 'light' : 'dark';
    const doc = document as ViewTransitionDocument;
    const button = buttonRef.current;

    if (!doc.startViewTransition || reducedMotion || !button) {
      setTheme(next);
      return;
    }

    // Circle grows from the toggle to the farthest corner of the viewport.
    const rect = button.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));

    const transition = doc.startViewTransition(() => {
      flushSync(() => setTheme(next));
    });
    transition.ready
      .then(() => {
        document.documentElement.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
          {
            duration: 600,
            easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
            pseudoElement: '::view-transition-new(root)',
          },
        );
      })
      .catch(() => {
        // Transition skipped (e.g. tab hidden); the theme is already applied.
      });
  };

  return (
    <button
      ref={buttonRef}
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label="Dark mode"
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={toggle}
      className={clsx(
        'press group relative inline-flex h-9 w-[4.25rem] shrink-0 items-center overflow-hidden rounded-full p-1 shadow-subtle ring-1 ring-inset transition-[background-color,box-shadow] duration-500',
        isDark ? 'bg-[#141a3a] ring-white/10' : 'bg-sky-300 ring-sky-400/40',
        className,
      )}
    >
      {/* Sky gradient, cross-faded so the day→night change is smooth. */}
      <span
        aria-hidden="true"
        className={clsx(
          'absolute inset-0 bg-gradient-to-br from-sky-300 via-sky-400 to-indigo-300 transition-opacity duration-500',
          isDark ? 'opacity-0' : 'opacity-100',
        )}
      />
      <span
        aria-hidden="true"
        className={clsx(
          'absolute inset-0 bg-gradient-to-br from-[#1e1b4b] via-[#151a3d] to-[#0b1026] transition-opacity duration-500',
          isDark ? 'opacity-100' : 'opacity-0',
        )}
      />

      {/* Stars — twinkle in at night. */}
      {STARS.map((star, index) => (
        <span
          key={index}
          aria-hidden="true"
          className={clsx(
            'absolute rounded-full bg-white transition-all duration-500',
            isDark ? 'scale-100 opacity-90' : 'scale-0 opacity-0',
          )}
          style={{
            top: star.top,
            left: star.left,
            width: star.size * 2,
            height: star.size * 2,
            transitionDelay: isDark ? star.delay : '0ms',
            boxShadow: '0 0 4px rgb(255 255 255 / 0.9)',
          }}
        />
      ))}

      {/* Clouds — drift away at night. */}
      <span
        aria-hidden="true"
        className={clsx(
          'absolute right-2 top-[55%] h-2.5 w-6 rounded-full bg-white/90 transition-all duration-500 ease-out-expo',
          isDark ? 'translate-y-6 opacity-0' : 'translate-y-0 opacity-100 group-hover:-translate-x-1',
        )}
      >
        <span className="absolute -top-1.5 left-1.5 h-3 w-3 rounded-full bg-white/90" />
      </span>
      <span
        aria-hidden="true"
        className={clsx(
          'absolute right-5 top-[22%] h-1.5 w-4 rounded-full bg-white/70 transition-all delay-75 duration-500 ease-out-expo',
          isDark ? 'translate-y-6 opacity-0' : 'translate-y-0 opacity-100 group-hover:translate-x-0.5',
        )}
      />

      {/* Knob: sun by day, rolls across and becomes a moon by night. */}
      <span
        aria-hidden="true"
        className={clsx(
          'relative z-10 h-7 w-7 rounded-full transition-all duration-500 ease-spring',
          isDark
            ? 'translate-x-8 rotate-[360deg] bg-gradient-to-br from-slate-100 to-slate-300 shadow-[0_0_12px_2px_rgb(199_210_254/0.45)]'
            : 'translate-x-0 rotate-0 bg-gradient-to-br from-amber-200 via-amber-300 to-orange-400 shadow-[0_0_14px_3px_rgb(251_191_36/0.6)] group-hover:shadow-[0_0_18px_5px_rgb(251_191_36/0.7)]',
        )}
      >
        {/* Moon craters. */}
        {[
          'left-[22%] top-[28%] h-2 w-2',
          'left-[55%] top-[52%] h-1.5 w-1.5',
          'left-[30%] top-[64%] h-1 w-1',
        ].map((position) => (
          <span
            key={position}
            className={clsx(
              'absolute rounded-full bg-slate-400/60 shadow-[inset_0.5px_0.5px_1px_rgb(0_0_0/0.25)] transition-opacity duration-500',
              position,
              isDark ? 'opacity-100' : 'opacity-0',
            )}
          />
        ))}
      </span>
    </button>
  );
};
