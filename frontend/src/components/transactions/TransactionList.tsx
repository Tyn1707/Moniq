import { useMemo } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  CreditCard,
  Landmark,
  MoreHorizontal,
  Pencil,
  Smartphone,
  Trash2,
  Wallet,
} from 'lucide-react';
import clsx from 'clsx';
import type { Currency, PaymentMethod, Transaction } from '../../types';
import {
  PAYMENT_METHOD_LABELS,
  formatCurrency,
  formatRelativeDate,
  formatShortDate,
} from '../../utils/format';

/**
 * Transaction list (brief §12).
 *
 * Rows are grouped under day headers with a per-day net total. A flat ledger
 * makes you scan dates to work out where one day ends and the next begins;
 * grouping does that work up front and gives a natural place to answer "what did
 * today cost me?".
 *
 * A table would be the obvious structure, but a grouped list cannot be one table
 * without either nesting tables or faking the grouping visually. The rows are
 * therefore a `<ul>` with each field explicitly labelled, which reads correctly to
 * a screen reader and lets the layout reflow properly on a phone.
 */

const METHOD_ICONS: Record<PaymentMethod, typeof Wallet> = {
  CASH: Banknote,
  DEBIT_CARD: CreditCard,
  CREDIT_CARD: CreditCard,
  BANK_TRANSFER: Landmark,
  E_WALLET: Smartphone,
  OTHER: MoreHorizontal,
};

interface TransactionListProps {
  transactions: Transaction[];
  currency: Currency;
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (transaction: Transaction) => void;
  /** Hides row actions, e.g. in the dashboard's recent list. */
  readOnly?: boolean;
  /** Day headers add useful rhythm to a long list but clutter a short preview. */
  groupByDate?: boolean;
}

interface DayGroup {
  key: string;
  label: string;
  net: number;
  items: Transaction[];
}

const TypeIcon = ({ type }: { type: Transaction['type'] }) => (
  <span
    className={clsx(
      'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset transition-transform duration-200 group-hover:scale-105',
      type === 'INCOME'
        ? 'bg-income-50 text-income-600 ring-income-100'
        : 'bg-expense-50 text-expense-600 ring-expense-100',
    )}
  >
    {type === 'INCOME' ? (
      <ArrowUpRight className="h-[1.125rem] w-[1.125rem]" aria-hidden="true" />
    ) : (
      <ArrowDownLeft className="h-[1.125rem] w-[1.125rem]" aria-hidden="true" />
    )}
  </span>
);

const Amount = ({
  transaction,
  currency,
}: {
  transaction: Transaction;
  currency: Currency;
}) => (
  <span
    className={clsx(
      'money whitespace-nowrap text-[0.9375rem] font-bold',
      transaction.type === 'INCOME' ? 'text-income-600' : 'text-ink-900',
    )}
  >
    {transaction.type === 'INCOME' ? '+' : '−'}
    {formatCurrency(transaction.amount, currency)}
  </span>
);

const RowActions = ({
  transaction,
  onEdit,
  onDelete,
}: {
  transaction: Transaction;
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (transaction: Transaction) => void;
}) => (
  <div
    className={clsx(
      'flex shrink-0 items-center gap-0.5',
      // Revealed on hover to keep the ledger calm, but always visible on touch
      // (no hover) and whenever a control inside has keyboard focus.
      'opacity-100 transition-opacity duration-200 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100',
    )}
  >
    {onEdit && (
      <button
        type="button"
        onClick={() => onEdit(transaction)}
        className="press rounded-lg p-2 text-ink-400 transition hover:bg-accent-50 hover:text-accent-600"
        aria-label={`Edit ${transaction.description}`}
      >
        <Pencil className="h-4 w-4" aria-hidden="true" />
      </button>
    )}
    {onDelete && (
      <button
        type="button"
        onClick={() => onDelete(transaction)}
        className="press rounded-lg p-2 text-ink-400 transition hover:bg-expense-50 hover:text-expense-600"
        aria-label={`Delete ${transaction.description}`}
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
      </button>
    )}
  </div>
);

