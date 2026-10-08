import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { PieChart, ShieldCheck, TrendingUp, type LucideIcon } from 'lucide-react';
import clsx from 'clsx';

/**
 * Soap-bubble feature highlights for the auth pages.
 *
 * - Bubbles live in a `fixed` layer, so they bounce off the edges of the
 *   *visible screen* (re-read every frame, so resizing works live), not the
 *   edges of a page that may be taller than the window.
 * - Every element marked `data-bubble-obstacle` (form card, headline, preview
 *   cards…) is a wall too. Bubbles bounce off content instead of drifting over
 *   it, so nothing on the page is ever hidden behind one.
 * - Hovering a bubble pops it (burst + droplets) and shows its description in
 *   place; moving away re-forms it and it carries on drifting.
 *
 * Positions live in refs and are written to `style.transform` directly, so the
 * simulation never re-renders React — only hover does. Under reduced motion the
 * bubbles sit still, already pushed clear of any obstacle.
 */

interface Feature {
  icon: LucideIcon;
  title: string;
  body: string;
  /** "r g b" used for the bubble's tint, icon and glow. */
  tint: string;
}

const FEATURES: Feature[] = [
  {
    icon: TrendingUp,
    title: 'Real balance',
    body: 'Never estimated — calculated from your own transactions.',
    tint: '99 102 241',
  },
  {
    icon: PieChart,
    title: 'Clear categories',
    body: 'See exactly where your money goes, month by month.',
    tint: '139 92 246',
  },
  {
    icon: ShieldCheck,
    title: 'Private by default',
    body: 'Hashed passwords, and your data is visible only to you.',
    tint: '16 185 129',
  },
];

const SIZE = 64;
const RADIUS = SIZE / 2;
/** Pixels per second. */
const SPEED = 60;
/** Breathing room kept between a bubble and any obstacle. */
const OBSTACLE_PADDING = 6;
const DROPLETS = 10;
/** Description card size, used to keep it on-screen when it replaces a bubble. */
const CARD_WIDTH = 224;
const CARD_HEIGHT = 84;
const EDGE_GAP = 8;
/**
 * Puffer-fish inflate before the burst: two quick gulps then a final swell to
 * `PUFF_SCALE`, ~520ms in total — long enough to read as "pumping up", short
 * enough that the description is not kept waiting.
 */
const PUFF_SCALE = 1.6;
const INFLATE_MS = 520;

interface Body {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

const viewport = () => ({
  width: document.documentElement.clientWidth || window.innerWidth,
  height: window.innerHeight,
});

const initialBodies = (): Body[] => {
  const { width, height } = typeof window === 'undefined' ? { width: 1024, height: 768 } : viewport();
  return FEATURES.map((_, index) => {
    const angle = index * 2.1 + 0.6;
    return {
      x: width * (0.08 + index * 0.3),
      y: height * (0.15 + index * 0.28),
      vx: Math.cos(angle) * SPEED,
      vy: Math.sin(angle) * SPEED,
    };
  });
};

/**
 * Pushes a circle out of a rectangle and reflects its velocity along the
 * contact normal. `screen` limits where a bubble buried inside a rectangle may
 * exit to, so it is never shoved off-screen and clamped straight back in.
 */
const collideWithRect = (body: Body, rect: Rect, screen: { width: number; height: number }) => {
  const cx = body.x + RADIUS;
  const cy = body.y + RADIUS;
  const nearestX = Math.max(rect.left, Math.min(cx, rect.right));
  const nearestY = Math.max(rect.top, Math.min(cy, rect.bottom));
  let nx = cx - nearestX;
  let ny = cy - nearestY;
  const distance = Math.hypot(nx, ny);

  if (distance >= RADIUS) return;

  if (distance === 0) {
    // Centre is inside the rectangle: leave through the nearest side that is on-screen.
    const exits = [
      { x: rect.left - SIZE, y: body.y, nx: -1, ny: 0 },
      { x: rect.right, y: body.y, nx: 1, ny: 0 },
      { x: body.x, y: rect.top - SIZE, nx: 0, ny: -1 },
      { x: body.x, y: rect.bottom, nx: 0, ny: 1 },
    ].map((exit) => ({ ...exit, d: Math.hypot(exit.x - body.x, exit.y - body.y) }));
    const onScreen = exits.filter(
      (exit) =>
        exit.x >= 0 && exit.y >= 0 && exit.x <= screen.width - SIZE && exit.y <= screen.height - SIZE,
    );
    const exit = (onScreen.length ? onScreen : exits).sort((a, b) => a.d - b.d)[0]!;
    nx = exit.nx;
    ny = exit.ny;
    body.x = exit.x;
    body.y = exit.y;
  } else {
    nx /= distance;
    ny /= distance;
    body.x += nx * (RADIUS - distance);
    body.y += ny * (RADIUS - distance);
  }

  // Only reflect when moving into the surface, otherwise the bubble would stick.
  const dot = body.vx * nx + body.vy * ny;
  if (dot < 0) {
    body.vx -= 2 * dot * nx;
    body.vy -= 2 * dot * ny;
  }
};

/**
 * Bubble-vs-bubble bounce. Equal masses, so an elastic collision simply swaps
 * the velocity components along the line between centres. A popped bubble is
 * frozen, so it acts as a fixed post: only the other one moves and reflects.
 */
export const collideBubbles = (
  a: Body,
  b: Body,
  aFixed: boolean,
  bFixed: boolean,
  /** Centre distance at which they touch; larger while one is puffed up. */
  minDistance = SIZE,
) => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const distance = Math.hypot(dx, dy);
  if (distance >= minDistance || (aFixed && bFixed)) return;

