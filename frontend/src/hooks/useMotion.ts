import { useEffect, useRef, useState } from 'react';

/**
 * Motion primitives.
 *
 * Both hooks below fail *closed*: if the environment cannot be interrogated
 * (server render, jsdom under test) or the user has asked for reduced motion,
 * they skip animation and report the final value immediately. Animation is
 * therefore never able to hide content.
 */

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

export const useReducedMotion = (): boolean => {
  const [prefersReduced, setPrefersReduced] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return true;
    return window.matchMedia(REDUCED_MOTION_QUERY).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;

    const query = window.matchMedia(REDUCED_MOTION_QUERY);
    const onChange = (event: MediaQueryListEvent) => setPrefersReduced(event.matches);

    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return prefersReduced;
};

/** Ease-out cubic: fast start, gentle settle — reads as "counting up". */
const easeOut = (t: number): number => 1 - (1 - t) ** 3;

interface CountUpOptions {
  duration?: number;
  /** Skip the animation, e.g. for a figure that is re-rendering on every keystroke. */
  disabled?: boolean;
}

/**
 * Animates a number towards `target`. Re-targets mid-flight from wherever the
 * value currently is, so a figure that updates while animating does not jump
 * back to zero and start over.
 */
export const useCountUp = (target: number, { duration = 850, disabled = false }: CountUpOptions = {}): number => {
  const prefersReducedMotion = useReducedMotion();
  const skip = disabled || prefersReducedMotion || typeof requestAnimationFrame !== 'function';

  const [value, setValue] = useState(skip ? target : 0);
  const frameRef = useRef<number | null>(null);
  const valueRef = useRef(value);

  valueRef.current = value;

  useEffect(() => {
    if (skip) {
      setValue(target);
      return;
    }

    const from = valueRef.current;
    if (from === target) return;

    const start = performance.now();

    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      setValue(from + (target - from) * easeOut(progress));
      if (progress < 1) frameRef.current = requestAnimationFrame(step);
    };

    frameRef.current = requestAnimationFrame(step);

    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
    // `valueRef` is intentionally excluded: re-running on every tick would
    // restart the animation forever.
  }, [target, duration, skip]);

  return value;
};
