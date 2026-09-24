/** Aggregated money figures for a single period, already serialised for JSON. */
export interface PeriodTotals {
  income: number;
  expense: number;
  netCashFlow: number;
  /** (income − expense) / income × 100, or null when there was no income. */
  savingsRate: number | null;
}
