'use client';

import { useActionState, useState, type CSSProperties } from 'react';
import { useSearchParams } from 'next/navigation';
import NextLink from 'next/link';
import Image from 'next/image';
import { Center } from '@astryxdesign/core/Center';
import { VStack } from '@astryxdesign/core/Layout';
import { Card } from '@astryxdesign/core/Card';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Button } from '@astryxdesign/core/Button';
import { Link } from '@astryxdesign/core/Link';
import { Section } from '@astryxdesign/core/Section';
import { requestPasswordReset, type AuthFormState } from '@/lib/actions/auth';
import { isValidEmail } from '@/lib/validation';

// Same background/Theme treatment as src/app/login/LoginAstryx.tsx — one shared visual family
// across every auth route, not just login/signup.
const pageStyle: CSSProperties = {
  minHeight: '100vh',
  backgroundImage:
    'linear-gradient(rgba(15, 17, 21, 0.55), rgba(15, 17, 21, 0.55)), url(/images/auth/warehouse-floor-bg.jpg)',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
};

const initialState: AuthFormState = {};

export function ForgotPasswordAstryx() {
  const searchParams = useSearchParams();
  const sent = searchParams.get('sent') === '1';
  const [state, formAction, pending] = useActionState(requestPasswordReset, initialState);
  const [email, setEmail] = useState('');

  // @astryxdesign/core's TextInput only sets aria-required, never the native `required`
  // attribute (see src/lib/validation.ts), so this form gets no browser-level blocking on its
  // own — these checks replace it.
  const emailFormatInvalid = email.length > 0 && !isValidEmail(email);
  const canSubmit = email.trim() !== '' && !emailFormatInvalid;

  return (
    <Center role="main" axis="both" padding={6} style={pageStyle}>
      <Card padding={8} width="100%" maxWidth={400}>
        <VStack gap={4} hAlign="stretch">
          <VStack gap={3} hAlign="center">
            <Image src="/nfcap-logo.png" alt="NFCAP" width={160} height={18} priority />
            <VStack gap={1} hAlign="center">
              <Text type="display-1" as="h1">
                Reset your password
              </Text>
              {!sent && (
                <Text type="body" color="secondary" size="sm">
                  Enter the email address on your account and we&apos;ll send you a link to reset
                  your password.
                </Text>
              )}
            </VStack>
          </VStack>

          {sent && (
            // Section must be a direct sibling here, not wrapped in its own VStack — Section's
            // "escape parent padding" CSS targets `:first-child`, and nesting it as the first
            // child of a new wrapper VStack (instead of a later child of this same outer one,
            // matching src/app/login/LoginAstryx.tsx's banners) made it bleed upward with a
            // negative margin and overlap the heading above it.
            <Section variant="muted" padding={3}>
              <Text type="supporting">
                If an account exists for that email, a password reset link is on its way. Check
                your inbox (and spam folder) — the link expires after a while, so use it soon.
              </Text>
            </Section>
          )}

          {sent ? (
            <VStack hAlign="center">
              <Link href="/login" as={NextLink} size="sm" color="secondary" type="supporting">
                ← Back to sign in
              </Link>
            </VStack>
          ) : (
            <form action={formAction}>
              <VStack gap={4} hAlign="stretch">
                <TextInput
                  label="Email address"
                  isLabelHidden
                  type="email"
                  htmlName="email"
                  placeholder="you@email.com"
                  value={email}
                  onChange={setEmail}
                  size="lg"
                  autoComplete="email"
                  isRequired
                  status={
                    emailFormatInvalid
                      ? { type: 'error', message: 'Enter a valid email address.' }
                      : state.error
                        ? { type: 'error', message: state.error }
                        : undefined
                  }
                />

                <Button
                  label={pending ? 'Sending…' : 'Send reset link'}
                  type="submit"
                  variant="primary"
                  size="lg"
                  isLoading={pending}
                  isDisabled={pending || !canSubmit}
                />

                <VStack hAlign="center">
                  <Link href="/login" as={NextLink} size="sm" color="secondary" type="supporting">
                    ← Back to sign in
                  </Link>
                </VStack>
              </VStack>
            </form>
          )}
        </VStack>
      </Card>
    </Center>
  );
}
