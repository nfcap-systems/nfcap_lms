'use client';

import { useActionState, useEffect, useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import NextLink from 'next/link';
import Image from 'next/image';
import { Center } from '@astryxdesign/core/Center';
import { VStack, HStack } from '@astryxdesign/core/Layout';
import { Card } from '@astryxdesign/core/Card';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Selector } from '@astryxdesign/core/Selector';
import { DateInput } from '@astryxdesign/core/DateInput';
import type { ISODateString } from '@astryxdesign/core/Calendar';
import { Button } from '@astryxdesign/core/Button';
import { Link } from '@astryxdesign/core/Link';
import { Divider } from '@astryxdesign/core/Divider';
import { signup, type AuthFormState } from '@/lib/actions/auth';
import { SIGNUP_STEP1_KEY, type SignupStep1 } from '../signup-step1-storage';

const ZIP_PATTERN = /^\d{5}$/;

const pageStyle: CSSProperties = {
  minHeight: '100vh',
  backgroundImage:
    'linear-gradient(rgba(15, 17, 21, 0.6), rgba(15, 17, 21, 0.6)), url(/images/learner/tile-installation.jpg)',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
};

const EMPLOYMENT_OPTIONS = [
  { value: 'Unemployed', label: 'Unemployed' },
  { value: 'Employed part-time', label: 'Employed part-time' },
  { value: 'Employed full-time', label: 'Employed full-time' },
  { value: 'Not in labor force', label: 'Not in labor force' },
];

const UI_STATUS_OPTIONS = [
  { value: 'Currently receiving', label: 'Currently receiving' },
  { value: 'Filed, awaiting decision', label: 'Filed, awaiting decision' },
  { value: 'Exhausted in last 6 months', label: 'Exhausted in last 6 months' },
  { value: 'Not applicable', label: 'Not applicable' },
];

const initialState: AuthFormState = {};

const twoColGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 12,
};

const threeColGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1.4fr 0.8fr 1fr',
  gap: 12,
};

/** Groups Step 2's fields into the 3 numbered sections (Option B from
 * temp_ss/mockups/wioa-signup-form-comparison.html) instead of one long flat list — same fields,
 * same validation, just shorter on screen. */
function FormSection({
  step,
  title,
  isLast,
  children,
}: {
  step: number;
  title: string;
  isLast?: boolean;
  children: React.ReactNode;
}) {
  return (
    <VStack gap={3} style={isLast ? undefined : { marginBottom: 4 }}>
      <VStack gap={2}>
        <HStack gap={2} vAlign="center">
          <Text type="body" weight="bold" size="sm">
            {step}
          </Text>
          <Text type="body" weight="bold" size="sm">
            {title}
          </Text>
        </HStack>
        <Divider />
      </VStack>
      {children}
    </VStack>
  );
}

/** LRN-Signup Step 2 of 2 — the WIOA profile fields, reached only from Step 1
 * (SignupAstryx.tsx) checking "pursuing WIOA." Submits the SAME `signup` server action as Step 1
 * does, with Step 1's fields carried along as hidden inputs — one account-creation call either
 * way, just split across two screens per docs/wioa/WIOA_INTEGRATION_PLAN.md Section 5. */
