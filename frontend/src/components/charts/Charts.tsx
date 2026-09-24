import { useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { PieChart as PieIcon, BarChart3 } from 'lucide-react';
import clsx from 'clsx';
import type { CategoryBreakdownItem, Currency, DailyPoint, MonthlyTrendPoint } from '../../types';
import { formatCompactNumber, formatCurrency, formatShortDate } from '../../utils/format';
import { EmptyState } from '../ui/States';

/**
 * Charts (brief §8).
 *
 * Income is always emerald and expense always rose, in every chart, so the colour
 * code never has to be relearned (brief §26). Category slices use a single hue
 * stepped in lightness, which makes the ranking legible as an ordering rather than
 * as six unrelated colours. Each chart renders its own empty state instead of an
 * axis with nothing on it.
 */

const INCOME = '#10b981';
const EXPENSE = '#f43f5e';

const CATEGORY_COLOURS = [
  '#4f46e5',
  '#6366f1',
  '#818cf8',
  '#a5b4fc',
  '#8b5cf6',
  '#a78bfa',
  '#c7d2fe',
  '#94a3b8',
];

const axisProps = {
  stroke: '#98a2b3',
  fontSize: 11,
  fontWeight: 600,
  tickLine: false,
  axisLine: false,
} as const;

// ---------------------------------------------------------------------------
// Shared tooltip
// ---------------------------------------------------------------------------

interface TooltipEntry {
  name?: string;
  value?: number;
  color?: string;
  dataKey?: string | number;
  payload?: Record<string, unknown>;
}

const ChartTooltip = ({
  active,
  payload,
  label,
  currency,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
  currency: Currency;
}) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="min-w-[10rem] rounded-xl border border-ink-200/80 bg-white/95 px-3 py-2.5 shadow-float backdrop-blur">
      {label && <p className="mb-1.5 text-[0.6875rem] font-bold uppercase tracking-wide text-ink-400">{label}</p>}
      <ul className="space-y-1">
        {payload.map((entry) => (
          <li key={String(entry.dataKey)} className="flex items-center gap-2 text-[0.8125rem]">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: entry.color }}
              aria-hidden="true"
            />
            <span className="text-ink-600">{entry.name}</span>
            <span className="money ml-auto font-bold text-ink-900">
              {formatCurrency(entry.value ?? 0, currency)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Income vs expense, by month (brief §8A)
// ---------------------------------------------------------------------------

export const IncomeExpenseChart = ({
  data,
  currency,
}: {
  data: MonthlyTrendPoint[];
  currency: Currency;
}) => {
  const hasData = data.some((point) => point.income > 0 || point.expense > 0);

  if (!hasData) {
    return (
      <EmptyState
        icon={<BarChart3 className="h-6 w-6" aria-hidden="true" />}
        title="No monthly data yet"
        message="Once you record income and expenses, your month-by-month comparison appears here."
        compact
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Custom legend: Recharts' default sits awkwardly and cannot be styled
          to match the rest of the UI. */}
      <div className="flex items-center gap-4">
        <LegendSwatch colour={INCOME} label="Income" />
        <LegendSwatch colour={EXPENSE} label="Expense" />
      </div>

      <div className="h-64 w-full sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -12 }} barGap={4}>
            <defs>
              <linearGradient id="barIncome" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#34d399" />
                <stop offset="100%" stopColor="#059669" />
              </linearGradient>
              <linearGradient id="barExpense" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fb7185" />
                <stop offset="100%" stopColor="#e11d48" />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#eef0f4" />
            <XAxis dataKey="label" {...axisProps} dy={4} />
            <YAxis {...axisProps} width={56} tickFormatter={formatCompactNumber} />
            <Tooltip
              content={<ChartTooltip currency={currency} />}
              cursor={{ fill: '#eef2ff', radius: 8 }}
            />
            <Bar dataKey="income" name="Income" fill="url(#barIncome)" radius={[6, 6, 0, 0]} maxBarSize={26} />
            <Bar dataKey="expense" name="Expense" fill="url(#barExpense)" radius={[6, 6, 0, 0]} maxBarSize={26} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const LegendSwatch = ({ colour, label }: { colour: string; label: string }) => (
  <span className="flex items-center gap-1.5 text-[0.75rem] font-semibold text-ink-600">
    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colour }} aria-hidden="true" />
    {label}
  </span>
);

// ---------------------------------------------------------------------------
// Expense by category (brief §8B)
// ---------------------------------------------------------------------------

export const ExpenseCategoryChart = ({
  data,
  currency,
}: {
  data: CategoryBreakdownItem[];
  currency: Currency;
}) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (data.length === 0) {
    return (
      <EmptyState
        icon={<PieIcon className="h-6 w-6" aria-hidden="true" />}
        title="No expenses this month"
        message="Record an expense to see where your money goes."
        compact
      />
    );
  }

  const total = data.reduce((sum, item) => sum + item.amount, 0);
  // Hovering a slice or a legend row swaps the centre figure to that category,
  // which turns the donut into something you can interrogate rather than just read.
  const focused = activeIndex !== null ? data[activeIndex] : null;

  return (
    <div className="space-y-5">
      <div className="relative mx-auto h-48 w-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="amount"
              nameKey="categoryName"
              innerRadius="68%"
              outerRadius="100%"
              paddingAngle={2.5}
              stroke="none"
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              {data.map((item, index) => (
                <Cell
                  key={item.categoryId}
                  fill={CATEGORY_COLOURS[index % CATEGORY_COLOURS.length]}
                  opacity={activeIndex === null || activeIndex === index ? 1 : 0.35}
                  className="transition-opacity duration-200"
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Centre readout. The donut hole is otherwise wasted space, and a total
            is exactly what someone looking at a breakdown wants next. */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
          <p className="label-eyebrow truncate">{focused ? focused.categoryName : 'Total spent'}</p>
          <p className="money mt-0.5 text-[1.0625rem] font-bold text-ink-900">
            {formatCurrency(focused ? focused.amount : total, currency, { compact: true })}
          </p>
          {focused && (
            <p className="text-[0.6875rem] font-semibold text-accent-600 tabular">
              {focused.percentage.toFixed(0)}%
            </p>
          )}
        </div>
      </div>

      {/* Ranked legend doubles as a readable table — better than cramming labels
          onto slices. */}
      <ul className="space-y-1">
        {data.slice(0, 6).map((item, index) => (
          <li key={item.categoryId}>
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
                style={{ backgroundColor: CATEGORY_COLOURS[index % CATEGORY_COLOURS.length] }}
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1 truncate font-medium text-ink-700">
                {item.categoryName}
              </span>
              <span className="font-bold text-ink-900 tabular">{item.percentage.toFixed(0)}%</span>
              <span className="money w-24 text-right text-ink-500">
                {formatCurrency(item.amount, currency, { compact: true })}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Daily trend (analytics)
// ---------------------------------------------------------------------------

export const DailyTrendChart = ({
  data,
  currency,
}: {
  data: DailyPoint[];
  currency: Currency;
}) => {
  const hasData = data.some((point) => point.income > 0 || point.expense > 0);

  if (!hasData) {
    return (
      <EmptyState
        icon={<BarChart3 className="h-6 w-6" aria-hidden="true" />}
        title="No activity in this period"
        message="Pick a different period, or add a transaction to see your daily trend."
        compact
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <LegendSwatch colour={INCOME} label="Income" />
        <LegendSwatch colour={EXPENSE} label="Expense" />
      </div>

      <div className="h-64 w-full sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
            <defs>
              <linearGradient id="areaIncome" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={INCOME} stopOpacity={0.28} />
                <stop offset="100%" stopColor={INCOME} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="areaExpense" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={EXPENSE} stopOpacity={0.28} />
                <stop offset="100%" stopColor={EXPENSE} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#eef0f4" />
            <XAxis
              dataKey="date"
              {...axisProps}
              dy={4}
              tickFormatter={(value: string) => formatShortDate(`${value}T00:00:00.000Z`)}
              minTickGap={28}
            />
            <YAxis {...axisProps} width={56} tickFormatter={formatCompactNumber} />
            <Tooltip
              content={<ChartTooltip currency={currency} />}
              labelFormatter={(value) => formatShortDate(`${String(value)}T00:00:00.000Z`)}
              cursor={{ stroke: '#c5ccd8', strokeWidth: 1, strokeDasharray: '4 4' }}
            />
            <Area
              type="monotone"
              dataKey="income"
              name="Income"
              stroke={INCOME}
              strokeWidth={2.5}
              fill="url(#areaIncome)"
              activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }}
            />
            <Area
              type="monotone"
              dataKey="expense"
              name="Expense"
              stroke={EXPENSE}
              strokeWidth={2.5}
              fill="url(#areaExpense)"
              activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Sparkline
// ---------------------------------------------------------------------------

/**
 * Minimal net-flow sparkline for the balance hero. No axes, no tooltip: it exists
 * to convey a direction of travel at a glance, and any more ink would compete
 * with the balance figure it sits beside.
 */
export const NetFlowSparkline = ({ data }: { data: MonthlyTrendPoint[] }) => {
  if (data.length < 2) return null;

  return (
    <div className="h-14 w-full" aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="net"
            stroke="#ffffff"
            strokeWidth={2}
            fill="url(#sparkFill)"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
