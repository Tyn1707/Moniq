import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Check, Wallet } from 'lucide-react';
import clsx from 'clsx';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Field';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../services';
import { ApiError } from '../services/api';
import { useToast } from '../hooks/useToast';
import { CURRENCY_LABELS } from '../utils/format';
import type { Currency } from '../types';

/**
 * Onboarding (brief §6).
 *
 * Collects the starting balance so the dashboard's Current Balance reflects
 * money the user already had before they started recording transactions. Every
 * field is optional in effect — the whole step can be skipped.
 */

const SUGGESTED_CATEGORIES = [
  'Food',
  'Transportation',
  'Bills',
  'Shopping',
  'Entertainment',
  'Education',
  'Health',
  'Subscription',
  'Rent',
];

const schema = z.object({
  initialBalance: z
    .string()
    .refine((value) => value === '' || Number.isFinite(Number(value)), 'Amount must be a valid number.')
    .refine((value) => value === '' || Number(value) >= 0, 'Amount cannot be negative.'),
  currency: z.string().min(1),
  monthlyIncomeTarget: z
    .string()
    .refine((value) => value === '' || Number.isFinite(Number(value)), 'Amount must be a valid number.')
    .refine((value) => value === '' || Number(value) >= 0, 'Amount cannot be negative.'),
});

type FormValues = z.infer<typeof schema>;

export const OnboardingPage = () => {
  const { user, setUser, isLoading } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isSkipping, setSkipping] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { initialBalance: '', currency: 'IDR', monthlyIncomeTarget: '' },
  });

  const currency = (watch('currency') || 'IDR') as Currency;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-primary-600" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (user.onboardingCompleted) return <Navigate to="/dashboard" replace />;

  const toggleCategory = (name: string) => {
    setSelectedCategories((current) =>
      current.includes(name) ? current.filter((item) => item !== name) : [...current, name],
    );
  };

  const onSubmit = handleSubmit(async (values) => {
    try {
      const response = await authService.completeOnboarding({
        initialBalance: values.initialBalance === '' ? 0 : Number(values.initialBalance),
        currency: values.currency as Currency,
        monthlyIncomeTarget:
          values.monthlyIncomeTarget === '' ? 0 : Number(values.monthlyIncomeTarget),
        preferredCategories: selectedCategories,
      });
      setUser(response.data.user);
      navigate('/dashboard', { replace: true });
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : 'Something went wrong. Please try again.',
      );
    }
  });

  const handleSkip = async () => {
    setSkipping(true);
    try {
      const response = await authService.skipOnboarding();
      setUser(response.data.user);
      navigate('/dashboard', { replace: true });
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : 'Something went wrong. Please try again.',
      );
    } finally {
      setSkipping(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
      <div className="mx-auto w-full max-w-xl space-y-6">
        <header className="space-y-2 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary-600 text-white">
            <Wallet className="h-6 w-6" aria-hidden="true" />
          </span>
          <h1 className="text-2xl font-semibold text-slate-900">
            Welcome, {user.name.split(' ')[0]}
          </h1>
          <p className="text-sm text-slate-500">
            A few details so your dashboard is accurate from day one. You can change all of this
            later.
          </p>
        </header>

        <form onSubmit={onSubmit} className="card space-y-5 p-5 sm:p-6" noValidate>
          <Select label="Currency" {...register('currency')}>
            {(Object.entries(CURRENCY_LABELS) as [Currency, string][]).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>

          <Input
            label="Current balance"
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            placeholder="0"
            hint={`How much money do you have right now? Example: 2500000 for ${currency} 2,500,000.`}
            error={errors.initialBalance?.message}
            {...register('initialBalance')}
          />

          <Input
            label="Monthly income estimate"
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            placeholder="0"
            hint="Optional — used as a reference on your profile."
            error={errors.monthlyIncomeTarget?.message}
            {...register('monthlyIncomeTarget')}
          />

          <fieldset>
            <legend className="text-sm font-medium text-slate-700">
              Expense categories you care about
            </legend>
            <p className="mt-1 text-sm text-slate-500">
              These are already available — tap any extras you want highlighted.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {SUGGESTED_CATEGORIES.map((name) => {
                const isSelected = selectedCategories.includes(name);
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => toggleCategory(name)}
                    aria-pressed={isSelected}
                    className={clsx(
                      'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition',
                      isSelected
                        ? 'border-primary-600 bg-primary-50 text-primary-700'
                        : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50',
                    )}
                  >
                    {isSelected && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                    {name}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={handleSkip} isLoading={isSkipping}>
              Skip for now
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Go to dashboard
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
