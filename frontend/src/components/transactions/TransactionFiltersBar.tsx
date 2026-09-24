import { useEffect, useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Layers, Search, SlidersHorizontal } from 'lucide-react';
import clsx from 'clsx';
import { Button } from '../ui/Button';
import { SearchInput } from '../ui/Field';
import { Chip, SegmentedControl, type SegmentOption } from '../ui';
import { useCategories } from '../../hooks/useFinanceData';
import type { TransactionFilters } from '../../types';

/**
 * Search and filter controls (brief §20).
 *
 * Type is a segmented control rather than a dropdown: three options that stay
 * visible are faster to scan and take one tap instead of two. The text box is
 * debounced so typing does not fire a request per keystroke, while dropdowns apply
 * immediately because a single deliberate choice should feel instant.
 *
 * Active filters are echoed back as removable chips. Without them it is easy to
 * stare at an unexpectedly short list having forgotten a filter is on.
 */

const SEARCH_DEBOUNCE_MS = 350;

const TYPE_OPTIONS: SegmentOption<'ALL' | 'INCOME' | 'EXPENSE'>[] = [
  { value: 'ALL', label: 'All', icon: <Layers className="h-3.5 w-3.5" aria-hidden="true" /> },
  { value: 'INCOME', label: 'Income', icon: <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /> },
  { value: 'EXPENSE', label: 'Expense', icon: <ArrowDownLeft className="h-3.5 w-3.5" aria-hidden="true" /> },
];

const DATE_LABELS: Record<NonNullable<TransactionFilters['datePreset']>, string> = {
  all: 'All dates',
  today: 'Today',
  this_week: 'This week',
  this_month: 'This month',
  custom: 'Custom range',
};

const SORT_LABELS: Record<NonNullable<TransactionFilters['sort']>, string> = {
  newest: 'Newest first',
  oldest: 'Oldest first',
  highest: 'Highest amount',
  lowest: 'Lowest amount',
};

const selectClasses =
  'h-10 rounded-xl border border-ink-200 bg-white px-3 text-[0.8125rem] font-medium text-ink-700 shadow-subtle transition hover:border-ink-300 focus:border-accent-500 focus:ring-4 focus:ring-accent-100';

interface FiltersBarProps {
  filters: TransactionFilters;
  onChange: (next: Partial<TransactionFilters>) => void;
  onReset: () => void;
  resultCount: number;
}

