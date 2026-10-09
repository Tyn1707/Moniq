import { useState } from 'react';
import { Plus, TrendingUp } from 'lucide-react';
import clsx from 'clsx';
import { Card } from '../components/ui';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { BudgetListSkeleton } from '../components/ui/Skeleton';
import { EmptyState, ErrorState } from '../components/ui/States';
import { Reveal, staggerClass } from '../components/ui/Motion';
import { PageHeader } from '../components/layout/PageHeader';
import {
  AllocationDonut,
  HoldingCard,
  HoldingFormModal,
  PortfolioHero,
} from '../components/portfolio/PortfolioComponents';
import { useDeleteHolding, usePortfolio } from '../hooks/useFinanceData';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { ApiError } from '../services/api';
import { formatCurrency } from '../utils/format';
import type { Holding } from '../types';

/**
 * Portfolio — live Indonesian-stock holdings priced from Yahoo Finance.
 *
 * Every figure (market value, P/L, day change, allocation) is computed on the
 * server from the stored position plus a live quote, so this page only arranges
 * and formats. It is intentionally kept apart from the cash ledger: recording
 * that you own shares is not a transaction and never moves your balance.
 */
export const PortfolioPage = () => {
  const { user } = useAuth();
  const toast = useToast();
  const currency = user?.currency ?? 'IDR';

  const { data, isLoading, isError, error, refetch, isFetching } = usePortfolio();
  const deleteMutation = useDeleteHolding();

  const [formState, setFormState] = useState<{ open: boolean; holding: Holding | null }>({
    open: false,
    holding: null,
  });
  const [pendingDelete, setPendingDelete] = useState<Holding | null>(null);

  const openCreate = () => setFormState({ open: true, holding: null });

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteMutation.mutateAsync(pendingDelete.id);
      toast.success('Holding removed from your portfolio.');
      setPendingDelete(null);
    } catch (deleteError) {
      toast.error(
        deleteError instanceof ApiError
          ? deleteError.message
          : 'Something went wrong. Please try again.',
      );
    }
  };

  // Sort by market value so the biggest positions lead; unpriced holdings last.
  const holdings = [...(data?.holdings ?? [])].sort(
    (a, b) => (b.marketValue ?? -1) - (a.marketValue ?? -1),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Investments"
        title="Portfolio"
        description="Live market value of your holdings. Prices are delayed ~15 minutes."
        action={
          <Button onClick={openCreate} leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />}>
            Add holding
          </Button>
        }
      />

      {isLoading && <BudgetListSkeleton />}

      {!isLoading && (isError || !data) && (
        <div className="surface">
          <ErrorState error={error} onRetry={() => void refetch()} />
        </div>
      )}

      {!isLoading && data && holdings.length === 0 && (
        <Reveal>
          <div className="surface">
            <EmptyState
              icon={<TrendingUp className="h-6 w-6" aria-hidden="true" />}
              title="No holdings yet."
              message="Add a stock you own — search by name or ticker (Indonesian stocks use the .JK suffix) — and Moniq will track its live market value, profit/loss and allocation."
              action={{ label: 'Add your first holding', onClick: openCreate }}
            />
          </div>
        </Reveal>
      )}

      {!isLoading && data && holdings.length > 0 && (
        <>
          <Reveal>
            <PortfolioHero
              totals={data.totals}
              currency={currency}
              pricesAsOf={data.pricesAsOf}
              pricesStale={data.pricesStale}
              holdingCount={data.holdingCount}
            />
          </Reveal>

          {/* Allocation + holdings, 2:3 split like the dashboard. */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
            <Reveal delayStep={1} className="xl:col-span-2">
              <Card
                title="Allocation"
                description="Share of total market value"
                className="h-full"
                action={
                  isFetching ? (
                    <span className="flex items-center gap-1.5 text-[0.6875rem] font-semibold text-ink-400">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-income-500" />
                      Live
                    </span>
                  ) : undefined
                }
              >
                <AllocationDonut holdings={holdings} currency={currency} />
              </Card>
            </Reveal>

            <div className="space-y-4 xl:col-span-3">
              {holdings.map((holding, index) => (
                <div key={holding.id} className={clsx('animate-reveal-up', staggerClass(index + 1))}>
                  <HoldingCard
                    holding={holding}
                    currency={currency}
                    onEdit={(target) => setFormState({ open: true, holding: target })}
                    onDelete={setPendingDelete}
                  />
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <HoldingFormModal
        isOpen={formState.open}
        onClose={() => setFormState((state) => ({ ...state, open: false }))}
        holding={formState.holding}
      />

      <ConfirmDialog
        isOpen={pendingDelete !== null}
        title="Remove this holding?"
        confirmLabel="Remove"
        message={
          pendingDelete
            ? `Remove ${pendingDelete.symbol} (${
                pendingDelete.marketValue !== null
                  ? formatCurrency(pendingDelete.marketValue, currency)
                  : formatCurrency(pendingDelete.costBasis, currency)
              }) from your portfolio? This only removes the tracked position — it does not affect your cash balance.`
            : ''
        }
        isLoading={deleteMutation.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
};
