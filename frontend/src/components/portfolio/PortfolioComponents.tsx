import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowDownRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  Clock,
  Minus,
  Pencil,
  Search,
  TrendingUp,
  Trash2,
} from 'lucide-react';
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
} from 'recharts';
import clsx from 'clsx';
import { Badge } from '../ui';
import { Button } from '../ui/Button';
import { FormattedAmountInput, FormattedNumberInput, Input } from '../ui/Field';
import { Modal } from '../ui/Modal';
import { AnimatedCurrency, AnimatedPercentage } from '../ui/Motion';
import {
  useCreateHolding,
  useUpdateHolding,
} from '../../hooks/useFinanceData';
import { useToast } from '../../hooks/useToast';
import { ApiError } from '../../services/api';
import { portfolioService } from '../../services';
import { formatCurrency, formatPercentage } from '../../utils/format';
import type { Currency, Holding, PortfolioTotals, Quote, SymbolSearchResult } from '../../types';

// Allocation palette — a single indigo→violet hue stepped in lightness, matching
// the expense donut, so the ranking reads as an ordering not six random colours.
const ALLOCATION_COLOURS = [
  '#4f46e5',
  '#6366f1',
  '#818cf8',
  '#a5b4fc',
  '#8b5cf6',
  '#a78bfa',
  '#c7d2fe',
  '#94a3b8',
];

/** Relative "x minutes ago" from an ISO timestamp, for the "prices as of" note. */
const relativeTime = (iso: string | null): string => {
  if (!iso) return 'not yet';
  const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return `${Math.round(hours / 24)} d ago`;
};

// ---------------------------------------------------------------------------
// Net worth hero
// ---------------------------------------------------------------------------

/**
 * The portfolio headline. A dark gradient hero echoing the dashboard's balance
 * card, but here the headline is total market value and the eye is drawn to the
 * day's movement — up in emerald, down in rose — because "how is my portfolio
 * doing right now" is the question this page answers.
 */
