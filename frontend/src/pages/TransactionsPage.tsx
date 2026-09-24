import { useCallback, useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Plus, Receipt, SearchX } from 'lucide-react';
import { Card, Pagination, StatTile } from '../components/ui';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { TransactionListSkeleton } from '../components/ui/Skeleton';
import { EmptyState, ErrorState } from '../components/ui/States';
import { AnimatedCurrency, Reveal } from '../components/ui/Motion';
import { PageHeader } from '../components/layout/PageHeader';
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
  pageSize: 12,
};

/**
 * Transaction history (brief §12, §14, §20).
 *
 * Filters live in component state and go straight to the API, so the server does
 * the filtering, sorting and paging. The client never slices a dataset it
 * downloaded — that breaks the moment a user has more rows than one page.
 *
 * The tiles above the list summarise *the current page* and say so, because a
 * total that silently ignored the active filter would be misleading.
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

  const pageTotals = useMemo(() => {
    const rows = data?.data ?? [];
    return rows.reduce(
      (totals, row) => {
        if (row.type === 'INCOME') totals.income += row.amount;
        else totals.expense += row.amount;
        return totals;
      },
      { income: 0, expense: 0 },
    );
  }, [data]);

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
    if (isLoading) return <TransactionListSkeleton rows={8} />;

    if (isError || !data) return <ErrorState error={error} onRetry={() => void refetch()} />;

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
        {/* Dim while a new page or filter loads, rather than unmounting the list —
            a flash of empty space is more disorienting than a brief fade. */}
        <div
          aria-busy={isFetching || undefined}
          className={isFetching ? 'opacity-60 transition-opacity' : 'transition-opacity'}
        >
          <TransactionList
            transactions={data.data}
            currency={currency}
            onEdit={openEdit}
            onDelete={setPendingDelete}
            groupByDate={filters.sort === 'newest' || filters.sort === 'oldest'}
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
      <PageHeader
        eyebrow="History"
        title="Transactions"
        description="Search, filter and manage everything you have recorded."
        action={
          <Button onClick={openCreate} leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />}>
            Add transaction
          </Button>
        }
      />

      {data && data.data.length > 0 && (
        <Reveal>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatTile
              label="On this page"
              value={`${data.data.length} of ${data.pagination.totalItems}`}
              caption={
                hasFiltersApplied ? 'Matching your filters' : 'Across your whole history'
              }
            />
            <StatTile
              label="Income shown"
              tone="income"
              icon={<ArrowUpRight className="h-4 w-4" aria-hidden="true" />}
              value={<AnimatedCurrency value={pageTotals.income} currency={currency} />}
              caption="Sum of the rows below"
            />
            <StatTile
              label="Expense shown"
              tone="expense"
              icon={<ArrowDownLeft className="h-4 w-4" aria-hidden="true" />}
              value={<AnimatedCurrency value={pageTotals.expense} currency={currency} />}
              caption="Sum of the rows below"
            />
          </div>
        </Reveal>
      )}

      <Reveal delayStep={1}>
        <Card padding="flush">
          <TransactionFiltersBar
            filters={filters}
            onChange={updateFilters}
            onReset={resetFilters}
            resultCount={data?.pagination.totalItems ?? 0}
          />
          {renderBody()}
        </Card>
      </Reveal>

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