export function SignupWioaAstryx() {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(signup, initialState);

  // Step 1 must have run first — there's no session yet to carry this any other way pre-auth.
  // Lazy initializer (not an effect), same pattern as AppShell's sidebar-collapsed read. Left in
  // sessionStorage rather than cleared on read: Step 1's own "Back" prefill (SignupAstryx.tsx)
  // depends on it still being there if the learner goes back from here. It's per-tab, never
  // reaches the server, and clears itself when the tab closes either way.
  const [step1] = useState<SignupStep1 | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = sessionStorage.getItem(SIGNUP_STEP1_KEY);
      return raw ? (JSON.parse(raw) as SignupStep1) : null;
    } catch {
      return null;
    }
  });

  // Redirecting (a navigation side effect, not React state) belongs in an effect — step1 itself
  // is never set here, only read above.
  useEffect(() => {
    if (!step1) router.replace('/signup');
  }, [step1, router]);

  const [dateOfBirth, setDateOfBirth] = useState<ISODateString | undefined>(undefined);
  const [mobilePhone, setMobilePhone] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [city, setCity] = useState('');
  const [state2, setState2] = useState('CA');
  const [zip, setZip] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState('English');
  const [employmentStatus, setEmploymentStatus] = useState('');
  const [unemploymentInsuranceStatus, setUnemploymentInsuranceStatus] = useState('');
  const [trainingInterest, setTrainingInterest] = useState('');

  // @astryxdesign/core's TextInput/Selector/DateInput only set aria-required, never the native
  // `required` attribute (see src/lib/validation.ts), so this form gets no browser-level
  // blocking on its own — these checks replace it. employmentStatus/unemploymentInsuranceStatus/
  // preferredLanguage are deliberately not required here, matching the form's own field markup.
  const zipFormatInvalid = zip.length > 0 && !ZIP_PATTERN.test(zip);
  const canSubmit =
    Boolean(dateOfBirth) &&
    mobilePhone.trim() !== '' &&
    streetAddress.trim() !== '' &&
    city.trim() !== '' &&
    state2.trim() !== '' &&
    zip.trim() !== '' &&
    !zipFormatInvalid &&
    trainingInterest.trim() !== '';

  if (!step1) return null;

  return (
    <Center role="main" axis="both" padding={6} style={pageStyle}>
      <Card padding={8} width="100%" maxWidth={560}>
        <form action={formAction}>
          <input type="hidden" name="name" value={step1.name} />
          <input type="hidden" name="email" value={step1.email} />
          <input type="hidden" name="password" value={step1.password} />
          <input type="hidden" name="pursuingWioa" value="on" />
          <input type="hidden" name="dateOfBirth" value={dateOfBirth ?? ''} />
          <VStack gap={4} hAlign="stretch">
            <VStack gap={3} hAlign="center">
              <Image src="/nfcap-logo.png" alt="NFCAP" width={160} height={18} priority />
              <VStack gap={1} hAlign="center">
                <Text type="display-1" as="h1">
                  WIOA funding details
                </Text>
                <Text type="body" color="secondary" size="sm">
                  Step 2 of 2 — these details are used to match you to your local workforce board;
                  they&apos;re not shared anywhere else in the app.
                </Text>
              </VStack>
            </VStack>

            <FormSection step={1} title="Personal & contact">
              <div style={twoColGridStyle}>
                <DateInput
                  label="Date of birth"
                  isRequired
                  width="100%"
                  value={dateOfBirth}
                  onChange={setDateOfBirth}
                />

                <TextInput
                  label="Mobile phone"
                  htmlName="mobilePhone"
                  type="tel"
                  autoComplete="tel"
                  isRequired
                  width="100%"
                  value={mobilePhone}
                  onChange={setMobilePhone}
                />
              </div>

              <TextInput
                label="Preferred language"
                htmlName="preferredLanguage"
                width="100%"
                value={preferredLanguage}
                onChange={setPreferredLanguage}
              />
            </FormSection>

            <FormSection step={2} title="Address">
              <TextInput
                label="Street address"
                htmlName="streetAddress"
                autoComplete="address-line1"
                isRequired
                width="100%"
                value={streetAddress}
                onChange={setStreetAddress}
              />

              <div style={threeColGridStyle}>
                <TextInput
                  label="City"
                  htmlName="city"
                  autoComplete="address-level2"
                  isRequired
                  width="100%"
                  value={city}
                  onChange={setCity}
                />
                <TextInput
                  label="State"
                  htmlName="state"
                  autoComplete="address-level1"
                  isRequired
                  width="100%"
                  value={state2}
                  onChange={setState2}
                />
                <TextInput
                  label="ZIP code"
                  htmlName="zip"
                  inputMode="numeric"
                  autoComplete="postal-code"
                  isRequired
                  width="100%"
                  value={zip}
                  onChange={setZip}
                  status={
                    zipFormatInvalid
                      ? { type: 'error', message: 'Enter a 5-digit ZIP code.' }
                      : undefined
                  }
                />
              </div>
            </FormSection>

            <FormSection step={3} title="Employment & training" isLast>
              {/* Both Selectors now carry label + control only, nothing else — that's what kept
                  label row 1 / control row 2 lined up across the two columns (the earlier
                  bottom-align fix matched the select boxes but pushed "Employment status"'s own
                  label out of line with "Unemployment insurance status"'s). The UI-status
                  clarification moves to a shared caption below the row instead of living inside
                  one Selector's `description`, which is what broke the row height in the first
                  place. */}
              <div style={twoColGridStyle}>
                <Selector
                  label="Employment status"
                  htmlName="employmentStatus"
                  width="100%"
                  options={EMPLOYMENT_OPTIONS}
                  placeholder="Select one"
                  value={employmentStatus}
                  onChange={(v) => setEmploymentStatus(v ?? '')}
                />

                <Selector
                  label="Unemployment insurance status"
                  htmlName="unemploymentInsuranceStatus"
                  width="100%"
                  options={UI_STATUS_OPTIONS}
                  placeholder="Select one"
                  value={unemploymentInsuranceStatus}
                  onChange={(v) => setUnemploymentInsuranceStatus(v ?? '')}
                />
              </div>
              <Text type="supporting" color="secondary" size="sm">
                Unemployment insurance status: have you filed for, received, or exhausted UI in
                the last 6 months?
              </Text>

              <TextInput
                label="Training / apprenticeship interest"
                htmlName="trainingApprenticeshipInterest"
                placeholder="e.g. Flooring & Tile Apprenticeship"
                isRequired
                width="100%"
                value={trainingInterest}
                onChange={setTrainingInterest}
              />
            </FormSection>

            {state.error && (
              <Text type="supporting" color="primary">
                {state.error}
              </Text>
            )}

            <Button
              label={pending ? 'Creating account…' : 'Create account'}
              type="submit"
              variant="primary"
              size="lg"
              isLoading={pending}
              isDisabled={pending || !canSubmit}
            />

            <VStack hAlign="center">
              <Link href="/signup" as={NextLink} type="supporting">
                &larr; Back
              </Link>
            </VStack>
          </VStack>
        </form>
      </Card>
    </Center>
  );
}
