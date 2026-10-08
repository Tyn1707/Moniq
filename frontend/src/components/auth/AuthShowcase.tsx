import { useState, type CSSProperties, type ReactNode } from 'react';
import { ArrowDownRight, ArrowUpRight, Coffee, Wallet } from 'lucide-react';
import clsx from 'clsx';
import { useCountUp, usePointerVars } from '../../hooks/useMotion';
import { AnimatedCurrency } from '../ui/Motion';
import { formatCurrency } from '../../utils/format';

/**
 * Decorative product preview for the auth pages.
 *
 * A loose stack of floating cards that echoes the real dashboard. It reacts to
 * the pointer at two levels:
 *   - the page publishes `--mx/--my`, and each card drifts by its own depth,
 *     giving a layered parallax;
 *   - each card publishes its own `--tmx/--tmy` and tilts towards the cursor,
 *     with a soft glare following it.
 *
 * The whole block is `aria-hidden`: it is illustration, not data, and the
 * figures in it are fixed sample values rather than anything about the user.
 */

/** Parallax offset for a layer. Larger depth = closer to the viewer = moves more. */
const depth = (px: number): CSSProperties => ({
  transform: `translate3d(calc(var(--mx, 0) * ${px}px), calc(var(--my, 0) * ${px}px), 0)`,
});

const TILT_STYLE: CSSProperties = {
  transform:
    'perspective(900px) rotateX(calc(var(--tmy, 0) * -12deg)) rotateY(calc(var(--tmx, 0) * 12deg)) scale(var(--tscale, 1))',
};

const TiltCard = ({
  children,
  className,
  disabled,
}: {
  children: ReactNode;
  className?: string;
  disabled: boolean;
}) => {
  const ref = usePointerVars<HTMLDivElement>({ prefix: 't', disabled });
  return (
    <div
      ref={ref}
      style={TILT_STYLE}
      className={clsx(
        'group relative overflow-hidden rounded-3xl transition-transform duration-500 ease-out-expo will-change-transform hover:[--tscale:1.04]',
        className,
      )}
    >
      {children}
      {/* Glare that follows the cursor across the card. */}
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background:
            'radial-gradient(240px circle at var(--tpx, 50%) var(--tpy, 50%), rgb(255 255 255 / 0.28), transparent 65%)',
        }}
      />
    </div>
  );
};

/** Weekly spending bars — they rise when the card is hovered. */
const BARS = [38, 62, 45, 80, 52, 70, 34];

const SPARK_PATH = 'M0 34 C 18 30, 26 14, 44 18 S 70 32, 88 20 S 118 4, 140 8';

const RING_RADIUS = 26;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const RING_IDLE = 23;
const RING_HOVER = 69;

/**
 * Sample budget ring: rests at 23% and climbs to 69% while hovered. The ring
 * and the number share one count-up value, so they always move together.
 */
const BudgetRing = () => {
  const [hovered, setHovered] = useState(false);
  const usage = useCountUp(hovered ? RING_HOVER : RING_IDLE, { duration: 700 });

  return (
    <div onPointerEnter={() => setHovered(true)} onPointerLeave={() => setHovered(false)}>
      <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-ink-500">
        Food budget
      </p>
      <div className="mt-2 flex items-center gap-3">
        <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90">
          <circle cx="32" cy="32" r={RING_RADIUS} className="stroke-ink-100" strokeWidth="7" fill="none" />
          <circle
            cx="32"
            cy="32"
            r={RING_RADIUS}
            className="stroke-income-500"
            strokeWidth="7"
            strokeLinecap="round"
            fill="none"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={RING_CIRCUMFERENCE * (1 - usage / 100)}
          />
        </svg>
        <div>
          <p className="money text-xl font-bold text-ink-900">{Math.round(usage)}%</p>
          <p className="text-[0.6875rem] font-semibold text-income-600">On track</p>
        </div>
      </div>
    </div>
  );
};

