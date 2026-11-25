'use client';

import { useActionState, useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import NextLink from 'next/link';
import Image from 'next/image';
import { Center } from '@astryxdesign/core/Center';
import { VStack } from '@astryxdesign/core/Layout';
import { Card } from '@astryxdesign/core/Card';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { CheckboxInput } from '@astryxdesign/core/CheckboxInput';
import { Button } from '@astryxdesign/core/Button';
import { Link } from '@astryxdesign/core/Link';
import { Section } from '@astryxdesign/core/Section';
import { signup, type AuthFormState } from '@/lib/actions/auth';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { SIGNUP_STEP1_KEY, type SignupStep1 } from './signup-step1-storage';

// Background: Unsplash License (free for commercial use), photo by Craftsman Concrete Floors.
// https://unsplash.com/photos/pmWQwdO9Rpg
const pageStyle: CSSProperties = {
  minHeight: '100vh',
  backgroundImage:
    'linear-gradient(rgba(15, 17, 21, 0.55), rgba(15, 17, 21, 0.55)), url(/images/auth/warehouse-floor-bg.jpg)',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
};

const initialState: AuthFormState = {};

/** LRN-Signup Step 1 of 2 — name/email/password/WIOA-intent only. Per
 * docs/wioa/WIOA_INTEGRATION_PLAN.md Section 5: WIOA profile fields are collected at registration,
 * not deferred to Profile/Funding, but as the reference visual's own Step 2 — a separate screen,
 * not one long form. Checking "pursuing WIOA" hands off to /signup/wioa instead of expanding inline;
 * unchecked, this step alone creates the account exactly as before. */
export function SignupAstryx() {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(signup, initialState);

  // Repopulate if the learner came back from Step 2 via "Back" — sessionStorage, not state,
  // survives the navigation away and back. Lazy initializer (not an effect), same pattern as
  // AppShell's sidebar-collapsed read, so there's no second render just to apply it.
  const [step1Prefill] = useState<SignupStep1 | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = sessionStorage.getItem(SIGNUP_STEP1_KEY);
      return raw ? (JSON.parse(raw) as SignupStep1) : null;
    } catch {
      return null;
    }
  });

  const [name, setName] = useState(step1Prefill?.name ?? '');
  const [email, setEmail] = useState(step1Prefill?.email ?? '');
  const [password, setPassword] = useState(step1Prefill?.password ?? '');
  const [pursuingWioa, setPursuingWioa] = useState(Boolean(step1Prefill));

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (!pursuingWioa) return; // let the form submit normally via formAction
    e.preventDefault();
    const step1: SignupStep1 = { name, email, password };
    try {
      sessionStorage.setItem(SIGNUP_STEP1_KEY, JSON.stringify(step1));
    } catch {
      // Ignore — Step 2 will just come up empty and the learner re-enters name/email/password.
    }
    router.push('/signup/wioa');
  }

  return (
    <Center role="main" axis="both" padding={6} style={pageStyle}>
      <Card padding={8} width="100%" maxWidth={440}>
        <form action={formAction} onSubmit={handleSubmit}>
          <VStack gap={4} hAlign="stretch">
            <VStack gap={3} hAlign="center">
              <Image src="/nfcap-logo.png" alt="NFCAP" width={160} height={18} priority />
              <VStack gap={1} hAlign="center">
                {/* display-1 (the same type Login/ForgotPassword/ResetPassword use) wraps
                    "Create your account" onto two lines inside this 440px card — it's the
                    longest heading of the auth flow. display-2 keeps it prominent but fits one
                    line, matching how the shorter headings on those other screens render. */}
                <Text type="display-2" as="h1">
                  Create your account
                </Text>
                <Text type="body" color="secondary" size="sm">
                  Sign up to start your NFCAP flooring apprenticeship training.
                </Text>
              </VStack>
            </VStack>

            <VStack gap={2}>
              <TextInput
                label="Full name"
                htmlName="name"
                size="lg"
                isRequired
                autoComplete="name"
                value={name}
                onChange={setName}
              />
              <TextInput
                label="Email"
                htmlName="email"
                type="email"
                size="lg"
                isRequired
                autoComplete="email"
                value={email}
                onChange={setEmail}
              />
              <PasswordInput
                label="Password"
                isLabelHidden
                placeholder="Password"
                htmlName="password"
                size="lg"
                isRequired
                autoComplete="new-password"
                value={password}
                onChange={setPassword}
              />
              <Text type="supporting" color="secondary" size="sm">
                At least 6 characters.
              </Text>
            </VStack>

            <Section variant="muted" padding={3}>
              <CheckboxInput
                label="I want to explore WIOA funding for apprenticeship tuition instead of paying out of pocket."
                htmlName="pursuingWioa"
                value={pursuingWioa}
                onChange={setPursuingWioa}
              />
            </Section>

            {state.error && (
              <Text type="supporting" color="primary">
                {state.error}
              </Text>
            )}

            <Text type="supporting" color="secondary" size="sm">
              By signing up, you agree to the{' '}
              <Link href="/terms" as={NextLink} type="inherit">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/privacy" as={NextLink} type="inherit">
                Privacy Policy
              </Link>
              .
            </Text>

            <Button
              label={pending ? 'Creating account…' : pursuingWioa ? 'Continue' : 'Sign up'}
              type="submit"
              variant="primary"
              size="lg"
              isLoading={pending}
            />

            <VStack hAlign="center">
              <Text type="supporting" color="secondary">
                Already have an account?{' '}
                <Link href="/login" as={NextLink} type="supporting">
                  Sign in
                </Link>
              </Text>
            </VStack>
          </VStack>
        </form>
      </Card>
    </Center>
  );
}
