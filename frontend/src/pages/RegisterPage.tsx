import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle, Check, Eye, EyeOff, Mail, User } from 'lucide-react';
import clsx from 'clsx';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Field';
import { useAuth } from '../hooks/useAuth';
import { ApiError } from '../services/api';

/** Mirrors the server's register validator so messages match exactly (brief §5). */
const schema = z
  .object({
    name: z.string().trim().min(2, 'Full name must be at least 2 characters.').max(80),
    email: z.string().min(1, 'Email is required.').email('Please enter a valid email address.'),
    password: z.string().min(8, 'Password must be at least 8 characters.'),
    confirmPassword: z.string().min(1, 'Please confirm your password.'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match.',
  });

type FormValues = z.infer<typeof schema>;

/**
 * Password guidance. Only the 8-character minimum is enforced (that is the
 * server's rule); the rest are shown as encouragement, not as blockers, so the
 * meter never contradicts what the API will actually accept.
 */
const CHECKS = [
  { label: 'At least 8 characters', test: (value: string) => value.length >= 8, required: true },
  { label: 'A number', test: (value: string) => /\d/.test(value), required: false },
  {
    label: 'Upper and lower case',
    test: (value: string) => /[a-z]/.test(value) && /[A-Z]/.test(value),
    required: false,
  },
];

export const RegisterPage = () => {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  });

  const password = watch('password');
  const passedChecks = CHECKS.filter((check) => check.test(password ?? '')).length;

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await registerUser(values);
      // New accounts always start at onboarding (brief §5).
      navigate('/onboarding', { replace: true });
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 409) {
          setError('email', { message: error.message });
          return;
        }
        const fieldError = error.fieldErrors[0];
        if (fieldError && fieldError.field in values) {
          setError(fieldError.field as keyof FormValues, { message: fieldError.message });
          return;
        }
        setFormError(error.message);
      } else {
        setFormError('Something went wrong. Please try again.');
      }
    }
  });

  return (
    <div className="space-y-7">
      <header className="space-y-1.5">
        <h1 className="text-display-sm text-ink-900">Create your account</h1>
        <p className="text-[0.875rem] text-ink-500">
          Start tracking your income, expenses and budgets in a couple of minutes.
        </p>
      </header>

      {formError && (
        <div
          role="alert"
          className="flex animate-reveal-up items-start gap-2.5 rounded-xl border border-expense-200 bg-expense-50 px-3.5 py-3 text-[0.8125rem] font-medium text-expense-700"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>{formError}</p>
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Input
          label="Full name"
          autoComplete="name"
          placeholder="Sarah Wijaya"
          icon={<User className="h-4 w-4" aria-hidden="true" />}
          required
          error={errors.name?.message}
          {...register('name')}
        />

        <Input
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          icon={<Mail className="h-4 w-4" aria-hidden="true" />}
          required
          error={errors.email?.message}
          {...register('email')}
        />

        <div className="space-y-2.5">
          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="••••••••"
            required
            error={errors.password?.message}
            trailing={
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                className="inline-flex items-center gap-1 text-[0.75rem] font-semibold text-ink-500 transition hover:text-ink-800"
              >
                {showPassword ? (
                  <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {showPassword ? 'Hide' : 'Show'}
              </button>
            }
            {...register('password')}
          />

          {password && (
            <div className="animate-reveal-up space-y-2">
              <div className="flex gap-1" aria-hidden="true">
                {CHECKS.map((check, index) => (
                  <span
                    key={check.label}
                    className={clsx(
                      'h-1 flex-1 rounded-full transition-colors duration-300',
                      index < passedChecks
                        ? passedChecks === 1
                          ? 'bg-expense-400'
                          : passedChecks === 2
                            ? 'bg-warn-400'
                            : 'bg-income-500'
                        : 'bg-ink-200',
                    )}
                  />
                ))}
              </div>
              <ul className="space-y-1">
                {CHECKS.map((check) => {
                  const passed = check.test(password);
                  return (
                    <li
                      key={check.label}
                      className={clsx(
                        'flex items-center gap-1.5 text-[0.75rem]',
                        passed ? 'text-income-600' : 'text-ink-400',
                      )}
                    >
                      <Check
                        className={clsx('h-3 w-3 shrink-0', !passed && 'opacity-40')}
                        aria-hidden="true"
                      />
                      {check.label}
                      {!check.required && <span className="text-ink-300">(recommended)</span>}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        <Input
          label="Confirm password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          placeholder="••••••••"
          required
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        <Button type="submit" fullWidth size="lg" isLoading={isSubmitting}>
          Create account
        </Button>
      </form>

      <p className="text-center text-[0.875rem] text-ink-500">
        Already have an account?{' '}
        <Link to="/login" className="font-bold text-accent-600 transition hover:text-accent-700">
          Sign in
        </Link>
      </p>
    </div>
  );
};