export const AuthShowcase = ({ disabled }: { disabled: boolean }) => (
  <div className="relative mx-auto h-[420px] w-full max-w-[460px]" aria-hidden="true">
    {/* Balance — the hero card, mid-depth. */}
    <div
      className="absolute left-0 top-10 w-[300px] transition-transform duration-700 ease-out-expo"
      data-bubble-obstacle
      style={depth(14)}
    >
      <TiltCard disabled={disabled} className="bg-accent-gradient p-6 text-white shadow-glow">
        <div className="absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex items-center justify-between">
          <span className="text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-white/70">
            Current balance
          </span>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15">
            <Wallet className="h-4 w-4" />
          </span>
        </div>
        <AnimatedCurrency
          value={4_250_000}
          currency="IDR"
          className="relative mt-3 block text-[1.75rem] font-bold"
        />
        <svg viewBox="0 0 140 40" className="relative mt-3 h-10 w-full" fill="none">
          <path d={SPARK_PATH} stroke="white" strokeOpacity="0.85" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
        <div className="relative mt-3 flex gap-4 text-[0.75rem] font-semibold">
          <span className="flex items-center gap-1 text-white/90">
            <ArrowUpRight className="h-3.5 w-3.5" /> {formatCurrency(6_500_000, 'IDR', { compact: true })}
          </span>
          <span className="flex items-center gap-1 text-white/70">
            <ArrowDownRight className="h-3.5 w-3.5" /> {formatCurrency(2_250_000, 'IDR', { compact: true })}
          </span>
        </div>
      </TiltCard>
    </div>

    {/* Budget ring — closest layer, moves the most. */}
    <div
      className="absolute right-0 top-0 w-[170px] transition-transform duration-700 ease-out-expo"
      data-bubble-obstacle
      style={depth(26)}
    >
      <TiltCard disabled={disabled} className="bg-white/80 p-4 shadow-float backdrop-blur-xl">
        <BudgetRing />
      </TiltCard>
    </div>

    {/* Weekly spending — back layer, moves the least. */}
    <div
      className="absolute bottom-6 right-4 w-[250px] transition-transform duration-700 ease-out-expo"
      data-bubble-obstacle
      style={depth(8)}
    >
      <TiltCard disabled={disabled} className="bg-white/75 p-5 shadow-float backdrop-blur-xl">
        <div className="flex items-baseline justify-between">
          <p className="text-[0.8125rem] font-bold text-ink-900">This week</p>
          <p className="text-[0.6875rem] font-medium text-ink-400">hover me</p>
        </div>
        <div className="mt-4 flex h-20 items-end gap-2">
          {BARS.map((height, index) => (
            <span
              key={index}
              className="flex-1 origin-bottom scale-y-[0.55] rounded-full bg-gradient-to-t from-accent-500 to-grape-400 transition-transform duration-500 ease-spring group-hover:scale-y-100"
              style={{ height: `${height}%`, transitionDelay: `${index * 40}ms` }}
            />
          ))}
        </div>
        <div className="mt-2 flex justify-between text-[0.625rem] font-semibold text-ink-400">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => (
            <span key={index} className="flex-1 text-center">
              {day}
            </span>
          ))}
        </div>
      </TiltCard>
    </div>

    {/* Floating transaction chips. */}
    <div className="absolute bottom-24 left-2 transition-transform duration-700 ease-out-expo"
      data-bubble-obstacle style={depth(32)}>
      <div className="flex animate-float items-center gap-2.5 rounded-full bg-white/90 py-2 pl-2 pr-4 shadow-lift backdrop-blur-xl">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-income-100 text-income-600">
          <ArrowUpRight className="h-4 w-4" />
        </span>
        <div className="leading-tight">
          <p className="text-[0.75rem] font-bold text-ink-900">Salary</p>
          <p className="money text-[0.75rem] font-semibold text-income-600">
            {formatCurrency(6_500_000, 'IDR', { signed: true })}
          </p>
        </div>
      </div>
    </div>

    <div className="absolute bottom-0 left-28 transition-transform duration-700 ease-out-expo"
      data-bubble-obstacle style={depth(20)}>
      <div className="flex animate-float-slow items-center gap-2.5 rounded-full bg-white/90 py-2 pl-2 pr-4 shadow-lift backdrop-blur-xl [animation-delay:1.2s]">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-expense-100 text-expense-600">
          <Coffee className="h-4 w-4" />
        </span>
        <div className="leading-tight">
          <p className="text-[0.75rem] font-bold text-ink-900">Coffee</p>
          <p className="money text-[0.75rem] font-semibold text-expense-600">
            {formatCurrency(-35_000, 'IDR', { signed: true })}
          </p>
        </div>
      </div>
    </div>
  </div>
);
