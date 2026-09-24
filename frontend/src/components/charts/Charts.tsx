import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { CategoryBreakdownItem, Currency, DailyPoint, MonthlyTrendPoint } from '../../types';
import { formatCompactNumber, formatCurrency, formatShortDate } from '../../utils/format';
import { EmptyState } from '../ui/States';

/**
 * Charts (brief §8).
 *
 * Income is always green and expense always red, everywhere, so the reader never
 * has to re-learn the colour code between charts (brief §26). Every chart renders
 * its own empty state rather than an axis with no data.
 */

const INCOME_COLOUR = '#16a34a';
const EXPENSE_COLOUR = '#dc2626';

/** Category slice palette: one hue stepped in lightness, so the ranking reads
 *  as an ordering rather than as six unrelated categories. */
const CATEGORY_COLOURS = [
  '#1f42f0',
  '#3563fb',
  '#598cff',
  '#8eb5ff',
  '#bcd2ff',
  '#94a3b8',
  '#cbd5e1',
];

const axisProps = {
  stroke: '#94a3b8',
  fontSize: 12,
  tickLine: false,
  axisLine: false,
} as const;

interface TooltipEntry {
  name?: string;
  value?: number;
  color?: string;
  dataKey?: string | number;
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
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg">
      {label && <p className="mb-1 text-xs font-semibold text-slate-500">{label}</p>}
      <ul className="space-y-0.5">
        {payload.map((entry) => (
          <li key={String(entry.dataKey)} className="flex items-center gap-2 text-sm">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: entry.color }}
              aria-hidden="true"
            />
            <span className="text-slate-600">{entry.name}</span>
            <span className="ml-auto font-semibold text-slate-900 tabular">
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
        title="No monthly data yet"
        message="Once you record income and expenses, your month-by-month comparison appears here."
      />
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <XAxis dataKey="label" {...axisProps} />
          <YAxis {...axisProps} width={48} tickFormatter={formatCompactNumber} />
          <Tooltip
            content={<ChartTooltip currency={currency} />}
            cursor={{ fill: '#f1f5f9' }}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
          />
          <Bar dataKey="income" name="Income" fill={INCOME_COLOUR} radius={[4, 4, 0, 0]} maxBarSize={28} />
          <Bar dataKey="expense" name="Expense" fill={EXPENSE_COLOUR} radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

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
  if (data.length === 0) {
    return (
      <EmptyState
        title="No expenses this month"
        message="Record an expense to see which categories your money goes to."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="amount"
              nameKey="categoryName"
              innerRadius="58%"
              outerRadius="86%"
              paddingAngle={2}
              stroke="none"
            >
              {data.map((item, index) => (
                <Cell
                  key={item.categoryId}
                  fill={CATEGORY_COLOURS[index % CATEGORY_COLOURS.length]}
                />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip currency={currency} />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* A readable legend/table beats squeezing labels onto the slices. */}
      <ul className="space-y-2">
        {data.slice(0, 6).map((item, index) => (
          <li key={item.categoryId} className="flex items-center gap-3 text-sm">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: CATEGORY_COLOURS[index % CATEGORY_COLOURS.length] }}
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1 truncate text-slate-600">{item.categoryName}</span>
            <span className="font-semibold text-slate-900 tabular">
              {item.percentage.toFixed(0)}%
            </span>
            <span className="w-28 text-right text-slate-500 tabular">
              {formatCurrency(item.amount, currency)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Daily spending trend (analytics)
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
        title="No activity in this period"
        message="Pick a different period, or add a transaction to see your daily trend."
      />
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <defs>
            <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={INCOME_COLOUR} stopOpacity={0.3} />
              <stop offset="100%" stopColor={INCOME_COLOUR} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={EXPENSE_COLOUR} stopOpacity={0.3} />
              <stop offset="100%" stopColor={EXPENSE_COLOUR} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="date"
            {...axisProps}
            tickFormatter={(value: string) => formatShortDate(`${value}T00:00:00.000Z`)}
            minTickGap={24}
          />
          <YAxis {...axisProps} width={48} tickFormatter={formatCompactNumber} />
          <Tooltip
            content={<ChartTooltip currency={currency} />}
            labelFormatter={(value) => formatShortDate(`${String(value)}T00:00:00.000Z`)}
          />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
          <Area
            type="monotone"
            dataKey="income"
            name="Income"
            stroke={INCOME_COLOUR}
            strokeWidth={2}
            fill="url(#incomeGradient)"
          />
          <Area
            type="monotone"
            dataKey="expense"
            name="Expense"
            stroke={EXPENSE_COLOUR}
            strokeWidth={2}
            fill="url(#expenseGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
