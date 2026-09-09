import type { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { HardHatIcon, CertificateIcon, BriefcaseIcon, GrowthIcon } from '@/app/login/icons';

const FEATURES = [
  { icon: HardHatIcon, label: 'Hands-on Training' },
  { icon: CertificateIcon, label: 'Industry Certifications' },
  { icon: BriefcaseIcon, label: 'Career Opportunities' },
  { icon: GrowthIcon, label: 'Long-Term Growth' },
];

const TABS = [
  { key: 'signin', label: 'Sign In', href: '/login' },
  { key: 'signup', label: 'Create Account', href: '/signup' },
] as const;

type AuthShellProps = {
  active: 'signin' | 'signup';
  heading: string;
  subheading: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthShell({ active, heading, subheading, children, footer }: AuthShellProps) {
  return (
    <div className="min-h-screen bg-bg-card lg:pl-[50vw]">
      <aside className="relative hidden overflow-hidden bg-bg-subtle lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-[50vw] lg:flex-col">
        <div className="relative z-10 flex flex-1 flex-col px-14 pb-0 pt-14">
          <Image src="/nfcap-logo.png" alt="NFCAP" width={220} height={24} priority />

          <div className="mt-16 max-w-md">
            <h1 className="text-[2.75rem] font-bold leading-[1.08] tracking-tight text-brand-heading">
              Build your skills.
              <br />
              Build your future.
            </h1>
            <p className="mt-5 text-[15px] leading-relaxed text-text-secondary">
              The NFCAP Apprenticeship Program gives you the training, experience, and support to
              build a career in the flooring industry.
            </p>
          </div>

          <ul className="mt-12 grid grid-cols-4 gap-6">
            {FEATURES.map(({ icon: Icon, label }) => (
              <li key={label} className="flex flex-col gap-3">
                <Icon className="h-6 w-6 text-brand-primary" />
                <span className="text-[13px] font-medium leading-snug text-text-primary">
                  {label}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div
          className="relative mt-14 h-[38%] shrink-0 overflow-hidden bg-brand-primary-dark"
          style={{ clipPath: 'polygon(0 14%, 100% 0, 100% 100%, 0% 100%)' }}
        >
          <div
            className="absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                'repeating-linear-gradient(135deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 1px, transparent 1px, transparent 34px), repeating-linear-gradient(45deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 34px)',
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
          <div
            className="absolute -top-16 right-[22%] h-56 w-28 -rotate-[18deg] bg-brand-primary"
            aria-hidden
          />
          <div
            className="absolute -top-16 right-[16%] h-56 w-8 -rotate-[18deg] bg-brand-accent"
            aria-hidden
          />
        </div>
      </aside>

      <main className="flex min-w-0 flex-col px-6 py-10 sm:px-12 sm:py-12 lg:px-16 lg:py-14">
        <div className="flex items-center justify-between lg:hidden">
          <Image src="/nfcap-logo.png" alt="NFCAP" width={150} height={16} />
        </div>

        <div className="flex min-w-0 flex-1 items-center">
          <div className="mx-auto w-full min-w-0 max-w-sm">
            <div className="flex gap-6 border-b border-border-subtle">
              {TABS.map((tab) =>
                tab.key === active ? (
                  <span
                    key={tab.key}
                    aria-current="page"
                    className="border-b-2 border-brand-accent pb-3 text-sm font-semibold text-brand-heading"
                  >
                    {tab.label}
                  </span>
                ) : (
                  <Link
                    key={tab.key}
                    href={tab.href}
                    className="pb-3 text-sm font-medium text-text-secondary transition-colors hover:text-brand-primary"
                  >
                    {tab.label}
                  </Link>
                ),
              )}
            </div>

            <h2 className="mt-8 text-2xl font-bold text-brand-heading">{heading}</h2>
            <p className="mt-2 text-sm leading-relaxed text-text-secondary">{subheading}</p>

            {children}

            {footer && <div className="mt-8 text-center text-sm text-text-secondary">{footer}</div>}
          </div>
        </div>
      </main>
    </div>
  );
}
