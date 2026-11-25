'use client';

import { useActionState, useState, type CSSProperties } from 'react';
import Image from 'next/image';
import { Center } from '@astryxdesign/core/Center';
import { VStack } from '@astryxdesign/core/Layout';
import { Card } from '@astryxdesign/core/Card';
import { Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { updatePassword, type AuthFormState } from '@/lib/actions/auth';
import { PasswordInput } from '@/components/auth/PasswordInput';

// Same background/Theme treatment as src/app/login/LoginAstryx.tsx.
const pageStyle: CSSProperties = {
  minHeight: '100vh',
  backgroundImage:
    'linear-gradient(rgba(15, 17, 21, 0.55), rgba(15, 17, 21, 0.55)), url(/images/auth/warehouse-floor-bg.jpg)',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
};

const initialState: AuthFormState = {};

export function ResetPasswordAstryx() {
  const [state, formAction, pending] = useActionState(updatePassword, initialState);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const mismatch = confirmPassword.length > 0 && password !== confirmPassword;

  return (
    <Center role="main" axis="both" padding={6} style={pageStyle}>
      <Card padding={8} width="100%" maxWidth={400}>
        <form action={formAction}>
          <VStack gap={4} hAlign="stretch">
            <VStack gap={3} hAlign="center">
              <Image src="/nfcap-logo.png" alt="NFCAP" width={160} height={18} priority />
              <VStack gap={1} hAlign="center">
                <Text type="display-1" as="h1">
                  Set a new password
                </Text>
                <Text type="body" color="secondary" size="sm">
                  Choose a new password for your account.
                </Text>
              </VStack>
            </VStack>

            <VStack gap={2}>
              <PasswordInput
                label="New password"
                isLabelHidden
                htmlName="password"
                placeholder="At least 8 characters"
                value={password}
                onChange={setPassword}
                size="lg"
                autoComplete="new-password"
                isRequired
              />
              <PasswordInput
                label="Confirm new password"
                isLabelHidden
                placeholder="Re-enter your new password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                size="lg"
                autoComplete="new-password"
                isRequired
                status={mismatch ? { type: 'error', message: 'Passwords do not match.' } : undefined}
              />
            </VStack>

            {state.error && (
              <Text type="supporting" color="primary">
                {state.error}
              </Text>
            )}

            <Button
              label={pending ? 'Updating…' : 'Update password'}
              type="submit"
              variant="primary"
              size="lg"
              isLoading={pending}
              isDisabled={pending || mismatch || password.length === 0}
            />
          </VStack>
        </form>
      </Card>
    </Center>
  );
}
