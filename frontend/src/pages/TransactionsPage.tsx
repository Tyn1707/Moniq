import { useCallback, useState } from 'react';
import { Plus, Receipt, SearchX } from 'lucide-react';
import { Card, Pagination } from '../components/ui';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { TransactionListSkeleton } from '../components/ui/Skeleton';
import { EmptyState, ErrorState } from '../components/ui/States';
import { TransactionFiltersBar } from '../components/transactions/TransactionFiltersBar';
import { TransactionList } from '../components/transactions/TransactionList';
import { useDeleteTransaction, useTransactions } from '../hooks/useFinanceData';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { useTransactionModal } from '../layouts/AppLayout';
import { ApiError } from '../services/api';
import { formatCurrency } from '../utils/format';
import type { Transaction, TransactionFilters } from '../types';

const DEFAULT_FILTERS: TransactionFilters = {
  search: '',
  type: 'ALL',
  categoryId: 'ALL',
  datePreset: 'all',
  sort: 'newest',
  page: 1,
  pageSize: 10,
};

/**
 * Transaction history (brief §12, §14, §20).
 *
 * Filters live in component state and are passed straight to the API, so the
 * server does the filtering, sorting and paging. The client never slices a full
 * dataset it downloaded — that would break as soon as a user has more rows than
 * one page.
 */
export const TransactionsPage = () => {
  const { user } = useAuth();
  const toast = useToast();
  const { openCreate, openEdit } = useTransactionModal();

  const [filters, setFilters] = useState<TransactionFilters>(DEFAULT_FILTERS);
  const [pendingDelete, setPendingDelete] = useState<Transaction | null>(null);

  const { data, isLoading, isError, error, refetch, isFetching } = useTransactions(filters);
  const deleteMutation = useDeleteTransaction();

  const updateFilters = useCallback((next: Partial<TransactionFilters>) => {
    setFilters((current) => ({ ...current, ...next }));
  }, []);

  const resetFilters = useCallback(() => setFilters(DEFAULT_FILTERS), []);

  const currency = user?.currency ?? 'IDR';

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteMutation.mutateAsync(pendingDelete.id);
      toast.success('Transaction deleted successfully.');
      setPendingDelete(null);
    } catch (deleteError) {
      toast.error(
        deleteError instanceof ApiError
          ? deleteError.message
          : 'Something went wrong. Please try again.',
      );
    }
  };

  const hasFiltersApplied =
    Boolean(filters.search) ||
    filters.type !== 'ALL' ||
    filters.categoryId !== 'ALL' ||
    filters.datePreset !== 'all';

  const renderBody = () => {
    if (isLoading) return <TransactionListSkeleton />;

    if (isError || !data) {
      return <ErrorState error={error} onRetry={() => void refetch()} />;
    }

    if (data.data.length === 0) {
      return hasFiltersApplied ? (
        <EmptyState
          icon={<SearchX className="h-6 w-6" aria-hidden="true" />}
          title="No transactions match your filters."
          message="Try a different search term, or clear the filters to see everything again."
          action={{ label: 'Clear filters', onClick: resetFilters }}
        />
      ) : (
        <EmptyState
          icon={<Receipt className="h-6 w-6" aria-hidden="true" />}
          title="No transactions yet."
          message="Record your income and expenses to build up your history."
          action={{ label: '+ Add your first transaction', onClick: openCreate }}
        />
      );
    }

    return (
      <>
        <div aria-busy={isFetching || undefined}>
          <TransactionList
            transactions={data.data}
            currency={currency}
            onEdit={openEdit}
            onDelete={setPendingDelete}
          />
        </div>
        <Pagination
          page={data.pagination.page}
          totalPages={data.pagination.totalPages}
          totalItems={data.pagination.totalItems}
          pageSize={data.pagination.pageSize}
          hasNextPage={data.pagination.hasNextPage}
          hasPreviousPage={data.pagination.hasPreviousPage}
          onPageChange={(page) => updateFilters({ page })}
        />
      </>
    );
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">Transactions</h1>
          <p className="text-sm text-slate-500">
            Search, filter and manage everything you have recorded.
          </p>
        </div>
        <Button
          onClick={openCreate}
          leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
          className="hidden lg:inline-flex"
        >
          Add transaction
        </Button>
      </header>

      <Card bodyClassName="">
        <TransactionFiltersBar
          filters={filters}
          onChange={updateFilters}
          onReset={resetFilters}
          resultCount={data?.pagination.totalItems ?? 0}
        />
        {renderBody()}
      </Card>

      <ConfirmDialog
        isOpen={pendingDelete !== null}
        title="Delete this transaction?"
        message={
          pendingDelete
            ? `Are you sure you want to delete "${pendingDelete.description}" (${formatCurrency(
                pendingDelete.amount,
                currency,
              )})? Your balance will be recalculated and this cannot be undone.`
            : ''
        }
        isLoading={deleteMutation.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
};
