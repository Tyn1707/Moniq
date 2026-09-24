import { ArrowDownLeft, ArrowUpRight, PiggyBank, TrendingDown, TrendingUp } from 'lucide-react';
import clsx from 'clsx';
import type { Currency, DashboardData, MonthlyTrendPoint } from '../../types';
import { formatCurrency, formatMonth, formatPercentage } from '../../utils/format';
import { AnimatedCurrency, AnimatedPercentage } from '../ui/Motion';
import { NetFlowSparkline } from '../charts/Charts';
import { StatTile } from '../ui';

/**
 * Dashboard summary (brief §7).
 *
 * The balance is promoted to a hero panel rather than being one of four equal
 * cards. It is the number people open the app to see, so it gets the dark
 * surface, the display type and the only gradient on the page; income, expense
 * and savings sit beneath it as clearly secondary tiles. This is the difference
 * between a dashboard that answers "how much do I have?" in one glance and a grid
 * of figures you have to read through.
 *
 * Every value comes from the server's precomputed `summary` — nothing here does
 * financial arithmetic (brief §32).
 */

export const BalanceHero = ({
  summary,
  currentMonth,
  monthlyTrend,
  currency,
}: {
  summary: DashboardData['summary'];
  currentMonth: DashboardData['currentMonth'];
  monthlyTrend: MonthlyTrendPoint[];
  currency: Currency;
}) => {
  const monthLabel = formatMonth(currentMonth.from.slice(0, 7));
  const netIsPositive = currentMonth.net >= 0;

  return (
    <section className="relative overflow-hidden rounded-3xl bg-ink-900 text-white shadow-float">
      {/* Layered decoration: colour bloom, then a faint grid for texture. Both
          are purely decorative and hidden from assistive technology. */}
      <div className="absolute inset-0 bg-mesh-accent opacity-70" aria-hidden="true" />
      <div
        className="absolute inset-0 bg-grid-faint opacity-40 [background-size:32px_32px]"
        aria-hidden="true"
      />

      <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.4fr_1fr] lg:gap-10">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-white/60">
              Current balance
            </p>
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[0.625rem] font-bold uppercase tracking-wide text-white/70">
              {monthLabel}
            </span>
          </div>

          <AnimatedCurrency
            value={summary.balance}
            currency={currency}
            as="p"
            className="mt-2 text-display-md text-white sm:text-display-lg"
          />

          <p className="mt-2 text-[0.8125rem] text-white/60">
            Starting balance + income − expenses, calculated from your transactions
          </p>

          {/* Month delta pill: the balance alone doesn't say which way things
              are going, and that is usually the next question. */}
          <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-inset ring-white/15">
            {netIsPositive ? (
              <TrendingUp className="h-4 w-4 text-income-200" aria-hidden="true" />
            ) : (
              <TrendingDown className="h-4 w-4 text-expense-200" aria-hidden="true" />
            )}
            <span className="money text-[0.8125rem] font-bold text-white">
              {formatCurrency(currentMonth.net, currency, { signed: true })}
            </span>
            <span className="text-[0.75rem] text-white/60">this month</span>
          </div>
        </div>

        {/* Month recap column, separated by a hairline on desktop. */}
        <div className="min-w-0 space-y-4 lg:border-l lg:border-white/10 lg:pl-10">
          <div className="grid grid-cols-2 gap-4">
            <HeroFigure
              label="Income"
              value={formatCurrency(currentMonth.income, currency, { compact: true })}
              icon={<ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />}
              tone="income"
            />
            <HeroFigure
              label="Expense"
              value={formatCurrency(currentMonth.expense, currency, { compact: true })}
              icon={<ArrowDownLeft className="h-3.5 w-3.5" aria-hidden="true" />}
              tone="expense"
            />
          </div>

          <div>
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-white/50">
                Net flow, last 6 months
              </p>
              {currentMonth.savingsRate !== null && (
                <p className="text-[0.75rem] font-bold text-white/80 tabular">
                  {formatPercentage(currentMonth.savingsRate)} saved
                </p>
              )}
            </div>
            <NetFlowSparkline data={monthlyTrend} />
          </div>
        </div>
      </div>
    </section>
  );
};

const HeroFigure = ({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone: 'income' | 'expense';
}) => (
  <div>
    <div className="flex items-center gap-1.5">
      <span
        className={clsx(
          'flex h-5 w-5 items-center justify-center rounded-md',
          tone === 'income' ? 'bg-income-500/25 text-income-200' : 'bg-expense-500/25 text-expense-200',
        )}
      >
        {icon}
      </span>
      <p className="text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-white/50">{label}</p>
    </div>
    <p className="money mt-1 text-lg font-bold text-white">{value}</p>
  </div>
);

// ---------------------------------------------------------------------------

/**
 * All-time totals. Deliberately quieter than the hero: these are context, and
 * the month figures in the hero are what a user acts on.
 */
export const SummaryTiles = ({
  summary,
  currency,
}: {
  summary: DashboardData['summary'];
  currency: Currency;
}) => (
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
    <StatTile
      label="Total income"
      tone="income"
      icon={<ArrowUpRight className="h-4 w-4" aria-hidden="true" />}
      value={<AnimatedCurrency value={summary.totalIncome} currency={currency} />}
      caption="All time"
    />
    <StatTile
      label="Total expense"
      tone="expense"
      icon={<ArrowDownLeft className="h-4 w-4" aria-hidden="true" />}
      value={<AnimatedCurrency value={summary.totalExpense} currency={currency} />}
      caption="All time"
    />
    <StatTile
      label="Savings"
      tone={summary.savings >= 0 ? 'accent' : 'expense'}
      icon={<PiggyBank className="h-4 w-4" aria-hidden="true" />}
      value={<AnimatedCurrency value={summary.savings} currency={currency} />}
      caption={
        summary.savingsRate === null ? (
          'Record income to see your savings rate'
        ) : (
          <>
            <AnimatedPercentage value={summary.savingsRate} className="font-semibold text-ink-700" />{' '}
            of your income saved
          </>
        )
      }
    />
  </div>
);