const TransactionRow = ({
  transaction,
  currency,
  showActions,
  onEdit,
  onDelete,
}: {
  transaction: Transaction;
  currency: Currency;
  showActions: boolean;
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (transaction: Transaction) => void;
}) => {
  const MethodIcon = METHOD_ICONS[transaction.paymentMethod];

  return (
    <li className="group flex items-center gap-3.5 px-5 py-3.5 transition-colors hover:bg-ink-50/70 sm:px-6">
      <TypeIcon type={transaction.type} />

      <div className="min-w-0 flex-1">
        <p className="truncate text-[0.875rem] font-semibold text-ink-900">
          {transaction.description}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.75rem] text-ink-500">
          <span className="rounded-md bg-ink-100 px-1.5 py-0.5 font-semibold text-ink-600">
            {transaction.category.name}
          </span>
          <span className="hidden items-center gap-1 sm:inline-flex">
            <MethodIcon className="h-3 w-3" aria-hidden="true" />
            {PAYMENT_METHOD_LABELS[transaction.paymentMethod]}
          </span>
          <span className="sm:hidden">{formatRelativeDate(transaction.transactionDate)}</span>
          {transaction.notes && (
            <span className="hidden max-w-[16rem] truncate text-ink-400 lg:inline">
              {transaction.notes}
            </span>
          )}
        </div>
      </div>

      <div className="hidden w-20 shrink-0 text-right text-[0.75rem] font-medium text-ink-400 tabular sm:block">
        {formatShortDate(transaction.transactionDate)}
      </div>

      <div className="shrink-0 text-right">
        <Amount transaction={transaction} currency={currency} />
      </div>

      {showActions && (
        <RowActions transaction={transaction} onEdit={onEdit} onDelete={onDelete} />
      )}
    </li>
  );
};

export const TransactionList = ({
  transactions,
  currency,
  onEdit,
  onDelete,
  readOnly = false,
  groupByDate = false,
}: TransactionListProps) => {
  const showActions = !readOnly && (onEdit !== undefined || onDelete !== undefined);

  const groups = useMemo<DayGroup[]>(() => {
    if (!groupByDate) return [];

    const byDay = new Map<string, DayGroup>();
    for (const transaction of transactions) {
      const key = transaction.transactionDate.slice(0, 10);
      const existing = byDay.get(key);
      const signed = transaction.type === 'INCOME' ? transaction.amount : -transaction.amount;

      if (existing) {
        existing.items.push(transaction);
        existing.net += signed;
      } else {
        byDay.set(key, {
          key,
          label: formatRelativeDate(transaction.transactionDate),
          net: signed,
          items: [transaction],
        });
      }
    }
    // Insertion order already follows the server's sort, so no re-sorting here —
    // that would silently override the user's chosen ordering.
    return [...byDay.values()];
  }, [transactions, groupByDate]);

  if (!groupByDate) {
    return (
      <ul className="divide-y divide-ink-100">
        {transactions.map((transaction) => (
          <TransactionRow
            key={transaction.id}
            transaction={transaction}
            currency={currency}
            showActions={showActions}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </ul>
    );
  }

  return (
    <div>
      {groups.map((group) => (
        <section key={group.key}>
          <h3 className="sticky top-0 z-10 flex items-center justify-between gap-3 border-y border-ink-100 bg-ink-50/90 px-5 py-2 backdrop-blur sm:px-6">
            <span className="text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-ink-500">
              {group.label}
            </span>
            <span
              className={clsx(
                'money text-[0.75rem] font-bold',
                group.net >= 0 ? 'text-income-600' : 'text-ink-500',
              )}
            >
              {formatCurrency(group.net, currency, { signed: true })}
            </span>
          </h3>
          <ul className="divide-y divide-ink-100">
            {group.items.map((transaction) => (
              <TransactionRow
                key={transaction.id}
                transaction={transaction}
                currency={currency}
                showActions={showActions}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
};
