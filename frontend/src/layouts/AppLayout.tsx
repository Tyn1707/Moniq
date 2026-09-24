import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { BottomNav, Sidebar, Topbar } from '../components/layout/Navigation';
import { PAGE_TITLES } from '../components/layout/navItems';
import { TransactionFormModal } from '../components/transactions/TransactionFormModal';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import type { Transaction } from '../types';

/**
 * Authenticated application shell.
 *
 * The add/edit transaction dialog lives here rather than in each page, because
 * it is reachable from the sidebar, the mobile topbar, and several empty states.
 * A single instance means only one dialog can ever be open, and pages request it
 * through `useTransactionModal()`.
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

  const openCreate = useCallback(() => setModalState({ open: true, transaction: null }), []);
  const openEdit = useCallback(
    (transaction: Transaction) => setModalState({ open: true, transaction }),
    [],
  );
  const closeModal = useCallback(
    () => setModalState((state) => ({ ...state, open: false })),
    [],
  );

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
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="space-y-3 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-primary-600" />
          <p className="text-sm text-slate-500" role="status">
            Loading FinanceTrack…
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    // Remember where they were headed so login can return them there.
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!user.onboardingCompleted) {
    return <Navigate to="/onboarding" replace />;
  }

  const pageTitle = PAGE_TITLES[location.pathname] ?? 'FinanceTrack';

  return (
    <TransactionModalContext.Provider value={modalContext}>
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar
          user={user}
          onLogout={handleLogout}
          onAddTransaction={openCreate}
          isDrawerOpen={isDrawerOpen}
          onCloseDrawer={() => setDrawerOpen(false)}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar
            title={pageTitle}
            onOpenDrawer={() => setDrawerOpen(true)}
            onAddTransaction={openCreate}
          />

          {/* Bottom padding clears the fixed mobile nav. */}
          <main className="flex-1 px-4 pb-24 pt-5 sm:px-6 lg:px-8 lg:pb-10">
            <div className="mx-auto w-full max-w-7xl">
              <Outlet />
            </div>
          </main>

          <BottomNav />
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
