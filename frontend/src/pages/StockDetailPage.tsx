import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  Clock,
  Minus,
  Pencil,
} from 'lucide-react';
import clsx from 'clsx';
import { Badge, Card } from '../components/ui';
import { Button } from '../components/ui/Button';
import { ChartSkeleton } from '../components/ui/Skeleton';
import { EmptyState, ErrorState } from '../components/ui/States';
import { Reveal } from '../components/ui/Motion';
import { AnimatedCurrency } from '../components/ui/Motion';
import { InteractiveLineChart } from '../components/charts/Charts';
import { HoldingFormModal } from '../components/portfolio/PortfolioComponents';
import { usePortfolio, usePriceHistory } from '../hooks/useFinanceData';
import { useAuth } from '../hooks/useAuth';
import { formatCurrency, formatPercentage } from '../utils/format';
import type { ChartRange } from '../types';

/**
 * Per-stock detail view (`/portfolio/:symbol`).
 *
 * Pairs a real Yahoo price-history line (with the same range buttons + crosshair
 * as the balance chart) with the user's own position stats for that stock. The
 * position figures come from the already-cached portfolio list — no extra round
 * trip — while the price line is fetched per range on demand.
 */
export const StockDetailPage = () => {
  const { symbol = '' } = useParams();
  const { user } = useAuth();
  const currency = user?.currency ?? 'IDR';

  const [range, setRange] = useState<ChartRange>('3M');
  const [editOpen, setEditOpen] = useState(false);

  // The position comes from the portfolio list (cached by the portfolio page).
  const { data: portfolio, isLoading: portfolioLoading } = usePortfolio();
  const holding = portfolio?.holdings.find(
    (item) => item.symbol.toUpperCase() === symbol.toUpperCase(),
  );

  const {
    data: priceHistory,
    isLoading: historyLoading,
    isError: historyError,
    error,
    refetch,
  } = usePriceHistory(symbol, range);

  const headerPrice = holding?.currentPrice ?? null;
  const dayUp = (holding?.dayChange ?? 0) >= 0;
  const gain = (holding?.profitLoss ?? 0) >= 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Link
          to="/portfolio"
          className="inline-flex items-center gap-1.5 text-[0.8125rem] font-bold text-ink-500 transition hover:text-ink-800"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to portfolio
        </Link>
        {holding && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setEditOpen(true)}
            leftIcon={<Pencil className="h-4 w-4" aria-hidden="true" />}
          >
            Edit position
          </Button>
        )}
      </div>

      {/* Header: symbol, name, live price + day change */}
      <Reveal>
        <div className="theme-static relative overflow-hidden rounded-3xl bg-gradient-to-br from-ink-900 via-ink-800 to-accent-900 p-6 text-white shadow-float sm:p-8">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-accent-500/20 blur-3xl" aria-hidden="true" />
          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-base font-black backdrop-blur">
                {symbol.split('.')[0]?.slice(0, 4)}
              </span>
              <div className="min-w-0">
                <h1 className="font-display text-2xl font-black tracking-tight sm:text-3xl">{symbol}</h1>
                <p className="truncate text-[0.875rem] text-white/60">
                  {holding?.name ?? priceHistory?.shortName ?? 'Loading…'}
                </p>
              </div>
            </div>

            {headerPrice !== null && (
              <div className="text-right">
                <AnimatedCurrency
                  value={headerPrice}
                  currency={currency}
                  as="p"
                  className="font-display text-2xl font-black tracking-tight sm:text-3xl"
                />
                {holding?.dayChange !== null && holding?.dayChange !== undefined && (
                  <span
                    className={clsx(
                      'mt-1 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.8125rem] font-bold',
                      dayUp ? 'bg-income-500/20 text-income-200' : 'bg-expense-500/20 text-expense-200',
                    )}
                  >
                    {holding.dayChange === 0 ? (
                      <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : dayUp ? (
                      <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : (
                      <ArrowDownRight className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    {holding.dayChangePercentage !== null
                      ? formatPercentage(Math.abs(holding.dayChangePercentage), 2)
                      : formatCurrency(Math.abs(holding.dayChange), currency, { compact: true })}
                    <span className="opacity-70">today</span>
                  </span>
                )}
              </div>
            )}
          </div>

          {holding?.priceStale && (
            <div className="relative mt-4 flex items-center gap-1.5 text-[0.6875rem] text-white/50">
              <Clock className="h-3 w-3" aria-hidden="true" />
              Showing last known price — the market data provider was unreachable.
            </div>
          )}
        </div>
      </Reveal>

      {/* Price history chart */}
      <Reveal delayStep={1}>
        <Card title="Price history" description="Market close, delayed ~15 min via Yahoo Finance">
          {historyError ? (
            <ErrorState error={error} onRetry={() => void refetch()} />
          ) : historyLoading && !priceHistory ? (
            <ChartSkeleton height="h-72" />
          ) : (
            <InteractiveLineChart
              data={(priceHistory?.points ?? []).map((point) => ({
                date: point.date,
                value: point.close,
              }))}
              currency={currency}
              range={range}
              onRangeChange={setRange}
              seriesLabel="Price"
              intraday={range === '1W'}
              isLoading={historyLoading}
            />
          )}
        </Card>
      </Reveal>

      {/* Position stats */}
      {portfolioLoading && !holding ? (
        <ChartSkeleton height="h-32" />
      ) : holding ? (
        <Reveal delayStep={2}>
          <Card title="Your position" description={`How your ${holding.symbol} holding is doing`}>
            <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-4">
              <Stat label="Shares" value={holding.shares.toLocaleString()} />
              <Stat label="Avg buy price" value={formatCurrency(holding.avgBuyPrice, currency)} />
              <Stat label="Invested" value={formatCurrency(holding.costBasis, currency)} />
              <Stat
                label="Market value"
                value={holding.marketValue !== null ? formatCurrency(holding.marketValue, currency) : '—'}
              />
              <Stat
                label="Total return"
                value={
                  holding.profitLoss !== null
                    ? `${gain ? '+' : '−'}${formatCurrency(Math.abs(holding.profitLoss), currency)}`
                    : '—'
                }
                tone={gain ? 'up' : 'down'}
              />
              <Stat
                label="Return %"
                value={formatPercentage(holding.profitLossPercentage, 2)}
                tone={gain ? 'up' : 'down'}
              />
              <Stat
                label="Allocation"
                value={`${holding.allocation.toFixed(1)}%`}
              />
              <div className="flex items-end">
                <Badge tone={holding.priceStale ? 'warn' : 'income'} dot>
                  {holding.priceStale ? 'Stale price' : 'Live'}
                </Badge>
              </div>
            </div>
          </Card>
        </Reveal>
      ) : (
        <div className="surface">
          <EmptyState
            title="You don't hold this stock"
            message="You can still see its price history above. Add it to your portfolio to track your position."
            action={{ label: 'Add holding', onClick: () => setEditOpen(true) }}
          />
        </div>
      )}

      <HoldingFormModal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        holding={holding ?? null}
      />
    </div>
  );
};

const Stat = ({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  tone?: 'neutral' | 'up' | 'down';
}) => (
  <div>
    <p className="label-eyebrow">{label}</p>
    <p
      className={clsx(
        'money mt-1 text-[0.9375rem] font-bold tracking-tight sm:text-base',
        tone === 'up' ? 'text-income-600' : tone === 'down' ? 'text-expense-600' : 'text-ink-900',
      )}
    >
      {value}
    </p>
  </div>
);
