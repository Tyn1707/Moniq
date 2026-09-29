import { describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from '../layout/Navigation';
import type { User } from '../../types';

/**
 * Collapsible desktop sidebar: the close control swaps the full brand for the
 * mascot-only rail, nav items stay reachable by name, and the mascot button
 * reopens the panel.
 */

const user = { name: 'Test User', email: 'test@example.com' } as User;

const Harness = ({ initiallyCollapsed = false }: { initiallyCollapsed?: boolean }) => {
  const [collapsed, setCollapsed] = useState(initiallyCollapsed);
  return (
    <MemoryRouter>
      <Sidebar
        user={user}
        balance={1_000}
        currency={'IDR' as User['currency']}
        onLogout={vi.fn()}
        onAddTransaction={vi.fn()}
        isDrawerOpen={false}
        onCloseDrawer={vi.fn()}
        isCollapsed={collapsed}
        onToggleCollapse={() => setCollapsed((value) => !value)}
      />
    </MemoryRouter>
  );
};

describe('Sidebar collapse', () => {
  it('shows the full wordmark and a close control when expanded', () => {
    render(<Harness />);
    expect(screen.getByRole('img', { name: 'Moniq' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close sidebar' })).toBeInTheDocument();
    expect(screen.getByText('Current balance')).toBeInTheDocument();
  });

  it('collapses to the mascot rail and keeps nav items accessible by name', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'Close sidebar' }));

    expect(screen.queryByRole('img', { name: 'Moniq' })).not.toBeInTheDocument();
    expect(screen.queryByText('Current balance')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open sidebar' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add transaction' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
  });

  it('reopens from the mascot button', async () => {
    render(<Harness initiallyCollapsed />);
    await userEvent.click(screen.getByRole('button', { name: 'Open sidebar' }));

    expect(screen.getByRole('img', { name: 'Moniq' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close sidebar' })).toBeInTheDocument();
  });
});
