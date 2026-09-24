import { AlertOctagon, AlertTriangle, Info, TrendingUp } from 'lucide-react';
import clsx from 'clsx';
import type { Insight, InsightTone } from '../../types';

/**
 * Financial insights (brief §19). The backend only emits an insight when it has
 * the data to support it, so this component simply renders whatever it is given.
 */

const TONES: Record<
  InsightTone,
  { container: string; iconWrapper: string; icon: typeof Info }
> = {
  positive: {
    container: 'border-income/20 bg-income-light/40',
    iconWrapper: 'bg-income-light text-income-dark',
    icon: TrendingUp,
  },
  neutral: {
    container: 'border-slate-200 bg-slate-50',
    iconWrapper: 'bg-white text-primary-600',
    icon: Info,
  },
  warning: {
    container: 'border-warning/25 bg-warning-light/50',
    iconWrapper: 'bg-warning-light text-warning-dark',
    icon: AlertTriangle,
  },
  critical: {
    container: 'border-expense/25 bg-expense-light/50',
    iconWrapper: 'bg-expense-light text-expense-dark',
    icon: AlertOctagon,
  },
};

export const InsightList = ({ insights }: { insights: Insight[] }) => (
  <ul className="space-y-3">
    {insights.map((insight) => {
      const tone = TONES[insight.tone];
      const Icon = tone.icon;
      return (
        <li
          key={insight.id}
          className={clsx('flex gap-3 rounded-lg border p-4', tone.container)}
        >
          <span
            className={clsx(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
              tone.iconWrapper,
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0 space-y-0.5">
            <p className="text-sm font-semibold text-slate-900">{insight.title}</p>
            <p className="text-sm text-slate-600">{insight.message}</p>
          </div>
        </li>
      );
    })}
  </ul>
);