export const PortfolioHero = ({
  totals,
  currency,
  pricesAsOf,
  pricesStale,
  holdingCount,
}: {
  totals: PortfolioTotals;
  currency: Currency;
  pricesAsOf: string | null;
  pricesStale: boolean;
  holdingCount: number;
}) => {
  const isUp = totals.dayChange >= 0;
  const totalGain = totals.profitLoss >= 0;

  return (
    <div className="theme-static relative overflow-hidden rounded-3xl bg-gradient-to-br from-ink-900 via-ink-800 to-accent-900 p-6 text-white shadow-float sm:p-8">
      {/* Soft glow accents */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-accent-500/20 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-income-500/10 blur-3xl" aria-hidden="true" />

      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[0.6875rem] font-bold uppercase tracking-widest text-white/60">
            Portfolio value
          </p>
          <AnimatedCurrency
            value={totals.marketValue}
            currency={currency}
            as="p"
            className="mt-1.5 font-display text-4xl font-black tracking-tight sm:text-5xl"
          />

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span
              className={clsx(
                'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.8125rem] font-bold',
                isUp ? 'bg-income-500/20 text-income-200' : 'bg-expense-500/20 text-expense-200',
              )}
            >
              {isUp ? (
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <ArrowDownRight className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {formatCurrency(Math.abs(totals.dayChange), currency, { signed: false })}
              {totals.dayChangePercentage !== null && (
                <span className="opacity-80">
                  ({formatPercentage(Math.abs(totals.dayChangePercentage), 2)})
                </span>
              )}
            </span>
            <span className="text-[0.75rem] text-white/50">today</span>
          </div>
        </div>

        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 backdrop-blur">
          <TrendingUp className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>

      {/* Figures rail */}
      <div className="relative mt-7 grid grid-cols-2 gap-4 border-t border-white/10 pt-5 sm:grid-cols-4">
        <HeroFigure label="Invested" value={formatCurrency(totals.costBasis, currency)} />
        <HeroFigure
          label="Total P/L"
          value={formatCurrency(Math.abs(totals.profitLoss), currency)}
          tone={totalGain ? 'up' : 'down'}
          prefix={totals.profitLoss === 0 ? '' : totalGain ? '+' : '−'}
        />
        <HeroFigure
          label="Return"
          value={formatPercentage(totals.profitLossPercentage, 2)}
          tone={totalGain ? 'up' : 'down'}
        />
        <HeroFigure label="Holdings" value={String(holdingCount)} />
      </div>

      <div className="relative mt-4 flex items-center gap-1.5 text-[0.6875rem] text-white/50">
        <Clock className="h-3 w-3" aria-hidden="true" />
        <span>
          {pricesStale ? 'Showing last known prices · ' : ''}Prices updated {relativeTime(pricesAsOf)} ·
          delayed ~15 min via Yahoo Finance
        </span>
      </div>
    </div>
  );
};

const HeroFigure = ({
  label,
  value,
  tone = 'neutral',
  prefix = '',
}: {
  label: string;
  value: string;
  tone?: 'neutral' | 'up' | 'down';
  prefix?: string;
}) => (
  <div className="min-w-0">
    <p className="text-[0.625rem] font-bold uppercase tracking-widest text-white/50">{label}</p>
    <p
      className={clsx(
        'money mt-1 truncate text-[0.9375rem] font-bold sm:text-base',
        tone === 'up' ? 'text-income-300' : tone === 'down' ? 'text-expense-300' : 'text-white',
      )}
    >
      {prefix}
      {value}
    </p>
  </div>
);

// ---------------------------------------------------------------------------
// Allocation donut
// ---------------------------------------------------------------------------

export const AllocationDonut = ({
  holdings,
  currency,
}: {
  holdings: Holding[];
  currency: Currency;
}) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // Only priced holdings have a market value to allocate.
  const data = useMemo(
    () =>
      holdings
        .filter((holding) => holding.marketValue !== null && holding.marketValue > 0)
        .map((holding) => ({
          symbol: holding.symbol,
          name: holding.name,
          value: holding.marketValue as number,
          allocation: holding.allocation,
        }))
        .sort((a, b) => b.value - a.value),
    [holdings],
  );

  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-[0.8125rem] text-ink-500">
        Allocation appears once live prices are available.
      </p>
    );
  }

  const total = data.reduce((sum, item) => sum + item.value, 0);
  const focused = activeIndex !== null ? data[activeIndex] : null;

  return (
    <div className="space-y-5">
      <div className="relative mx-auto h-48 w-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="symbol"
              innerRadius="68%"
              outerRadius="100%"
              paddingAngle={2.5}
              stroke="none"
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              {data.map((item, index) => (
                <Cell
                  key={item.symbol}
                  fill={ALLOCATION_COLOURS[index % ALLOCATION_COLOURS.length]}
                  opacity={activeIndex === null || activeIndex === index ? 1 : 0.35}
                  className="transition-opacity duration-200"
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
          <p className="label-eyebrow truncate">{focused ? focused.symbol : 'Total'}</p>
          <p className="money mt-0.5 text-[1.0625rem] font-bold text-ink-900">
            {formatCurrency(focused ? focused.value : total, currency, { compact: true })}
          </p>
          {focused && (
            <p className="text-[0.6875rem] font-semibold text-accent-600 tabular">
              {focused.allocation.toFixed(1)}%
            </p>
          )}
        </div>
      </div>

      <ul className="space-y-1">
        {data.slice(0, 8).map((item, index) => (
          <li key={item.symbol}>
            <button
              type="button"
              onMouseEnter={() => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
              onFocus={() => setActiveIndex(index)}
              onBlur={() => setActiveIndex(null)}
              className={clsx(
                'flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left text-[0.8125rem] transition-colors',
                activeIndex === index ? 'bg-ink-100' : 'hover:bg-ink-50',
              )}
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: ALLOCATION_COLOURS[index % ALLOCATION_COLOURS.length] }}
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1 truncate font-semibold text-ink-700">{item.symbol}</span>
              <span className="font-bold text-ink-900 tabular">{item.allocation.toFixed(1)}%</span>
              <span className="money w-24 text-right text-ink-500">
                {formatCurrency(item.value, currency, { compact: true })}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Holding card
// ---------------------------------------------------------------------------

export const HoldingCard = ({
  holding,
  currency,
  onEdit,
  onDelete,
}: {
  holding: Holding;
  currency: Currency;
  onEdit: (holding: Holding) => void;
  onDelete: (holding: Holding) => void;
}) => {
  const hasPrice = holding.currentPrice !== null;
  const gain = (holding.profitLoss ?? 0) >= 0;
  const dayUp = (holding.dayChange ?? 0) >= 0;

  return (
    <article className="surface-interactive group p-5">
      <div className="flex items-start justify-between gap-3">
        <Link
          to={`/portfolio/${encodeURIComponent(holding.symbol)}`}
          className="group/link flex min-w-0 items-center gap-3 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-accent-400"
        >
          {/* Ticker chip — the first segment of the symbol, before the exchange suffix. */}
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-gradient text-[0.8125rem] font-black text-white">
            {holding.symbol.split('.')[0]?.slice(0, 4)}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="truncate text-[0.9375rem] font-bold tracking-tight text-ink-900 group-hover/link:text-accent-700">
                {holding.symbol}
              </h3>
              <ChevronRight
                className="h-3.5 w-3.5 shrink-0 text-ink-300 transition-transform group-hover/link:translate-x-0.5 group-hover/link:text-accent-500"
                aria-hidden="true"
              />
              {holding.priceStale && <Badge tone="warn">Stale</Badge>}
            </div>
            <p className="truncate text-[0.8125rem] text-ink-500">{holding.name}</p>
          </div>
        </Link>

        <div className="flex items-center gap-0.5 opacity-100 transition-opacity duration-200 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
          <button
            type="button"
            onClick={() => onEdit(holding)}
            className="press rounded-lg p-2 text-ink-400 transition hover:bg-accent-50 hover:text-accent-600"
            aria-label={`Edit ${holding.symbol}`}
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(holding)}
            className="press rounded-lg p-2 text-ink-400 transition hover:bg-expense-50 hover:text-expense-600"
            aria-label={`Remove ${holding.symbol}`}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Market value + day change */}
      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <p className="label-eyebrow">Market value</p>
          {hasPrice ? (
            <AnimatedCurrency
              value={holding.marketValue as number}
              currency={currency}
              as="p"
              className="mt-0.5 font-display text-xl font-bold text-ink-900"
            />
          ) : (
            <p className="mt-0.5 text-xl font-bold text-ink-400">—</p>
          )}
        </div>
        {hasPrice && holding.dayChange !== null && (
          <span
            className={clsx(
              'inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[0.75rem] font-bold',
              dayUp ? 'bg-income-50 text-income-700' : 'bg-expense-50 text-expense-700',
            )}
          >
            {holding.dayChange === 0 ? (
              <Minus className="h-3 w-3" aria-hidden="true" />
            ) : dayUp ? (
              <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
            ) : (
              <ArrowDownRight className="h-3 w-3" aria-hidden="true" />
            )}
            {holding.dayChangePercentage !== null
              ? formatPercentage(Math.abs(holding.dayChangePercentage), 2)
              : formatCurrency(Math.abs(holding.dayChange), currency, { compact: true })}
          </span>
        )}
      </div>

      {/* Allocation bar */}
      {hasPrice && (
        <div className="mt-3">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-200/70">
            <div
              className="h-full rounded-full bg-accent-gradient transition-[width] duration-700 ease-out-expo"
              style={{ width: `${Math.min(holding.allocation, 100)}%` }}
            />
          </div>
          <p className="mt-1 text-[0.6875rem] font-semibold text-ink-400">
            {holding.allocation.toFixed(1)}% of portfolio
          </p>
        </div>
      )}

      {/* Position detail grid */}
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 border-t border-ink-100 pt-4 text-[0.8125rem]">
        <Detail label="Shares" value={holding.shares.toLocaleString()} />
        <Detail
          label="Avg cost"
          value={formatCurrency(holding.avgBuyPrice, currency)}
        />
        <Detail
          label="Last price"
          value={hasPrice ? formatCurrency(holding.currentPrice as number, currency) : '—'}
        />
        <Detail label="Invested" value={formatCurrency(holding.costBasis, currency)} />
      </dl>

      {/* Total P/L footer */}
      {hasPrice && holding.profitLoss !== null && (
        <div
          className={clsx(
            'mt-4 flex items-center justify-between rounded-xl px-3.5 py-2.5',
            gain ? 'bg-income-50/70' : 'bg-expense-50/70',
          )}
        >
          <span className="text-[0.75rem] font-bold uppercase tracking-wide text-ink-500">
            Total return
          </span>
          <span
            className={clsx(
              'money flex items-center gap-2 text-[0.9375rem] font-bold',
              gain ? 'text-income-700' : 'text-expense-700',
            )}
          >
            {gain ? '+' : '−'}
            {formatCurrency(Math.abs(holding.profitLoss), currency)}
            <AnimatedPercentage
              value={holding.profitLossPercentage}
              fractionDigits={2}
              className={clsx(
                'rounded-md px-1.5 py-0.5 text-[0.75rem]',
                gain ? 'bg-income-100 text-income-700' : 'bg-expense-100 text-expense-700',
              )}
            />
          </span>
        </div>
      )}
    </article>
  );
};

const Detail = ({ label, value }: { label: string; value: string }) => (
  <div>
    <dt className="text-[0.6875rem] font-semibold uppercase tracking-wide text-ink-400">{label}</dt>
    <dd className="money mt-0.5 font-bold text-ink-800">{value}</dd>
  </div>
);

// ---------------------------------------------------------------------------
// Add / edit holding modal
// ---------------------------------------------------------------------------

const positiveNumber = (field: string) =>
  z
    .string()
    .min(1, `${field} is required.`)
    .refine((value) => Number.isFinite(Number(value)), `${field} must be a valid number.`)
    .refine((value) => Number(value) > 0, `${field} must be greater than 0.`);

const schema = z.object({
  symbol: z
    .string()
    .trim()
    .min(1, 'Symbol is required.')
    .max(20, 'Symbol is too long.')
    .regex(/^[A-Za-z0-9.^=-]+$/, 'Symbol contains invalid characters.'),
  name: z.string().trim().max(80, 'Name is too long.').optional(),
  shares: positiveNumber('Shares'),
  avgBuyPrice: positiveNumber('Average buy price'),
});

type FormValues = z.infer<typeof schema>;

export const HoldingFormModal = ({
  isOpen,
  onClose,
  holding = null,
}: {
  isOpen: boolean;
  onClose: () => void;
  holding?: Holding | null;
}) => {
  const toast = useToast();
  const isEditing = holding !== null;
  const createMutation = useCreateHolding();
  const updateMutation = useUpdateHolding();
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    watch,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { symbol: '', name: '', shares: '', avgBuyPrice: '' },
  });

  // Symbol search (create mode only — editing locks the instrument).
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SymbolSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  // Live quote preview for the chosen symbol.
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);

  const symbolValue = watch('symbol');

  useEffect(() => {
    if (!isOpen) return;
    reset(
      holding
        ? {
            symbol: holding.symbol,
            name: holding.name,
            shares: String(holding.shares),
            avgBuyPrice: String(holding.avgBuyPrice),
          }
        : { symbol: '', name: '', shares: '', avgBuyPrice: '' },
    );
    setQuery('');
    setResults([]);
    setShowResults(false);
    setQuote(null);
  }, [isOpen, holding, reset]);

  // Debounced ticker search.
  const searchTimer = useRef<number>();
  useEffect(() => {
    if (isEditing) return;
    if (searchTimer.current) window.clearTimeout(searchTimer.current);
    const trimmed = query.trim();
    if (trimmed.length < 1) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    searchTimer.current = window.setTimeout(async () => {
      try {
        const response = await portfolioService.search(trimmed);
        setResults(response.data);
        setShowResults(true);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => {
      if (searchTimer.current) window.clearTimeout(searchTimer.current);
    };
  }, [query, isEditing]);

  // Fetch a live quote whenever a concrete symbol is set.
  const fetchQuote = async (symbol: string) => {
    const trimmed = symbol.trim();
    if (!trimmed) {
      setQuote(null);
      return;
    }
    setQuoteLoading(true);
    try {
      const response = await portfolioService.quote(trimmed);
      setQuote(response.data);
    } catch {
      setQuote(null);
    } finally {
      setQuoteLoading(false);
    }
  };

  // In edit mode, preview the current price straight away.
  useEffect(() => {
    if (isOpen && isEditing && holding) void fetchQuote(holding.symbol);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isEditing, holding]);

  const chooseSymbol = (result: SymbolSearchResult) => {
    setValue('symbol', result.symbol, { shouldValidate: true });
    setValue('name', result.name);
    setQuery(result.symbol);
    setShowResults(false);
    void fetchQuote(result.symbol);
  };

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (isEditing && holding) {
        await updateMutation.mutateAsync({
          id: holding.id,
          payload: {
            name: values.name || undefined,
            shares: Number(values.shares),
            avgBuyPrice: Number(values.avgBuyPrice),
          },
        });
        toast.success('Holding updated successfully.');
      } else {
        await createMutation.mutateAsync({
          symbol: values.symbol,
          name: values.name || undefined,
          shares: Number(values.shares),
          avgBuyPrice: Number(values.avgBuyPrice),
        });
        toast.success('Holding added to your portfolio.');
      }
      onClose();
    } catch (error) {
      if (error instanceof ApiError) {
        const fieldError = error.fieldErrors[0];
        if (
          fieldError &&
          (['symbol', 'name', 'shares', 'avgBuyPrice'] as string[]).includes(fieldError.field)
        ) {
          setError(fieldError.field as keyof FormValues, { message: fieldError.message });
        } else {
          toast.error(error.message);
        }
      } else {
        toast.error('Something went wrong. Please try again.');
      }
    }
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      icon={<TrendingUp className="h-5 w-5" aria-hidden="true" />}
      title={isEditing ? `Edit ${holding.symbol}` : 'Add holding'}
      description={
        isEditing
          ? 'Update your position. Recording shares never affects your cash balance.'
          : 'Search a stock, then enter how many shares you own and your average buy price.'
      }
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={onSubmit} isLoading={isSubmitting}>
            {isEditing ? 'Save changes' : 'Add holding'}
          </Button>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {!isEditing && (
          <div className="relative">
            <Input
              label="Search stock"
              icon={<Search className="h-4 w-4" aria-hidden="true" />}
              placeholder="e.g. BBCA, Telkom, GOTO"
              value={query}
              hint="Indonesian stocks use the .JK suffix (e.g. BBCA.JK). Powered by Yahoo Finance."
              onChange={(event) => {
                setQuery(event.target.value);
                setShowResults(true);
              }}
              onFocus={() => results.length > 0 && setShowResults(true)}
              autoComplete="off"
            />
            {showResults && (searching || results.length > 0) && (
              <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-ink-200 bg-surface py-1 shadow-float">
                {searching && (
                  <li className="px-3.5 py-2 text-[0.8125rem] text-ink-500">Searching…</li>
                )}
                {!searching &&
                  results.map((result) => (
                    <li key={result.symbol}>
                      <button
                        type="button"
                        onClick={() => chooseSymbol(result)}
                        className="flex w-full items-center justify-between gap-3 px-3.5 py-2 text-left transition hover:bg-ink-50"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-[0.8125rem] font-bold text-ink-900">
                            {result.symbol}
                          </span>
                          <span className="block truncate text-[0.75rem] text-ink-500">
                            {result.name}
                          </span>
                        </span>
                        {result.exchange && (
                          <span className="shrink-0 text-[0.6875rem] font-semibold text-ink-400">
                            {result.exchange}
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
              </ul>
            )}
          </div>
        )}

        <Input
          label="Symbol"
          placeholder="BBCA.JK"
          required
          disabled={isEditing}
          error={errors.symbol?.message}
          {...register('symbol')}
          onBlur={(event) => {
            register('symbol').onBlur(event);
            if (!isEditing) void fetchQuote(event.target.value);
          }}
        />

        {/* Live quote preview */}
        {(quote || quoteLoading) && (
          <div className="flex items-center justify-between rounded-xl border border-accent-200 bg-accent-50/60 px-3.5 py-3">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-accent-600" aria-hidden="true" />
              <span className="text-[0.8125rem] font-semibold text-ink-700">
                {quoteLoading ? 'Fetching live price…' : quote?.shortName ?? quote?.symbol}
              </span>
            </div>
            {quote && !quoteLoading && (
              <span className="money text-[0.9375rem] font-bold text-accent-700">
                {formatCurrency(quote.price, (quote.currency as Currency) ?? 'IDR')}
              </span>
            )}
          </div>
        )}

        <Input
          label="Company name"
          placeholder="Optional — filled from search"
          error={errors.name?.message}
          {...register('name')}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Controller
            control={control}
            name="shares"
            render={({ field }) => (
              <FormattedNumberInput
                label="Shares"
                placeholder="100"
                required
                name={field.name}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                error={errors.shares?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="avgBuyPrice"
            render={({ field }) => (
              <FormattedAmountInput
                label="Average buy price"
                currencyLabel={(quote?.currency as Currency) ?? holding?.currency ?? 'IDR'}
                placeholder="0"
                required
                name={field.name}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                error={errors.avgBuyPrice?.message}
              />
            )}
          />
        </div>

        {quote && !quoteLoading && symbolValue && (
          <button
            type="button"
            onClick={() => setValue('avgBuyPrice', String(quote.price), { shouldValidate: true })}
            className="text-[0.75rem] font-semibold text-accent-600 transition hover:text-accent-700"
          >
            Use current price ({formatCurrency(quote.price, (quote.currency as Currency) ?? 'IDR')}) as average cost
          </button>
        )}
      </form>
    </Modal>
  );
};