  // Coincident centres: pick an arbitrary normal rather than divide by zero.
  const nx = distance === 0 ? 1 : dx / distance;
  const ny = distance === 0 ? 0 : dy / distance;
  const overlap = minDistance - distance;

  // Separate first, so they cannot stay interlocked across frames.
  if (aFixed) {
    b.x += nx * overlap;
    b.y += ny * overlap;
  } else if (bFixed) {
    a.x -= nx * overlap;
    a.y -= ny * overlap;
  } else {
    a.x -= (nx * overlap) / 2;
    a.y -= (ny * overlap) / 2;
    b.x += (nx * overlap) / 2;
    b.y += (ny * overlap) / 2;
  }

  // Closing speed along the normal; already separating means nothing to do.
  const closing = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
  if (closing <= 0) return;

  if (aFixed) {
    const dot = b.vx * nx + b.vy * ny;
    b.vx -= 2 * dot * nx;
    b.vy -= 2 * dot * ny;
  } else if (bFixed) {
    const dot = a.vx * nx + a.vy * ny;
    a.vx -= 2 * dot * nx;
    a.vy -= 2 * dot * ny;
  } else {
    a.vx -= closing * nx;
    a.vy -= closing * ny;
    b.vx += closing * nx;
    b.vy += closing * ny;
  }
};

/** Transparent soap-film look: clear centre, tinted edge, specular highlights. */
const bubbleStyle = (tint: string): CSSProperties => ({
  width: SIZE,
  height: SIZE,
  background: [
    'radial-gradient(circle at 30% 26%, rgb(255 255 255 / 0.95) 0 5%, rgb(255 255 255 / 0) 13%)',
    'radial-gradient(circle at 72% 76%, rgb(255 255 255 / 0.5) 0 3%, rgb(255 255 255 / 0) 9%)',
    `radial-gradient(circle at 50% 50%, rgb(255 255 255 / 0) 55%, rgb(${tint} / 0.14) 74%, rgb(255 255 255 / 0.5) 100%)`,
  ].join(', '),
  boxShadow: [
    'inset 0 0 0 1px rgb(255 255 255 / 0.65)',
    `inset -6px -8px 16px rgb(${tint} / 0.22)`,
    'inset 6px 6px 14px rgb(255 255 255 / 0.4)',
    `0 10px 24px -14px rgb(${tint} / 0.55)`,
  ].join(', '),
});

/** Iridescent rim: a rotating rainbow masked down to a thin ring. */
const RIM_STYLE: CSSProperties = {
  background:
    'conic-gradient(from 0deg, #a5b4fc, #f0abfc, #67e8f9, #bbf7d0, #fde68a, #fbcfe8, #a5b4fc)',
  WebkitMask: 'radial-gradient(circle, transparent 62%, black 70%, black 100%)',
  mask: 'radial-gradient(circle, transparent 62%, black 70%, black 100%)',
};

