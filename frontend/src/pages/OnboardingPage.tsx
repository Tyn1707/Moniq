import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Check, Sparkles, TrendingUp } from 'lucide-react';
import clsx from 'clsx';
import { Button } from '../components/ui/Button';
import { AmountInput, Select } from '../components/ui/Field';
import { PageLoader } from '../components/ui/States';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../services';
import { ApiError } from '../services/api';
import { useToast } from '../hooks/useToast';
import { CURRENCY_LABELS } from '../utils/format';
import type { Currency } from '../types';

/**
 * Onboarding (brief §6).
 *
 * Collects the starting balance so Current Balance reflects money the user already
 * had before they began recording transactions. Everything is optional in effect —
 * the whole step can be skipped, and nothing here is required for the app to work.
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

  if (isLoading) return <PageLoader message="Setting things up…" />;
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
    <div className="min-h-screen bg-ink-50">
      {/* Gradient banner: makes the first screen after sign-up feel like an
          arrival rather than another form. */}
      <div className="relative overflow-hidden bg-ink-900 px-4 pb-20 pt-12 text-center text-white sm:px-6">
        <div className="absolute inset-0 bg-mesh-accent opacity-75" aria-hidden="true" />
        <div
          className="absolute inset-0 bg-grid-faint opacity-40 [background-size:32px_32px]"
          aria-hidden="true"
        />
        <div className="relative mx-auto max-w-xl space-y-3">
          <span className="glass mx-auto flex h-14 w-14 items-center justify-center rounded-2xl">
            <TrendingUp className="h-6 w-6" aria-hidden="true" />
          </span>
          <h1 className="text-display-sm text-white">
            Welcome, {user.name.split(' ')[0]}
          </h1>
          <p className="mx-auto max-w-md text-[0.875rem] leading-relaxed text-white/70">
            A few details so your dashboard is accurate from day one. You can change all of this
            later in your profile.
          </p>
        </div>
      </div>

      <div className="mx-auto -mt-12 w-full max-w-xl px-4 pb-16 sm:px-6">
        <form onSubmit={onSubmit} className="surface animate-reveal-up space-y-5 p-5 sm:p-7" noValidate>
          <Select label="Currency" {...register('currency')}>
            {(Object.entries(CURRENCY_LABELS) as [Currency, string][]).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>

          <AmountInput
            label="How much money do you have right now?"
            currencyLabel={currency}
            type="number"
            step="0.01"
            min="0"
            placeholder="0"
            hint="Your starting balance. Leave it at 0 if you would rather begin from scratch."
            error={errors.initialBalance?.message}
            {...register('initialBalance')}
          />

          <AmountInput
            label="Monthly income estimate"
            currencyLabel={currency}
            type="number"
            step="0.01"
            min="0"
            placeholder="0"
            hint="Optional — kept as a reference on your profile."
            error={errors.monthlyIncomeTarget?.message}
            {...register('monthlyIncomeTarget')}
          />

          <fieldset>
            <legend className="text-[0.8125rem] font-semibold text-ink-700">
              Categories you care about
            </legend>
            <p className="mt-1 text-[0.8125rem] text-ink-500">
              All of these are already available. Tap any you want to make sure exist.
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
                      'press inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[0.8125rem] font-semibold transition-all duration-200',
                      isSelected
                        ? 'border-accent-500 bg-accent-50 text-accent-700'
                        : 'border-ink-200 bg-white text-ink-600 hover:border-ink-300 hover:bg-ink-50',
                    )}
                  >
                    {isSelected && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                    {name}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="flex flex-col-reverse gap-2 border-t border-ink-100 pt-4 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={handleSkip} isLoading={isSkipping}>
              Skip for now
            </Button>
            <Button
              type="submit"
              isLoading={isSubmitting}
              leftIcon={<Sparkles className="h-4 w-4" aria-hidden="true" />}
            >
              Go to dashboard
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
