import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle, Eye, EyeOff, Mail } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Field';
import { useAuth } from '../hooks/useAuth';
import { ApiError } from '../services/api';

const schema = z.object({
  email: z.string().min(1, 'Email is required.').email('Please enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

type FormValues = z.infer<typeof schema>;

export const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const user = await login(values.email, values.password);
      const intended = (location.state as { from?: string } | null)?.from;
      navigate(user.onboardingCompleted ? (intended ?? '/dashboard') : '/onboarding', {
        replace: true,
      });
    } catch (error) {
      // The API returns one generic message for a bad email *and* a bad password,
      // so there is nothing to attribute to a single field.
      setFormError(
        error instanceof ApiError ? error.message : 'Something went wrong. Please try again.',
      );
    }
  });

  return (
    <div className="space-y-7">
      <header className="space-y-1.5">
        <h1 className="text-display-sm text-ink-900">Welcome back</h1>
        <p className="text-[0.875rem] text-ink-500">Sign in to continue tracking your finances.</p>
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
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          icon={<Mail className="h-4 w-4" aria-hidden="true" />}
          required
          error={errors.email?.message}
          {...register('email')}
        />

        <Input
          label="Password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
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

        <Button type="submit" fullWidth size="lg" isLoading={isSubmitting}>
          Sign in
        </Button>
      </form>

      <p className="text-center text-[0.875rem] text-ink-500">
        Don&apos;t have an account?{' '}
        <Link to="/register" className="font-bold text-accent-600 transition hover:text-accent-700">
          Create one
        </Link>
      </p>
    </div>
  );
};
