import { AlertOctagon, AlertTriangle, Lightbulb, TrendingUp } from 'lucide-react';
import clsx from 'clsx';
import type { Insight, InsightTone } from '../../types';
import { staggerClass } from '../ui/Motion';

/**
 * Financial insights (brief §19).
 *
 * The backend only emits an insight when it has the data to support it, so this
 * component renders whatever it is handed and adds no copy of its own. Tone drives
 * colour and icon, which lets a user triage the list — criticals first — without
 * reading every line.
 */

const TONES: Record<
  InsightTone,
  { border: string; bg: string; chip: string; icon: typeof Lightbulb }
> = {
  positive: {
    border: 'border-income-200',
    bg: 'bg-income-50/60',
    chip: 'bg-income-100 text-income-700',
    icon: TrendingUp,
  },
  neutral: {
    border: 'border-ink-200',
    bg: 'bg-white',
    chip: 'bg-accent-50 text-accent-600',
    icon: Lightbulb,
  },
  warning: {
    border: 'border-warn-200',
    bg: 'bg-warn-50/60',
    chip: 'bg-warn-100 text-warn-700',
    icon: AlertTriangle,
  },
  critical: {
    border: 'border-expense-200',
    bg: 'bg-expense-50/60',
    chip: 'bg-expense-100 text-expense-700',
    icon: AlertOctagon,
  },
};

/** Criticals and warnings first: the actionable items should not be buried. */
const TONE_PRIORITY: Record<InsightTone, number> = {
  critical: 0,
  warning: 1,
  positive: 2,
  neutral: 3,
};

export const InsightList = ({
  insights,
  limit,
}: {
  insights: Insight[];
  limit?: number;
}) => {
  const ordered = [...insights].sort(
    (a, b) => TONE_PRIORITY[a.tone] - TONE_PRIORITY[b.tone],
  );
  const visible = limit ? ordered.slice(0, limit) : ordered;

  return (
    <ul className="space-y-2.5">
      {visible.map((insight, index) => {
        const tone = TONES[insight.tone];
        const Icon = tone.icon;
        return (
          <li
            key={insight.id}
            className={clsx(
              'flex animate-reveal-up gap-3 rounded-2xl border p-4 transition-shadow duration-300 hover:shadow-subtle',
              tone.border,
              tone.bg,
              staggerClass(index),
            )}
          >
            <span
              className={clsx(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                tone.chip,
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 space-y-0.5">
              <p className="text-[0.8125rem] font-bold tracking-tight text-ink-900">
                {insight.title}
              </p>
              <p className="text-[0.8125rem] leading-relaxed text-ink-600">{insight.message}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
};
