import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowRight, Lock, Mail } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Field';
import { AuthAlert, PasswordToggle } from '../components/auth/AuthParts';
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
  const [attempt, setAttempt] = useState(0);
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
      setAttempt((count) => count + 1);
      setFormError(
        error instanceof ApiError ? error.message : 'Something went wrong. Please try again.',
      );
    }
  });

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-display-sm text-ink-900">Welcome back</h1>
        <p className="text-[0.875rem] text-ink-500">Sign in to continue tracking your finances.</p>
      </header>

      {formError && <AuthAlert key={attempt} message={formError} />}

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
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

        <Input
          appearance="line"
          label="Password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          placeholder="••••••••"
          icon={<Lock className="h-4 w-4" aria-hidden="true" />}
          required
          error={errors.password?.message}
          trailing={
            <PasswordToggle visible={showPassword} onToggle={() => setShowPassword((v) => !v)} />
          }
          {...register('password')}
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
          Sign in
        </Button>
      </form>
    </div>
  );
};
