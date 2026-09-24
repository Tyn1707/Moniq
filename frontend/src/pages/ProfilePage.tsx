import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Calendar, Eye, EyeOff, Mail, ShieldCheck, Wallet } from 'lucide-react';
import { Card } from '../components/ui';
import { Button } from '../components/ui/Button';
import { AmountInput, Input, Select } from '../components/ui/Field';
import { Reveal } from '../components/ui/Motion';
import { PageHeader } from '../components/layout/PageHeader';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { authService } from '../services';
import { ApiError } from '../services/api';
import { CURRENCY_LABELS, formatCurrency, formatDate } from '../utils/format';
import type { Currency } from '../types';

/**
 * Profile & settings (brief §21).
 *
 * Two independent forms: account details, and password. Keeping them separate means
 * a failed password change never discards an edited name, and the password fields
 * are never pre-populated or echoed back.
 */

const profileSchema = z.object({
  name: z.string().trim().min(2, 'Full name must be at least 2 characters.').max(80),
  currency: z.string().min(1),
  initialBalance: z
    .string()
    .refine((value) => value === '' || Number.isFinite(Number(value)), 'Amount must be a valid number.')
    .refine((value) => value === '' || Number(value) >= 0, 'Amount cannot be negative.'),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required.'),
    newPassword: z.string().min(8, 'Password must be at least 8 characters.'),
    confirmPassword: z.string().min(1, 'Please confirm your new password.'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match.',
  });

type ProfileValues = z.infer<typeof profileSchema>;
type PasswordValues = z.infer<typeof passwordSchema>;

export const ProfilePage = () => {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [showPasswords, setShowPasswords] = useState(false);

  const profileForm = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: '', currency: 'IDR', initialBalance: '0' },
  });

  const passwordForm = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  useEffect(() => {
    if (!user) return;
    profileForm.reset({
      name: user.name,
      currency: user.currency,
      initialBalance: String(user.initialBalance),
    });
  }, [user, profileForm]);

  const updateProfile = useMutation({
    mutationFn: (values: ProfileValues) =>
      authService.updateProfile({
        name: values.name,
        currency: values.currency as Currency,
        initialBalance: values.initialBalance === '' ? 0 : Number(values.initialBalance),
      }),
    onSuccess: (response) => {
      setUser(response.data.user);
      toast.success('Profile updated successfully.');
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof ApiError ? error.message : 'Something went wrong. Please try again.',
      );
    },
  });

  const changePassword = useMutation({
    mutationFn: (values: PasswordValues) => authService.changePassword(values),
    onSuccess: () => {
      passwordForm.reset({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Password updated successfully.');
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError && /current password/i.test(error.message)) {
        passwordForm.setError('currentPassword', { message: error.message });
        return;
      }
      toast.error(
        error instanceof ApiError ? error.message : 'Something went wrong. Please try again.',
      );
    },
  });

  if (!user) return null;

  const initials = user.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Settings"
        title="Profile"
        description="Manage your account details and preferences."
      />

      {/* Identity banner: gives the page an anchor instead of opening on a form. */}
      <Reveal>
        <section className="relative overflow-hidden rounded-3xl bg-ink-900 p-6 text-white sm:p-7">
          <div className="absolute inset-0 bg-mesh-accent opacity-70" aria-hidden="true" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
            <span
              className="glass flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl font-display text-xl font-extrabold"
              aria-hidden="true"
            >
              {initials || '?'}
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-xl font-bold tracking-tight text-white">{user.name}</h2>
              <p className="mt-0.5 flex items-center gap-1.5 truncate text-[0.8125rem] text-white/70">
                <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {user.email}
              </p>
            </div>
            <dl className="grid grid-cols-2 gap-5 sm:gap-8">
              <div>
                <dt className="flex items-center gap-1.5 text-[0.625rem] font-bold uppercase tracking-[0.08em] text-white/50">
                  <Wallet className="h-3 w-3" aria-hidden="true" />
                  Currency
                </dt>
                <dd className="mt-1 font-display text-[0.9375rem] font-bold">{user.currency}</dd>
              </div>
              <div>
                <dt className="flex items-center gap-1.5 text-[0.625rem] font-bold uppercase tracking-[0.08em] text-white/50">
                  <Calendar className="h-3 w-3" aria-hidden="true" />
                  Member since
                </dt>
                <dd className="mt-1 font-display text-[0.9375rem] font-bold">
                  {formatDate(user.createdAt)}
                </dd>
              </div>
            </dl>
          </div>
        </section>
      </Reveal>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Reveal delayStep={1}>
          <Card
            title="Account details"
            description="Your currency affects how every amount is displayed."
            className="h-full"
          >
            <form
              onSubmit={profileForm.handleSubmit((values) => updateProfile.mutate(values))}
              className="space-y-4"
              noValidate
            >
              <Input
                label="Full name"
                required
                error={profileForm.formState.errors.name?.message}
                {...profileForm.register('name')}
              />

              <Select
                label="Currency"
                error={profileForm.formState.errors.currency?.message}
                {...profileForm.register('currency')}
              >
                {(Object.entries(CURRENCY_LABELS) as [Currency, string][]).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>

              <AmountInput
                label="Starting balance"
                currencyLabel={user.currency}
                type="number"
                step="0.01"
                min="0"
                hint={`Money you had before recording transactions. Currently ${formatCurrency(
                  user.initialBalance,
                  user.currency,
                )}.`}
                error={profileForm.formState.errors.initialBalance?.message}
                {...profileForm.register('initialBalance')}
              />

              <div className="flex justify-end pt-1">
                <Button type="submit" isLoading={updateProfile.isPending}>
                  Save changes
                </Button>
              </div>
            </form>
          </Card>
        </Reveal>

        <Reveal delayStep={2}>
          <Card title="Password" description="Use at least 8 characters." className="h-full">
            <form
              onSubmit={passwordForm.handleSubmit((values) => changePassword.mutate(values))}
              className="space-y-4"
              noValidate
            >
              <Input
                label="Current password"
                type={showPasswords ? 'text' : 'password'}
                autoComplete="current-password"
                required
                error={passwordForm.formState.errors.currentPassword?.message}
                trailing={
                  <button
                    type="button"
                    onClick={() => setShowPasswords((visible) => !visible)}
                    className="inline-flex items-center gap-1 text-[0.75rem] font-semibold text-ink-500 transition hover:text-ink-800"
                  >
                    {showPasswords ? (
                      <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    {showPasswords ? 'Hide' : 'Show'}
                  </button>
                }
                {...passwordForm.register('currentPassword')}
              />
              <Input
                label="New password"
                type={showPasswords ? 'text' : 'password'}
                autoComplete="new-password"
                required
                error={passwordForm.formState.errors.newPassword?.message}
                {...passwordForm.register('newPassword')}
              />
              <Input
                label="Confirm new password"
                type={showPasswords ? 'text' : 'password'}
                autoComplete="new-password"
                required
                error={passwordForm.formState.errors.confirmPassword?.message}
                {...passwordForm.register('confirmPassword')}
              />

              <div className="flex flex-col gap-3 border-t border-ink-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="flex items-start gap-1.5 text-[0.75rem] leading-relaxed text-ink-500">
                  <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-income-600" aria-hidden="true" />
                  Passwords are hashed with bcrypt and never stored in plain text.
                </p>
                <Button type="submit" isLoading={changePassword.isPending}>
                  Update password
                </Button>
              </div>
            </form>
          </Card>
        </Reveal>
      </div>
    </div>
  );
};
