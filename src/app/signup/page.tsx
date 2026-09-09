import Link from 'next/link';
import { SignupForm } from './SignupForm';
import { AuthShell } from '@/components/auth/AuthShell';

export default function SignupPage() {
  return (
    <AuthShell
      active="signup"
      heading="Create your account"
      subheading="Sign up to start your NFCAP apprenticeship training."
      footer={
        <>
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-brand-accent hover:text-brand-accent-hover">
            Sign in →
          </Link>
        </>
      }
    >
      <SignupForm />
    </AuthShell>
  );
}
