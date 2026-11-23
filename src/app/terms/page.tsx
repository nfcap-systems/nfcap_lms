import Link from 'next/link';

export const metadata = { title: 'Terms of Service — NFCAP' };

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16" data-system="learner">
      <p className="mb-6 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        <strong>Draft — pending legal review.</strong> This page is a placeholder for Phase 1&apos;s
        Terms of Service requirement (docs/client/NFCAP_LMS_Feature_Detail_Client.md). The text
        below is a structural draft, not reviewed or approved legal language — it should not be
        treated as binding until NFCAP&apos;s counsel signs off on the final wording.
      </p>
      <h1 className="text-2xl font-semibold text-[var(--ink)]">Terms of Service</h1>
      <div className="mt-6 space-y-4 text-sm leading-relaxed text-[var(--ink-muted)]">
        <p>
          These Terms of Service (&quot;Terms&quot;) govern your use of the NFCAP Learning
          Management System (the &quot;Platform&quot;), operated by the National Flooring Covering
          Apprenticeship Program (&quot;NFCAP,&quot; &quot;we,&quot; &quot;us&quot;). By creating an
          account, you agree to these Terms.
        </p>
        <h2 className="text-base font-semibold text-[var(--ink)]">1. Who can use the Platform</h2>
        <p>
          The Platform is for apprentices, administrative staff, WIOA coordinators, and partner
          organization staff participating in or supporting NFCAP&apos;s training and certification
          programs.
        </p>
        <h2 className="text-base font-semibold text-[var(--ink)]">2. Your account</h2>
        <p>
          You are responsible for the accuracy of information you provide and for keeping your login
          credentials confidential. Notify us promptly if you suspect unauthorized access to your
          account.
        </p>
        <h2 className="text-base font-semibold text-[var(--ink)]">3. Program and funding data</h2>
        <p>
          If you pursue WIOA funding through the Platform, information you submit is shared with the
          workforce board, AJCC center, and partner staff involved in processing your application,
          as described in our{' '}
          <Link
            href="/privacy"
            className="font-medium text-[var(--nfcap-accent)] hover:text-[var(--nfcap-accent-hover)]"
          >
            Privacy Policy
          </Link>
          .
        </p>
        <h2 className="text-base font-semibold text-[var(--ink)]">4. Acceptable use</h2>
        <p>
          You agree not to misrepresent your identity, upload content you don&apos;t have the right
          to share, or attempt to access data belonging to another learner or case.
        </p>
        <h2 className="text-base font-semibold text-[var(--ink)]">5. Changes</h2>
        <p>
          We may update these Terms as the Platform evolves. Material changes will be announced on
          the Platform before they take effect.
        </p>
        <p className="pt-4 text-xs text-[var(--ink-muted)]">
          Draft version — not yet dated or finalized.
        </p>
      </div>
    </div>
  );
}
