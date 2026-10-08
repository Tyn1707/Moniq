import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowRight, Check, Lock, Mail, User } from 'lucide-react';
import clsx from 'clsx';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Field';
import { AuthAlert, PasswordToggle } from '../components/auth/AuthParts';
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
  const [attempt, setAttempt] = useState(0);
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
        setAttempt((count) => count + 1);
        setFormError(error.message);
      } else {
        setAttempt((count) => count + 1);
        setFormError('Something went wrong. Please try again.');
      }
    }
  });

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-display-sm text-ink-900">Create your account</h1>
        <p className="text-[0.875rem] text-ink-500">
          Start tracking your income, expenses and budgets in a couple of minutes.
        </p>
      </header>

      {formError && <AuthAlert key={attempt} message={formError} />}

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Input
          appearance="line"
          label="Full name"
          autoComplete="name"
          placeholder="Sarah Wijaya"
          icon={<User className="h-4 w-4" aria-hidden="true" />}
          required
          error={errors.name?.message}
          {...register('name')}
        />

        <Input
          appearance="line"
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
            appearance="line"
            label="Password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="••••••••"
            icon={<Lock className="h-4 w-4" aria-hidden="true" />}
            required
            error={errors.password?.message}
            trailing={
              <PasswordToggle visible={showPassword} onToggle={() => setShowPassword((v) => !v)} />
            }
            {...register('password')}
          />

          {/* Strength meter: grid-rows trick lets it expand smoothly from 0 height. */}
          <div
            aria-hidden={!password || undefined}
            className={clsx(
              'grid transition-[grid-template-rows,opacity] duration-500 ease-out-expo',
              password ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
            )}
          >
            <div className="space-y-2 overflow-hidden">
              <div className="flex gap-1.5 pt-0.5" aria-hidden="true">
                {CHECKS.map((check, index) => (
                  <span key={check.label} className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-100">
                    <span
                      className={clsx(
                        'block h-full origin-left rounded-full transition-all duration-500 ease-spring',
                        index < passedChecks ? 'scale-x-100' : 'scale-x-0',
                        passedChecks === 1
                          ? 'bg-expense-400'
                          : passedChecks === 2
                            ? 'bg-warn-400'
                            : 'bg-income-500',
                      )}
                    />
                  </span>
                ))}
              </div>
              <ul className="flex flex-wrap gap-1.5">
                {CHECKS.map((check) => {
                  const passed = check.test(password ?? '');
                  return (
                    <li
                      key={check.label}
                      className={clsx(
                        'flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold transition-colors duration-300',
                        passed ? 'bg-income-50 text-income-700' : 'bg-ink-100/70 text-ink-500',
                      )}
                    >
                      <Check
                        className={clsx(
                          'h-3 w-3 shrink-0 transition-transform duration-300 ease-spring',
                          passed ? 'scale-100' : 'scale-0',
                        )}
                        aria-hidden="true"
                      />
                      {check.label}
                      {!check.required && <span className="font-medium opacity-60">(recommended)</span>}
                      <span className="sr-only">{passed ? ' — met' : ' — not met'}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>

        <Input
          appearance="line"
          label="Confirm password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          placeholder="••••••••"
          icon={<Lock className="h-4 w-4" aria-hidden="true" />}
          required
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        <Button
          type="submit"
          fullWidth
          size="lg"
          isLoading={isSubmitting}
          className="btn-shine group !mt-6 rounded-2xl"
          rightIcon={
            <ArrowRight
              className="h-4 w-4 transition-transform duration-300 ease-spring group-hover:translate-x-1"
              aria-hidden="true"
            />
          }
        >
          Create account
        </Button>
      </form>
    </div>
  );
};
