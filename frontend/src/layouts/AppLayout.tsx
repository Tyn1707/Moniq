import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { BottomNav, Sidebar, Topbar } from '../components/layout/Navigation';
import { PAGE_SUBTITLES, PAGE_TITLES } from '../components/layout/navItems';
import { TransactionFormModal } from '../components/transactions/TransactionFormModal';
import { PageLoader } from '../components/ui/States';
import { useAuth } from '../hooks/useAuth';
import { useDashboard } from '../hooks/useFinanceData';
import { useToast } from '../hooks/useToast';
import type { Transaction } from '../types';

/**
 * Authenticated application shell.
 *
 * The add/edit transaction dialog lives here rather than in each page, because it
 * is reachable from the sidebar, the mobile FAB, and several empty states. A single
 * instance guarantees only one can be open, and pages request it via
 * `useTransactionModal()`.
 */

interface TransactionModalContextValue {
  openCreate: () => void;
  openEdit: (transaction: Transaction) => void;
}

const TransactionModalContext = createContext<TransactionModalContextValue | null>(null);

export const useTransactionModal = (): TransactionModalContextValue => {
  const context = useContext(TransactionModalContext);
  if (!context) throw new Error('useTransactionModal must be used inside AppLayout.');
  return context;
};

export const AppLayout = () => {
  const { user, isLoading, logout } = useAuth();
  const location = useLocation();
  const toast = useToast();

  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [modalState, setModalState] = useState<{ open: boolean; transaction: Transaction | null }>({
    open: false,
    transaction: null,
  });

  // Already cached by the dashboard page; read here only to show the balance in
  // the sidebar rail. React Query dedupes the request, so this costs nothing.
  const { data: dashboard } = useDashboard();

  const openCreate = useCallback(() => setModalState({ open: true, transaction: null }), []);
  const openEdit = useCallback(
    (transaction: Transaction) => setModalState({ open: true, transaction }),
    [],
  );
  const closeModal = useCallback(() => setModalState((state) => ({ ...state, open: false })), []);

  const modalContext = useMemo<TransactionModalContextValue>(
    () => ({ openCreate, openEdit }),
    [openCreate, openEdit],
  );

  const handleLogout = useCallback(async () => {
    await logout();
    toast.info('You have been signed out.');
  }, [logout, toast]);

  // Wait for the session check before deciding, otherwise a refresh would bounce
  // an authenticated user to the login page.
  if (isLoading) return <PageLoader />;

  if (!user) {
    // Remember where they were headed so login can return them there.
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!user.onboardingCompleted) return <Navigate to="/onboarding" replace />;

  const pageTitle = PAGE_TITLES[location.pathname] ?? 'FinanceTrack';
  const pageSubtitle = PAGE_SUBTITLES[location.pathname];

  return (
    <TransactionModalContext.Provider value={modalContext}>
      <div className="flex min-h-screen bg-ink-50">
        <Sidebar
          user={user}
          balance={dashboard?.summary.balance}
          currency={user.currency}
          onLogout={handleLogout}
          onAddTransaction={openCreate}
          isDrawerOpen={isDrawerOpen}
          onCloseDrawer={() => setDrawerOpen(false)}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar title={pageTitle} subtitle={pageSubtitle} onOpenDrawer={() => setDrawerOpen(true)} />

          {/* Bottom padding clears the fixed mobile nav and its FAB. */}
          <main className="flex-1 px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-12 lg:pt-8">
            {/* Keying on pathname replays the entrance animation on navigation,
                which makes route changes feel deliberate rather than abrupt. */}
            <div key={location.pathname} className="mx-auto w-full max-w-[84rem] animate-fade-in">
              <Outlet />
            </div>
          </main>

          <BottomNav onAddTransaction={openCreate} />
        </div>
      </div>

      <TransactionFormModal
        isOpen={modalState.open}
        onClose={closeModal}
        transaction={modalState.transaction}
      />
    </TransactionModalContext.Provider>
  );
};
