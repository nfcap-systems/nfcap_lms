'use client';

import { useActionState, useState } from 'react';
import { updatePassword, type AuthFormState } from '@/lib/actions/auth';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { LockIcon, EyeIcon, EyeOffIcon, ArrowRightIcon } from '@/app/login/icons';

const initialState: AuthFormState = {};

export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState(updatePassword, initialState);
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const mismatch = confirmPassword.length > 0 && password !== confirmPassword;

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-5">
      <Field label="New password" htmlFor="password">
        <div className="relative">
          <LockIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <Input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="At least 8 characters"
            className="h-11 pl-9 pr-10"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            aria-pressed={showPassword}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted transition-colors hover:text-text-secondary"
          >
            {showPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
          </button>
        </div>
      </Field>

      <Field
        label="Confirm new password"
        htmlFor="confirmPassword"
        error={mismatch ? 'Passwords do not match.' : undefined}
      >
        <div className="relative">
          <LockIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <Input
            id="confirmPassword"
            type={showPassword ? 'text' : 'password'}
            required
            autoComplete="new-password"
            placeholder="Re-enter your new password"
            className="h-11 pl-9"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
      </Field>

      {state.error && <p className="text-sm text-status-danger-text">{state.error}</p>}

      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="w-full gap-2"
        disabled={pending || mismatch || password.length === 0}
      >
        {pending ? 'Updating…' : 'Update password'}
        {!pending && <ArrowRightIcon className="h-4 w-4" />}
      </Button>
    </form>
  );
}
