'use client';

import { useActionState, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { login, type AuthFormState } from '@/lib/actions/auth';
import { Field } from '@/components/ui/Field';
import { Input, Checkbox } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { MailIcon, LockIcon, EyeIcon, EyeOffIcon, ArrowRightIcon } from './icons';

const initialState: AuthFormState = {};

export function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? '';
  const justSignedUp = searchParams.get('confirm') === '1';
  const [state, formAction, pending] = useActionState(login, initialState);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-5">
      <input type="hidden" name="next" value={next} />

      {justSignedUp && (
        <p className="rounded-md bg-status-info-bg px-3 py-2 text-sm text-status-info-text">
          Account created. Check your email to confirm it, then log in below.
        </p>
      )}

      <Field label="Email address" htmlFor="email">
        <div className="relative">
          <MailIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@company.com"
            className="h-11 pl-9"
          />
        </div>
      </Field>

      <Field label="Password" htmlFor="password">
        <div className="relative">
          <LockIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <Input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            required
            autoComplete="current-password"
            placeholder="Enter your password"
            className="h-11 pl-9 pr-10"
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

      <div className="flex items-center justify-between text-sm">
        <label className="flex items-center gap-2 text-text-secondary">
          <Checkbox name="rememberMe" />
          Remember me
        </label>
        <button
          type="button"
          disabled
          title="Coming soon"
          className="font-medium text-brand-accent underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:text-text-muted disabled:no-underline"
        >
          Forgot your password?
        </button>
      </div>

      {state.error && <p className="text-sm text-status-danger-text">{state.error}</p>}

      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="w-full gap-2"
        disabled={pending}
      >
        {pending ? 'Signing in…' : 'Sign in'}
        {!pending && <ArrowRightIcon className="h-4 w-4" />}
      </Button>
    </form>
  );
}
