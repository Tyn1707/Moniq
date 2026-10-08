import { afterEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeToggle } from '../ui/ThemeToggle';
import { THEME_STORAGE_KEY, getTheme, setTheme } from '../../hooks/useTheme';

/**
 * Theme switch: announces itself as an on/off switch, flips the `dark` class
 * on <html>, and remembers the choice.
 */

afterEach(() => {
  setTheme('light');
  localStorage.clear();
});

describe('ThemeToggle', () => {
  it('is an accessible switch that starts off in light mode', () => {
    setTheme('light');
    render(<ThemeToggle />);
    const toggle = screen.getByRole('switch', { name: 'Dark mode' });
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    expect(document.documentElement).not.toHaveClass('dark');
  });

  it('switches to dark and back, persisting the choice', async () => {
    setTheme('light');
    render(<ThemeToggle />);
    const toggle = screen.getByRole('switch', { name: 'Dark mode' });

    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    expect(document.documentElement).toHaveClass('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(getTheme()).toBe('dark');

    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    expect(document.documentElement).not.toHaveClass('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
  });

  it('keeps every toggle on the page in sync', async () => {
    setTheme('light');
    render(
      <>
        <ThemeToggle />
        <ThemeToggle />
      </>,
    );
    const [first, second] = screen.getAllByRole('switch', { name: 'Dark mode' });
    await userEvent.click(first!);
    expect(second).toHaveAttribute('aria-checked', 'true');
  });
});
