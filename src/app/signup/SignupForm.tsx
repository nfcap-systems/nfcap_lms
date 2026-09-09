'use client';

import { useActionState, useState } from 'react';
import { signup, type AuthFormState } from '@/lib/actions/auth';
import { Field } from '@/components/ui/Field';
import { Input, Select, Checkbox } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

const initialState: AuthFormState = {};

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signup, initialState);
  const [pursuingWioa, setPursuingWioa] = useState(false);

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-4">
      <Field label="Full name" htmlFor="name">
        <Input id="name" name="name" type="text" required autoComplete="name" />
      </Field>

      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </Field>

      <Field label="Password" htmlFor="password" hint="At least 6 characters.">
        <Input
          id="password"
          name="password"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
        />
      </Field>

      <label className="flex items-start gap-2 rounded-md border border-border-default bg-bg-subtle p-3 text-sm text-text-primary">
        <Checkbox
          name="pursuingWioa"
          checked={pursuingWioa}
          onChange={(e) => setPursuingWioa(e.target.checked)}
          className="mt-0.5"
        />
        <span>
          I want to explore WIOA funding for apprenticeship tuition instead of paying out of
          pocket.
        </span>
      </label>

      {pursuingWioa && (
        <div className="flex flex-col gap-4 rounded-md border border-border-subtle p-4">
          <p className="text-xs text-text-muted">
            These details are used to match you to your local workforce board — they&apos;re not
            shared anywhere else in the app.
          </p>

          <Field label="Date of birth" htmlFor="dateOfBirth">
            <Input id="dateOfBirth" name="dateOfBirth" type="date" required={pursuingWioa} />
          </Field>

          <Field label="Mobile phone" htmlFor="mobilePhone">
            <Input
              id="mobilePhone"
              name="mobilePhone"
              type="tel"
              required={pursuingWioa}
              autoComplete="tel"
            />
          </Field>

          <Field label="Street address" htmlFor="streetAddress">
            <Input
              id="streetAddress"
              name="streetAddress"
              type="text"
              required={pursuingWioa}
              autoComplete="address-line1"
            />
          </Field>

          <div className="grid grid-cols-1 gap-4">
            <Field label="City" htmlFor="city">
              <Input id="city" name="city" type="text" required={pursuingWioa} autoComplete="address-level2" />
            </Field>
            <Field label="State" htmlFor="state">
              <Input
                id="state"
                name="state"
                type="text"
                defaultValue="CA"
                required={pursuingWioa}
                autoComplete="address-level1"
              />
            </Field>
            <Field label="ZIP code" htmlFor="zip">
              <Input
                id="zip"
                name="zip"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{5}"
                required={pursuingWioa}
                autoComplete="postal-code"
              />
            </Field>
          </div>

          <Field label="Preferred language" htmlFor="preferredLanguage">
            <Input id="preferredLanguage" name="preferredLanguage" type="text" defaultValue="English" />
          </Field>

          <Field label="Employment status" htmlFor="employmentStatus">
            <Select id="employmentStatus" name="employmentStatus" defaultValue="">
              <option value="" disabled>
                Select one
              </option>
              <option value="Unemployed">Unemployed</option>
              <option value="Employed part-time">Employed part-time</option>
              <option value="Employed full-time">Employed full-time</option>
              <option value="Not in labor force">Not in labor force</option>
            </Select>
          </Field>

          <Field
            label="Unemployment insurance status"
            htmlFor="unemploymentInsuranceStatus"
            hint="Have you filed for, received, or exhausted UI in the last 6 months?"
          >
            <Select id="unemploymentInsuranceStatus" name="unemploymentInsuranceStatus" defaultValue="">
              <option value="" disabled>
                Select one
              </option>
              <option value="Currently receiving">Currently receiving</option>
              <option value="Filed, awaiting decision">Filed, awaiting decision</option>
              <option value="Exhausted in last 6 months">Exhausted in last 6 months</option>
              <option value="Not applicable">Not applicable</option>
            </Select>
          </Field>

          <Field label="Training / apprenticeship interest" htmlFor="trainingApprenticeshipInterest">
            <Input
              id="trainingApprenticeshipInterest"
              name="trainingApprenticeshipInterest"
              type="text"
              placeholder="e.g. Flooring & Tile Apprenticeship"
              required={pursuingWioa}
            />
          </Field>
        </div>
      )}

      {state.error && <p className="text-sm text-status-danger-text">{state.error}</p>}

      <Button type="submit" size="lg" className="mt-2 w-full" disabled={pending}>
        {pending ? 'Creating account…' : 'Sign up'}
      </Button>
    </form>
  );
}
