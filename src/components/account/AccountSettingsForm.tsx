'use client';

import { useActionState, useState } from 'react';
import {
  updateName,
  updateEmail,
  updateAccountPassword,
  updateContactInfo,
  type AccountFormState,
} from '@/lib/actions/account';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Field,
  Input,
} from '@/components/ui';
import type { LearnerProfile } from '@/lib/data/wioa';

const initialState: AccountFormState = {};

function FormMessage({ state }: { state: AccountFormState }) {
  if (state.error) {
    return (
      <p className="rounded-md bg-status-danger-bg px-3 py-2 text-sm text-status-danger-text">
        {state.error}
      </p>
    );
  }
  if (state.success) {
    return (
      <p className="rounded-md bg-status-success-bg px-3 py-2 text-sm text-status-success-text">
        {state.success}
      </p>
    );
  }
  return null;
}

function NameSection({ name }: { name: string }) {
  const [state, formAction, pending] = useActionState(updateName, initialState);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Name</CardTitle>
          <CardDescription>How your name appears across the app.</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <Field label="Full name" htmlFor="name">
            <Input id="name" name="name" defaultValue={name} required autoComplete="name" />
          </Field>
          <FormMessage state={state} />
          <div>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? 'Saving…' : 'Save name'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function EmailSection({ email }: { email: string }) {
  const [state, formAction, pending] = useActionState(updateEmail, initialState);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Email address</CardTitle>
          <CardDescription>
            Changing this sends a confirmation link to the new address before it takes effect.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <Field label="Email address" htmlFor="email">
            <Input id="email" name="email" type="email" defaultValue={email} required />
          </Field>
          <Field
            label="Current password"
            htmlFor="email-current-password"
            hint="Confirms it's really you."
          >
            <Input
              id="email-current-password"
              name="currentPassword"
              type="password"
              required
              autoComplete="current-password"
            />
          </Field>
          <FormMessage state={state} />
          <div>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? 'Saving…' : 'Change email'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function PasswordSection() {
  const [state, formAction, pending] = useActionState(updateAccountPassword, initialState);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const mismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Password</CardTitle>
          <CardDescription>Choose a new password of at least 8 characters.</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <Field label="Current password" htmlFor="password-current-password">
            <Input
              id="password-current-password"
              name="currentPassword"
              type="password"
              required
              autoComplete="current-password"
            />
          </Field>
          <Field label="New password" htmlFor="newPassword">
            <Input
              id="newPassword"
              name="newPassword"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </Field>
          <Field
            label="Confirm new password"
            htmlFor="confirmNewPassword"
            error={mismatch ? 'Passwords do not match.' : undefined}
          >
            <Input
              id="confirmNewPassword"
              type="password"
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </Field>
          <FormMessage state={state} />
          <div>
            <Button
              type="submit"
              size="sm"
              disabled={pending || mismatch || newPassword.length === 0}
            >
              {pending ? 'Saving…' : 'Change password'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function dateInputValue(value: Date | null): string {
  if (!value) return '';
  return value.toISOString().slice(0, 10);
}

function ContactSection({ profile }: { profile: LearnerProfile | null }) {
  const [state, formAction, pending] = useActionState(updateContactInfo, initialState);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Contact info</CardTitle>
          <CardDescription>Your mailing address and phone number.</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <Field label="Street address" htmlFor="streetAddress">
            <Input
              id="streetAddress"
              name="streetAddress"
              defaultValue={profile?.streetAddress ?? ''}
              autoComplete="street-address"
            />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="City" htmlFor="city">
              <Input
                id="city"
                name="city"
                defaultValue={profile?.city ?? ''}
                autoComplete="address-level2"
              />
            </Field>
            <Field label="State" htmlFor="state">
              <Input
                id="state"
                name="state"
                defaultValue={profile?.state ?? ''}
                autoComplete="address-level1"
              />
            </Field>
            <Field label="ZIP" htmlFor="zip">
              <Input
                id="zip"
                name="zip"
                defaultValue={profile?.zip ?? ''}
                autoComplete="postal-code"
              />
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Mobile phone" htmlFor="mobilePhone">
              <Input
                id="mobilePhone"
                name="mobilePhone"
                defaultValue={profile?.mobilePhone ?? ''}
                autoComplete="tel"
              />
            </Field>
            <Field label="Date of birth" htmlFor="dateOfBirth">
              <Input
                id="dateOfBirth"
                name="dateOfBirth"
                type="date"
                defaultValue={dateInputValue(profile?.dateOfBirth ?? null)}
              />
            </Field>
          </div>
          <Field label="Preferred language" htmlFor="preferredLanguage">
            <Input
              id="preferredLanguage"
              name="preferredLanguage"
              defaultValue={profile?.preferredLanguage ?? ''}
            />
          </Field>
          <FormMessage state={state} />
          <div>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? 'Saving…' : 'Save contact info'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function AccountSettingsForm({
  name,
  email,
  learnerProfile,
}: {
  name: string;
  email: string;
  /** Pass only for LEARNER accounts — omitted entirely renders no contact-info section. */
  learnerProfile?: LearnerProfile | null;
}) {
  return (
    <div className="flex flex-col gap-6">
      <NameSection name={name} />
      <EmailSection email={email} />
      <PasswordSection />
      {learnerProfile !== undefined && <ContactSection profile={learnerProfile} />}
    </div>
  );
}
