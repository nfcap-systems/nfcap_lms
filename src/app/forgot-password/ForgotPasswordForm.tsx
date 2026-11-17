'use client';

import { useActionState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { requestPasswordReset, type AuthFormState } from '@/lib/actions/auth';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { MailIcon, ArrowRightIcon } from '@/app/login/icons';

const initialState: AuthFormState = {};

export function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const sent = searchParams.get('sent') === '1';
  const [state, formAction, pending] = useActionState(requestPasswordReset, initialState);

  if (sent) {
    return (
      <div className="mt-6 flex flex-col gap-4">
        <p className="rounded-md bg-status-info-bg px-3 py-2 text-sm text-status-info-text">
          If an account exists for that email, a password reset link is on its way. Check your inbox
          (and spam folder) — the link expires after a while, so use it soon.
        </p>
        <Link
          href="/login"
          className="text-sm font-semibold text-brand-accent hover:text-brand-accent-hover"
        >
          ← Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-5">
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

      {state.error && <p className="text-sm text-status-danger-text">{state.error}</p>}

      <Button type="submit" variant="primary" size="lg" className="w-full gap-2" disabled={pending}>
        {pending ? 'Sending…' : 'Send reset link'}
        {!pending && <ArrowRightIcon className="h-4 w-4" />}
      </Button>

      <Link
        href="/login"
        className="text-center text-sm font-medium text-text-secondary hover:text-brand-primary"
      >
        ← Back to sign in
      </Link>
    </form>
  );
}
