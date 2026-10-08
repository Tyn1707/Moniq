import { AlertCircle, Eye, EyeOff } from 'lucide-react';

/**
 * Small pieces shared by the login and register forms.
 */

/**
 * Form-level error. Borderless, and it shakes on arrival — callers key it by
 * attempt so a second failed submit shakes again instead of sitting still.
 */
export const AuthAlert = ({ message }: { message: string }) => (
  <div
    role="alert"
    className="flex animate-shake items-start gap-2.5 rounded-2xl bg-expense-50 px-4 py-3 text-[0.8125rem] font-medium text-expense-700"
  >
    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
    <p>{message}</p>
  </div>
);

/** Show/hide toggle placed in a password field's label row. */
export const PasswordToggle = ({ visible, onToggle }: { visible: boolean; onToggle: () => void }) => (
  <button
    type="button"
    onClick={onToggle}
    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.75rem] font-semibold text-ink-500 transition hover:bg-ink-100 hover:text-ink-800"
  >
    {visible ? (
      <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
    ) : (
      <Eye className="h-3.5 w-3.5" aria-hidden="true" />
    )}
    {visible ? 'Hide' : 'Show'}
  </button>
);
