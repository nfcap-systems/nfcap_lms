import { Suspense } from 'react';
import Link from 'next/link';
import { LoginForm } from './LoginForm';
import { AuthShell } from '@/components/auth/AuthShell';

export default function LoginPage() {
  return (
    <AuthShell
      active="signin"
      heading="Welcome back"
      subheading="Sign in to your NFCAP account to access your learning dashboard, courses, and certificates."
      footer={
        <>
          Don&apos;t have an account?{' '}
          <Link
            href="/signup"
            className="font-semibold text-brand-accent hover:text-brand-accent-hover"
          >
            Create one →
          </Link>
        </>
      }
    >
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