export const TransactionFiltersBar = ({
  filters,
  onChange,
  onReset,
  resultCount,
}: FiltersBarProps) => {
  const [searchDraft, setSearchDraft] = useState(filters.search ?? '');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { data: categories = [] } = useCategories(
    filters.type && filters.type !== 'ALL' ? filters.type : 'ALL',
  );

  // Keep the box in sync when filters are reset from outside.
  useEffect(() => {
    setSearchDraft(filters.search ?? '');
  }, [filters.search]);

  useEffect(() => {
    if (searchDraft === (filters.search ?? '')) return;
    const timer = window.setTimeout(
      () => onChange({ search: searchDraft, page: 1 }),
      SEARCH_DEBOUNCE_MS,
    );
    return () => window.clearTimeout(timer);
  }, [searchDraft, filters.search, onChange]);

  const activeCategory = categories.find((category) => category.id === filters.categoryId);

  const chips = useMemo(() => {
    const items: { key: string; label: string; clear: Partial<TransactionFilters> }[] = [];

    if (filters.search) {
      items.push({ key: 'search', label: `“${filters.search}”`, clear: { search: '' } });
    }
    if (filters.type && filters.type !== 'ALL') {
      items.push({
        key: 'type',
        label: filters.type === 'INCOME' ? 'Income only' : 'Expense only',
        clear: { type: 'ALL' },
      });
    }
    if (activeCategory) {
      items.push({ key: 'category', label: activeCategory.name, clear: { categoryId: 'ALL' } });
    }
    if (filters.datePreset && filters.datePreset !== 'all') {
      items.push({
        key: 'date',
        label: DATE_LABELS[filters.datePreset],
        clear: { datePreset: 'all', dateFrom: undefined, dateTo: undefined },
      });
    }
    if (filters.sort && filters.sort !== 'newest') {
      items.push({ key: 'sort', label: SORT_LABELS[filters.sort], clear: { sort: 'newest' } });
    }

    return items;
  }, [filters, activeCategory]);

  return (
    <div className="space-y-3 border-b border-ink-100 p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          label="Search transactions"
          value={searchDraft}
          onChange={(event) => setSearchDraft(event.target.value)}
          placeholder="Search transactions..."
          icon={<Search className="h-4 w-4" aria-hidden="true" />}
          className="min-w-[12rem]"
        />

        <SegmentedControl
          label="Filter by type"
          options={TYPE_OPTIONS}
          value={(filters.type ?? 'ALL') as 'ALL' | 'INCOME' | 'EXPENSE'}
          onChange={(type) => onChange({ type, page: 1 })}
          className="hidden sm:inline-flex"
        />

        <Button
          variant="secondary"
          onClick={() => setShowAdvanced((open) => !open)}
          leftIcon={<SlidersHorizontal className="h-4 w-4" aria-hidden="true" />}
          aria-expanded={showAdvanced}
          className={clsx(showAdvanced && 'border-accent-300 bg-accent-50 text-accent-700')}
        >
          Filters
        </Button>
      </div>

      {/* Type control moves below the search box on narrow screens, where the
          row above would otherwise wrap awkwardly. */}
      <SegmentedControl
        label="Filter by type"
        options={TYPE_OPTIONS}
        value={(filters.type ?? 'ALL') as 'ALL' | 'INCOME' | 'EXPENSE'}
        onChange={(type) => onChange({ type, page: 1 })}
        fullWidth
        className="sm:hidden"
      />

      {showAdvanced && (
        <div className="grid animate-reveal-up grid-cols-1 gap-2 sm:grid-cols-3">
          <select
            value={filters.categoryId ?? 'ALL'}
            onChange={(event) => onChange({ categoryId: event.target.value, page: 1 })}
            className={selectClasses}
            aria-label="Filter by category"
          >
            <option value="ALL">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>

          <select
            value={filters.datePreset ?? 'all'}
            onChange={(event) =>
              onChange({
                datePreset: event.target.value as TransactionFilters['datePreset'],
                page: 1,
              })
            }
            className={selectClasses}
            aria-label="Filter by date"
          >
            {(Object.entries(DATE_LABELS) as [TransactionFilters['datePreset'], string][]).map(
              ([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ),
            )}
          </select>

          <select
            value={filters.sort ?? 'newest'}
            onChange={(event) =>
              onChange({ sort: event.target.value as TransactionFilters['sort'], page: 1 })
            }
            className={selectClasses}
            aria-label="Sort transactions"
          >
            {(Object.entries(SORT_LABELS) as [TransactionFilters['sort'], string][]).map(
              ([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ),
            )}
          </select>

          {filters.datePreset === 'custom' && (
            <>
              <label className="flex flex-col gap-1 text-[0.6875rem] font-bold uppercase tracking-wide text-ink-500">
                From
                <input
                  type="date"
                  value={filters.dateFrom ?? ''}
                  max={filters.dateTo}
                  onChange={(event) => onChange({ dateFrom: event.target.value, page: 1 })}
                  className={selectClasses}
                />
              </label>
              <label className="flex flex-col gap-1 text-[0.6875rem] font-bold uppercase tracking-wide text-ink-500">
                To
                <input
                  type="date"
                  value={filters.dateTo ?? ''}
                  min={filters.dateFrom}
                  onChange={(event) => onChange({ dateTo: event.target.value, page: 1 })}
                  className={selectClasses}
                />
              </label>
            </>
          )}
        </div>
      )}

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          <span className="text-[0.75rem] font-medium text-ink-500 tabular" role="status">
            {resultCount} {resultCount === 1 ? 'result' : 'results'}
          </span>
          {chips.map((chip) => (
            <Chip
              key={chip.key}
              onRemove={() => onChange({ ...chip.clear, page: 1 })}
              removeLabel={`Remove ${chip.label} filter`}
            >
              {chip.label}
            </Chip>
          ))}
          <button
            type="button"
            onClick={onReset}
            className="text-[0.75rem] font-semibold text-ink-500 underline decoration-ink-300 underline-offset-2 transition hover:text-ink-800"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
};
