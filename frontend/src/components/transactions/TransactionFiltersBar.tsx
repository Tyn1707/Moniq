import { useEffect, useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { useCategories } from '../../hooks/useFinanceData';
import type { TransactionFilters } from '../../types';

/**
 * Search and filter controls (brief §20).
 *
 * The text box is debounced so typing does not fire a request per keystroke;
 * dropdowns apply immediately because a single deliberate choice should feel
 * instant. Secondary filters collapse behind a toggle on mobile to keep the
 * list itself above the fold.
 */

const SEARCH_DEBOUNCE_MS = 350;

interface FiltersBarProps {
  filters: TransactionFilters;
  onChange: (next: Partial<TransactionFilters>) => void;
  onReset: () => void;
  resultCount: number;
}

const selectClasses =
  'h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 transition focus:border-primary-500 focus:ring-1 focus:ring-primary-500';

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

  const hasActiveFilters =
    Boolean(filters.search) ||
    (filters.type && filters.type !== 'ALL') ||
    (filters.categoryId && filters.categoryId !== 'ALL') ||
    (filters.datePreset && filters.datePreset !== 'all') ||
    (filters.sort && filters.sort !== 'newest');

  return (
    <div className="space-y-3 border-b border-slate-100 p-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
            placeholder="Search transactions..."
            aria-label="Search transactions"
            className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-800 transition placeholder:text-slate-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
          />
        </div>
        <Button
          variant="secondary"
          onClick={() => setShowAdvanced((open) => !open)}
          leftIcon={<SlidersHorizontal className="h-4 w-4" aria-hidden="true" />}
          aria-expanded={showAdvanced}
          className="sm:hidden"
        >
          Filters
        </Button>
      </div>

      <div
        className={`${showAdvanced ? 'grid' : 'hidden'} grid-cols-1 gap-2 sm:grid sm:grid-cols-2 lg:grid-cols-4`}
      >
        <label className="contents">
          <span className="sr-only">Filter by type</span>
          <select
            value={filters.type ?? 'ALL'}
            onChange={(event) =>
              onChange({ type: event.target.value as TransactionFilters['type'], page: 1 })
            }
            className={selectClasses}
            aria-label="Filter by type"
          >
            <option value="ALL">All types</option>
            <option value="INCOME">Income</option>
            <option value="EXPENSE">Expense</option>
          </select>
        </label>

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
          <option value="all">All dates</option>
          <option value="today">Today</option>
          <option value="this_week">This week</option>
          <option value="this_month">This month</option>
          <option value="custom">Custom range</option>
        </select>

        <select
          value={filters.sort ?? 'newest'}
          onChange={(event) =>
            onChange({ sort: event.target.value as TransactionFilters['sort'], page: 1 })
          }
          className={selectClasses}
          aria-label="Sort transactions"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="highest">Highest amount</option>
          <option value="lowest">Lowest amount</option>
        </select>
      </div>

      {filters.datePreset === 'custom' && (
        <div className={`${showAdvanced ? 'grid' : 'hidden'} grid-cols-2 gap-2 sm:grid`}>
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
            From
            <input
              type="date"
              value={filters.dateFrom ?? ''}
              onChange={(event) => onChange({ dateFrom: event.target.value, page: 1 })}
              className={selectClasses}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
            To
            <input
              type="date"
              value={filters.dateTo ?? ''}
              onChange={(event) => onChange({ dateTo: event.target.value, page: 1 })}
              className={selectClasses}
            />
          </label>
        </div>
      )}

      {hasActiveFilters && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-slate-500 tabular" role="status">
            {resultCount} matching {resultCount === 1 ? 'transaction' : 'transactions'}
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            leftIcon={<X className="h-4 w-4" aria-hidden="true" />}
          >
            Clear filters
          </Button>
        </div>
      )}
    </div>
  );
};