export const FeatureBubbles = ({ disabled }: { disabled: boolean }) => {
  const bodies = useRef<Body[]>(initialBodies());
  const nodes = useRef<(HTMLDivElement | null)[]>([]);
  const poppedRef = useRef<number | null>(null);
  const [popped, setPopped] = useState<{
    index: number;
    shiftX: number;
    shiftY: number;
    phase: 'inflate' | 'burst';
  } | null>(null);
  const burstTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  poppedRef.current = popped?.index ?? null;

  useEffect(
    () => () => {
      if (burstTimer.current) clearTimeout(burstTimer.current);
    },
    [],
  );

  useEffect(() => {
    let obstacles: Element[] = [];
    let framesSinceQuery = Infinity;

    const place = () =>
      bodies.current.forEach((body, index) => {
        const node = nodes.current[index];
        if (node) node.style.transform = `translate3d(${body.x}px, ${body.y}px, 0)`;
      });

    const advance = (dt: number) => {
      // Re-query occasionally: route changes swap content in and out.
      if (framesSinceQuery++ > 30) {
        obstacles = Array.from(document.querySelectorAll('[data-bubble-obstacle]'));
        framesSinceQuery = 0;
      }
      const rects: Rect[] = [];
      for (const element of obstacles) {
        const r = element.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue; // e.g. the mobile-only logo on desktop
        rects.push({
          left: r.left - OBSTACLE_PADDING,
          top: r.top - OBSTACLE_PADDING,
          right: r.right + OBSTACLE_PADDING,
          bottom: r.bottom + OBSTACLE_PADDING,
        });
      }

      const { width, height } = viewport();

      const all = bodies.current;
      const frozen = poppedRef.current;

      all.forEach((body, index) => {
        if (index === frozen) return;
        body.x += body.vx * dt;
        body.y += body.vy * dt;
      });

      for (let i = 0; i < all.length; i++) {
        for (let j = i + 1; j < all.length; j++) {
          // A hovered bubble is puffed up, so others bounce off its bigger outline.
          const touching = i === frozen || j === frozen ? RADIUS + RADIUS * PUFF_SCALE : SIZE;
          collideBubbles(all[i]!, all[j]!, i === frozen, j === frozen, touching);
        }
      }

      all.forEach((body, index) => {
        if (index === frozen) return;

        for (const rect of rects) collideWithRect(body, rect, { width, height });

        // Screen edges last, so an obstacle can never push a bubble off-screen.
        if (body.x < 0) { body.x = 0; body.vx = Math.abs(body.vx); }
        if (body.x > width - SIZE) { body.x = width - SIZE; body.vx = -Math.abs(body.vx); }
        if (body.y < 0) { body.y = 0; body.vy = Math.abs(body.vy); }
        if (body.y > height - SIZE) { body.y = height - SIZE; body.vy = -Math.abs(body.vy); }
      });
      place();
    };

    if (disabled || typeof requestAnimationFrame !== 'function') {
      // Static: resolve a few passes so each bubble settles clear of content.
      for (let pass = 0; pass < 4; pass++) advance(0);
      return;
    }

    let frame = 0;
    let last = performance.now();
    const step = (now: number) => {
      // Clamp dt so a backgrounded tab does not teleport bubbles on return.
      advance(Math.min((now - last) / 1000, 0.05));
      last = now;
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [disabled]);


  /**
   * Pops a bubble. The description card is centred exactly where the bubble
   * was; near a screen edge it is nudged inwards just enough to stay visible.
   */
  const pop = (index: number) => {
    const body = bodies.current[index]!;
    const { width, height } = viewport();
    const cx = body.x + RADIUS;
    const cy = body.y + RADIUS;
    const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
    const shiftX = clamp(cx, CARD_WIDTH / 2 + EDGE_GAP, width - CARD_WIDTH / 2 - EDGE_GAP) - cx;
    const shiftY = clamp(cy, CARD_HEIGHT / 2 + EDGE_GAP, height - CARD_HEIGHT / 2 - EDGE_GAP) - cy;

    // Puff up first, then burst. Reduced motion skips straight to the burst.
    if (burstTimer.current) clearTimeout(burstTimer.current);
    if (disabled) {
      setPopped({ index, shiftX, shiftY, phase: 'burst' });
      return;
    }
    setPopped({ index, shiftX, shiftY, phase: 'inflate' });
    burstTimer.current = setTimeout(
      () => setPopped((current) => (current?.index === index ? { ...current, phase: 'burst' } : current)),
      INFLATE_MS,
    );
  };

  /** Leaving mid-inflate lets the bubble deflate; leaving after the burst re-forms it. */
  const release = () => {
    if (burstTimer.current) clearTimeout(burstTimer.current);
    setPopped(null);
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-20">
      {/* Screen readers get the same content as a plain list. */}
      <ul className="sr-only">
        {FEATURES.map((feature) => (
          <li key={feature.title}>
            {feature.title}: {feature.body}
          </li>
        ))}
      </ul>

      {FEATURES.map((feature, index) => {
        const isActive = popped?.index === index;
        const isInflating = isActive && popped.phase === 'inflate';
        const isPopped = isActive && popped.phase === 'burst';
        return (
          // The wrapper stays put as the hover target even while the bubble is
          // gone; the description card is its child, so hovering the card keeps
          // the bubble popped and leaving both brings it back.
          <div
            key={feature.title}
            ref={(node) => {
              nodes.current[index] = node;
            }}
            aria-hidden="true"
            data-bubble
            className={clsx(
              'pointer-events-auto absolute left-0 top-0 cursor-pointer will-change-transform',
              isActive && 'z-10',
            )}
            style={{ width: SIZE, height: SIZE }}
            onPointerEnter={() => pop(index)}
            onPointerLeave={release}
          >
            <div className="animate-float" style={{ animationDelay: `${index * -1.7}s` }}>
              {/* Bubble and icon puff up, then pop together. */}
              <div
                className={
                  isPopped ? 'animate-bubble-burst' : isInflating ? 'animate-bubble-inflate' : 'animate-bubble-in'
                }
              >
                <div
                  className="relative flex animate-bubble-wobble items-center justify-center rounded-full backdrop-blur-[1.5px]"
                  style={{ ...bubbleStyle(feature.tint), animationDelay: `${index * -1.1}s` }}
                >
                  <span className="absolute inset-0 animate-spin-slow rounded-full opacity-50" style={RIM_STYLE} />
                  <feature.icon
                    className="relative h-6 w-6"
                    style={{ color: `rgb(${feature.tint} / 0.75)` }}
                    strokeWidth={2.25}
                  />
                </div>
              </div>
            </div>

            {isPopped && (
              <>
                {/* Burst: droplets fly outward from where the bubble was. */}
                {Array.from({ length: DROPLETS }, (_, drop) => {
                  const angle = (drop / DROPLETS) * Math.PI * 2;
                  // Fly out from the inflated rim, not the original one.
                  const reach = (34 + (drop % 3) * 8) * PUFF_SCALE;
                  return (
                    <span
                      key={drop}
                      className="absolute left-1/2 top-1/2 h-1.5 w-1.5 animate-droplet rounded-full"
                      style={
                        {
                          background: `rgb(${feature.tint} / 0.6)`,
                          '--dx': `${Math.cos(angle) * reach}px`,
                          '--dy': `${Math.sin(angle) * reach}px`,
                        } as CSSProperties
                      }
                    />
                  );
                })}

                {/* Description zooms out of the burst, in the bubble's place. */}
                <div
                  data-bubble-card
                  className="absolute left-1/2 top-1/2 animate-card-zoom rounded-2xl bg-white/95 px-4 py-3 shadow-float backdrop-blur-xl"
                  style={
                    {
                      width: CARD_WIDTH,
                      minHeight: CARD_HEIGHT,
                      '--sx': `${popped.shiftX}px`,
                      '--sy': `${popped.shiftY}px`,
                    } as CSSProperties
                  }
                >
                  <p className="flex items-center gap-1.5 text-[0.8125rem] font-bold text-ink-900">
                    <feature.icon className="h-3.5 w-3.5" style={{ color: `rgb(${feature.tint})` }} />
                    {feature.title}
                  </p>
                  <p className="mt-0.5 text-[0.75rem] leading-relaxed text-ink-500">{feature.body}</p>
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
};
