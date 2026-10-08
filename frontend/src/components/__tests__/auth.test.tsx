import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthTabs } from '../auth/AuthTabs';
import { AuthShowcase } from '../auth/AuthShowcase';
import { FeatureBubbles, collideBubbles } from '../auth/FeatureBubbles';
import { Input } from '../ui/Field';

/**
 * Auth-page pieces: the route switcher, the soft input appearance, and the
 * decorative showcase staying out of the accessibility tree.
 */

const renderTabsAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="*" element={<AuthTabs />} />
      </Routes>
    </MemoryRouter>,
  );

describe('AuthTabs', () => {
  it('marks the current route as the active page', () => {
    renderTabsAt('/register');
    expect(screen.getByRole('link', { name: 'Create account' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Sign in' })).not.toHaveAttribute('aria-current');
  });

  it('moves the active state when the other tab is clicked', async () => {
    renderTabsAt('/login');
    await userEvent.click(screen.getByRole('link', { name: 'Create account' }));
    expect(screen.getByRole('link', { name: 'Create account' })).toHaveAttribute('aria-current', 'page');
  });
});

describe('Input appearance="line"', () => {
  it('renders as an underline only and keeps label and error wiring', () => {
    render(<Input appearance="line" label="Email" error="Email is required." />);
    const input = screen.getByLabelText('Email');
    expect(input.className).toContain('border-0');
    expect(input.className).toContain('border-b');
    expect(input.className).toContain('bg-transparent');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Email is required.');
  });

  it('leaves the default appearance bordered', () => {
    render(<Input label="Name" />);
    expect(screen.getByLabelText('Name').className).toContain('border-ink-200');
  });
});

describe('AuthShowcase', () => {
  it('is hidden from assistive technology', () => {
    const { container } = render(<AuthShowcase disabled />);
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
  });

  it('shows the food budget at 23% at rest and 69% while hovered', async () => {
    render(<AuthShowcase disabled />);
    expect(screen.getByText('23%')).toBeInTheDocument();
    await userEvent.hover(screen.getByText('Food budget'));
    expect(await screen.findByText('69%')).toBeInTheDocument();
    await userEvent.unhover(screen.getByText('Food budget'));
    expect(await screen.findByText('23%')).toBeInTheDocument();
  });
});

describe('FeatureBubbles', () => {
  it('pops a bubble on hover, shows its description, and re-forms it on leave', async () => {
    const { container } = render(<FeatureBubbles disabled />);
    const bubbles = container.querySelectorAll<HTMLElement>('[data-bubble]');
    expect(bubbles).toHaveLength(3);

    await userEvent.hover(bubbles[0]!);
    expect(bubbles[0]).toHaveTextContent('Never estimated');
    expect(bubbles[0]!.querySelector('.animate-bubble-burst')).not.toBeNull();
    // The icon pops together with the bubble.
    expect(bubbles[0]!.querySelector('.animate-bubble-burst svg')).not.toBeNull();
    // The description zooms in centred on the bubble, not beside it.
    const card = bubbles[0]!.querySelector<HTMLElement>('[data-bubble-card]')!;
    expect(card.className).toContain('animate-card-zoom');
    expect(card.className).toContain('left-1/2');
    expect(card.className).toContain('top-1/2');

    await userEvent.unhover(bubbles[0]!);
    expect(bubbles[0]).not.toHaveTextContent('Never estimated');
    expect(bubbles[0]!.querySelector('.animate-bubble-in')).not.toBeNull();
  });

  it('exposes every feature to screen readers as a plain list', () => {
    render(<FeatureBubbles disabled />);
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByText(/Private by default:/)).toBeInTheDocument();
  });
});


/** Pure physics check: a bubble overlapping an obstacle is pushed clear. */
describe('FeatureBubbles obstacle avoidance', () => {
  it('moves a static bubble off any element marked as an obstacle', () => {
    // jsdom has no layout, so give the obstacle a rect covering the whole screen top.
    const obstacle = document.createElement('div');
    obstacle.setAttribute('data-bubble-obstacle', '');
    obstacle.getBoundingClientRect = () =>
      ({ left: 0, top: 0, right: 2000, bottom: 400, width: 2000, height: 400 }) as DOMRect;
    document.body.appendChild(obstacle);

    const { container } = render(<FeatureBubbles disabled />);
    container.querySelectorAll<HTMLElement>('[data-bubble]').forEach((bubble) => {
      const y = Number(/translate3d\([^,]+,\s*([-\d.]+)px/.exec(bubble.style.transform)?.[1]);
      expect(y).toBeGreaterThanOrEqual(400);
    });

    obstacle.remove();
  });
});

describe('collideBubbles', () => {
  it('swaps velocities in a head-on collision and separates the bubbles', () => {
    const a = { x: 0, y: 0, vx: 60, vy: 0 };
    const b = { x: 50, y: 0, vx: -60, vy: 0 };
    collideBubbles(a, b, false, false);
    expect(a.vx).toBe(-60);
    expect(b.vx).toBe(60);
    expect(b.x - a.x).toBeGreaterThanOrEqual(64);
  });

  it('bounces a moving bubble off a popped (frozen) one without moving it', () => {
    const popped = { x: 0, y: 0, vx: 60, vy: 0 };
    const moving = { x: 50, y: 0, vx: -60, vy: 0 };
    collideBubbles(popped, moving, true, false);
    expect(popped).toEqual({ x: 0, y: 0, vx: 60, vy: 0 });
    expect(moving.vx).toBe(60);
  });

  it('ignores bubbles that are not touching', () => {
    const a = { x: 0, y: 0, vx: 60, vy: 0 };
    const b = { x: 200, y: 0, vx: -60, vy: 0 };
    collideBubbles(a, b, false, false);
    expect(a.vx).toBe(60);
    expect(b.vx).toBe(-60);
  });
});

describe('FeatureBubbles inflate', () => {
  it('puffs up first, then bursts and shows the description', () => {
    vi.useFakeTimers();
    const { container } = render(<FeatureBubbles disabled={false} />);
    const bubble = container.querySelector<HTMLElement>('[data-bubble]')!;

    fireEvent.pointerEnter(bubble);
    expect(bubble.querySelector('.animate-bubble-inflate')).not.toBeNull();
    expect(bubble.querySelector('[data-bubble-card]')).toBeNull();

    act(() => {
      vi.advanceTimersByTime(520);
    });
    expect(bubble.querySelector('.animate-bubble-burst')).not.toBeNull();
    expect(bubble.querySelector('[data-bubble-card]')).not.toBeNull();
    vi.useRealTimers();
  });

  it('deflates without bursting if the pointer leaves mid-inflate', () => {
    vi.useFakeTimers();
    const { container } = render(<FeatureBubbles disabled={false} />);
    const bubble = container.querySelector<HTMLElement>('[data-bubble]')!;

    fireEvent.pointerEnter(bubble);
    act(() => {
      vi.advanceTimersByTime(200);
    });
    fireEvent.pointerLeave(bubble);
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(bubble.querySelector('.animate-bubble-in')).not.toBeNull();
    expect(bubble.querySelector('[data-bubble-card]')).toBeNull();
    vi.useRealTimers();
  });
});
