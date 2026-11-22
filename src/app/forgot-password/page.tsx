import { Suspense } from 'react';
import { AuthShell } from '@/components/auth/AuthShell';
import { ForgotPasswordForm } from './ForgotPasswordForm';

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      active="signin"
      heading="Reset your password"
      subheading="Enter the email address on your account and we'll send you a link to reset your password."
    >
      <Suspense>
        <ForgotPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
