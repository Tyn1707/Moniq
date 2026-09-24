import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Calendar, Mail, ShieldCheck, User as UserIcon } from 'lucide-react';
import { Card } from '../components/ui';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Field';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { authService } from '../services';
import { ApiError } from '../services/api';
import { CURRENCY_LABELS, formatCurrency, formatDate } from '../utils/format';
import type { Currency } from '../types';

/**
 * Profile & settings (brief §21).
 *
 * Two independent forms: account details, and password. Keeping them separate
 * means a failed password change never discards an edited name, and the password
 * fields are never populated or echoed back.
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

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">Profile</h1>
        <p className="text-sm text-slate-500">Manage your account details and preferences.</p>
      </header>

      <Card>
        <dl className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
              <UserIcon className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Name</dt>
              <dd className="truncate text-sm font-medium text-slate-900">{user.name}</dd>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
              <Mail className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Email</dt>
              <dd className="truncate text-sm font-medium text-slate-900">{user.email}</dd>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
              <Calendar className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Member since
              </dt>
              <dd className="truncate text-sm font-medium text-slate-900">
                {formatDate(user.createdAt)}
              </dd>
            </div>
          </div>
        </dl>
      </Card>

      <Card
        title="Account details"
        description="Your currency affects how every amount is displayed."
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

          <Input
            label="Starting balance"
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            hint={`The money you had before recording transactions. Currently ${formatCurrency(
              user.initialBalance,
              user.currency,
            )}.`}
            error={profileForm.formState.errors.initialBalance?.message}
            {...profileForm.register('initialBalance')}
          />

          <div className="flex justify-end">
            <Button type="submit" isLoading={updateProfile.isPending}>
              Save changes
            </Button>
          </div>
        </form>
      </Card>

      <Card title="Password" description="Use at least 8 characters.">
        <form
          onSubmit={passwordForm.handleSubmit((values) => changePassword.mutate(values))}
          className="space-y-4"
          noValidate
        >
          <Input
            label="Current password"
            type="password"
            autoComplete="current-password"
            required
            error={passwordForm.formState.errors.currentPassword?.message}
            {...passwordForm.register('currentPassword')}
          />
          <Input
            label="New password"
            type="password"
            autoComplete="new-password"
            required
            error={passwordForm.formState.errors.newPassword?.message}
            {...passwordForm.register('newPassword')}
          />
          <Input
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            required
            error={passwordForm.formState.errors.confirmPassword?.message}
            {...passwordForm.register('confirmPassword')}
          />

          <div className="flex items-center justify-between gap-3">
            <p className="flex items-center gap-1.5 text-xs text-slate-500">
              <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
              Passwords are hashed and never stored in plain text.
            </p>
            <Button type="submit" isLoading={changePassword.isPending}>
              Update password
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
