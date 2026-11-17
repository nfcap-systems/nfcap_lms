import Link from 'next/link';

export const metadata = { title: 'Privacy Policy — NFCAP' };

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <p className="mb-6 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        <strong>Draft — pending legal review.</strong> Placeholder for Phase 1&apos;s Privacy
        Policy requirement. Reflects what the Platform actually collects today
        (docs/build/PHASE_1_PII_BOUNDARY.md) but has not been reviewed or approved by counsel —
        treat as a working draft, not binding language.
      </p>
      <h1 className="text-2xl font-semibold text-brand-heading">Privacy Policy</h1>
      <div className="mt-6 space-y-4 text-sm leading-relaxed text-text-secondary">
        <h2 className="text-base font-semibold text-brand-heading">1. What we collect</h2>
        <p>
          Account information (name, email), profile details you provide (address, employment
          status, training interest), course progress and evidence you submit, and — if you
          pursue WIOA funding — case status, appointment, and document-upload records tied to
          your funding application. See <Link href="/terms" className="font-medium text-brand-accent hover:text-brand-accent-hover">Terms of Service</Link> for how funding data is shared with
          workforce boards and partner staff.
        </p>
        <h2 className="text-base font-semibold text-brand-heading">
          2. What we do not collect
        </h2>
        <p>
          The Platform is built not to store your Social Security Number, structurally — there is
          no field for it anywhere in the system, and free-text fields reject text shaped like an
          SSN. See docs/build/PHASE_1_PII_BOUNDARY.md for the open decision on how Social
          Security proof (required by some workforce boards) is instead handled.
        </p>
        <h2 className="text-base font-semibold text-brand-heading">3. Who can see your data</h2>
        <p>
          Your own learner record is visible to you, to NFCAP Admin staff, and — if you have an
          open WIOA case — to the WIOA Coordinator and the Partner Staff account assigned to your
          case. Role-based and database-level access rules both enforce this
          (docs/build/PHASE_1_DB_ACCESS_DECISION.md).
        </p>
        <h2 className="text-base font-semibold text-brand-heading">4. How long we keep it</h2>
        <p>
          Funding records and credentials are retained for a defined period and then destroyed
          automatically; see docs/build/PHASE_1_DATA_RETENTION.md for the current (placeholder,
          pending sign-off) retention window.
        </p>
        <h2 className="text-base font-semibold text-brand-heading">5. Contact</h2>
        <p>Questions about this policy can be directed to NFCAP program staff.</p>
        <p className="pt-4 text-xs text-text-secondary">Draft version — not yet dated or finalized.</p>
      </div>
    </div>
  );
}
