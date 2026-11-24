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
import { login, type AuthFormState } from '@/lib/actions/auth';
import { PasswordInput } from '@/components/auth/PasswordInput';

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

export function LoginAstryx() {
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? '';
  const justSignedUp = searchParams.get('confirm') === '1';
  const justReset = searchParams.get('reset') === '1';
  const linkExpired = searchParams.get('error') === 'link-expired';

  const [state, formAction, pending] = useActionState(login, initialState);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <Center role="main" axis="both" padding={6} style={pageStyle}>
      <Card padding={8} width="100%" maxWidth={400}>
        <form action={formAction}>
          <input type="hidden" name="next" value={next} />
          <VStack gap={4} hAlign="stretch">
            <VStack gap={3} hAlign="center">
              <Image src="/nfcap-logo.png" alt="NFCAP" width={160} height={18} priority />
              <VStack gap={1} hAlign="center">
                <Text type="display-1" as="h1">
                  Welcome back
                </Text>
                <Text type="body" color="secondary" size="sm">
                  Sign in to your NFCAP account to access your learning dashboard, courses, and
                  certificates.
                </Text>
              </VStack>
            </VStack>

            {justSignedUp && (
              <Section variant="muted" padding={3}>
                <Text type="supporting">
                  Account created. Check your email to confirm it, then log in below.
                </Text>
              </Section>
            )}

            {justReset && (
              <Section variant="muted" padding={3}>
                <Text type="supporting">Password updated. Sign in with your new password.</Text>
              </Section>
            )}

            {linkExpired && (
              <Section variant="muted" padding={3}>
                <Text type="supporting">
                  That link has expired or already been used. Request a new one below.
                </Text>
              </Section>
            )}

            <VStack gap={2}>
              <TextInput
                label="Work email"
                isLabelHidden
                type="email"
                htmlName="email"
                placeholder="you@email.com"
                value={email}
                onChange={setEmail}
                size="lg"
                autoComplete="email"
                isRequired
              />
              <PasswordInput
                label="Password"
                isLabelHidden
                htmlName="password"
                placeholder="Password"
                value={password}
                onChange={setPassword}
                size="lg"
                autoComplete="current-password"
                isRequired
                status={state.error ? { type: 'error', message: state.error } : undefined}
              />
            </VStack>

            <Link href="/forgot-password" as={NextLink} size="sm" color="secondary" type="supporting">
              Forgot your password?
            </Link>

            <Button
              label={pending ? 'Signing in…' : 'Sign in'}
              type="submit"
              variant="primary"
              size="lg"
              isLoading={pending}
            />

            <VStack hAlign="center">
              <Text type="supporting" color="secondary">
                Don&apos;t have an account?{' '}
                <Link href="/signup" as={NextLink} type="supporting">
                  Create one
                </Link>
              </Text>
            </VStack>
          </VStack>
        </form>
      </Card>
    </Center>
  );
}
