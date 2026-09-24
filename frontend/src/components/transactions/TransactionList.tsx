import { ArrowDownLeft, ArrowUpRight, Pencil, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import type { Currency, Transaction } from '../../types';
import {
  PAYMENT_METHOD_LABELS,
  formatCurrency,
  formatRelativeDate,
  formatShortDate,
} from '../../utils/format';

/**
 * Transaction list (brief §12).
 *
 * Renders as a real table on desktop — dates, categories and amounts line up in
 * columns, which is what makes a ledger scannable — and collapses to stacked
 * cards below `sm`, where a five-column table would be unreadable.
 */

interface TransactionListProps {
  transactions: Transaction[];
  currency: Currency;
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (transaction: Transaction) => void;
  /** Hides the action column, e.g. in the dashboard's recent list. */
  readOnly?: boolean;
}

const TypeIcon = ({ type }: { type: Transaction['type'] }) => (
  <span
    className={clsx(
      'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
      type === 'INCOME' ? 'bg-income-light text-income-dark' : 'bg-expense-light text-expense-dark',
    )}
  >
    {type === 'INCOME' ? (
      <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
    ) : (
      <ArrowDownLeft className="h-4 w-4" aria-hidden="true" />
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
      'font-semibold tabular',
      transaction.type === 'INCOME' ? 'text-income-dark' : 'text-expense-dark',
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
  <div className="flex items-center justify-end gap-1">
    {onEdit && (
      <button
        type="button"
        onClick={() => onEdit(transaction)}
        className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-primary-600"
        aria-label={`Edit ${transaction.description}`}
      >
        <Pencil className="h-4 w-4" aria-hidden="true" />
      </button>
    )}
    {onDelete && (
      <button
        type="button"
        onClick={() => onDelete(transaction)}
        className="rounded-lg p-2 text-slate-400 transition hover:bg-expense-light hover:text-expense"
        aria-label={`Delete ${transaction.description}`}
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
      </button>
    )}
  </div>
);

export const TransactionList = ({
  transactions,
  currency,
  onEdit,
  onDelete,
  readOnly = false,
}: TransactionListProps) => {
  const showActions = !readOnly && (onEdit !== undefined || onDelete !== undefined);

  return (
    <>
      {/* Mobile: stacked cards. */}
      <ul className="divide-y divide-slate-100 sm:hidden">
        {transactions.map((transaction) => (
          <li key={transaction.id} className="flex items-start gap-3 p-4">
            <TypeIcon type={transaction.type} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900">
                {transaction.description}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {transaction.category.name} · {formatRelativeDate(transaction.transactionDate)}
              </p>
              <div className="mt-1.5">
                <Amount transaction={transaction} currency={currency} />
              </div>
            </div>
            {showActions && (
              <RowActions transaction={transaction} onEdit={onEdit} onDelete={onDelete} />
            )}
          </li>
        ))}
      </ul>

      {/* Tablet and up: table. */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-sm">
          <caption className="sr-only">Your transactions</caption>
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th scope="col" className="px-5 py-3">
                Date
              </th>
              <th scope="col" className="px-5 py-3">
                Description
              </th>
              <th scope="col" className="px-5 py-3">
                Category
              </th>
              <th scope="col" className="hidden px-5 py-3 lg:table-cell">
                Method
              </th>
              <th scope="col" className="px-5 py-3 text-right">
                Amount
              </th>
              {showActions && (
                <th scope="col" className="px-5 py-3 text-right">
                  <span className="sr-only">Actions</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {transactions.map((transaction) => (
              <tr key={transaction.id} className="transition hover:bg-slate-50/70">
                <td className="whitespace-nowrap px-5 py-3 text-slate-500 tabular">
                  {formatShortDate(transaction.transactionDate)}
                </td>
                <td className="max-w-[18rem] px-5 py-3">
                  <p className="truncate font-medium text-slate-900">{transaction.description}</p>
                  {transaction.notes && (
                    <p className="truncate text-xs text-slate-400">{transaction.notes}</p>
                  )}
                </td>
                <td className="whitespace-nowrap px-5 py-3">
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                    {transaction.category.name}
                  </span>
                </td>
                <td className="hidden whitespace-nowrap px-5 py-3 text-slate-500 lg:table-cell">
                  {PAYMENT_METHOD_LABELS[transaction.paymentMethod]}
                </td>
                <td className="whitespace-nowrap px-5 py-3 text-right">
                  <Amount transaction={transaction} currency={currency} />
                </td>
                {showActions && (
                  <td className="whitespace-nowrap px-3 py-3">
                    <RowActions transaction={transaction} onEdit={onEdit} onDelete={onDelete} />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};
