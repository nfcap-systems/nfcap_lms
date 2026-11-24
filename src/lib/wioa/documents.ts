/** Standard CA document requirement set (spec Section 8, WIOA_INTEGRATION_PLAN.md Section 6 —
 * California-only scope for the prototype). Seeded per board in prisma/seed-wioa.ts. The EDD
 * Award Letter is the one conditional requirement — see EDD_REQUIREMENT_NAME and
 * shouldRequireEdd() below, referenced by name rather than id since seeding creates a fresh row
 * per board. */
export const EDD_REQUIREMENT_NAME = 'EDD Award Letter';

export const WIOA_DOCUMENT_REQUIREMENT_TEMPLATES: {
  name: string;
  description: string;
  conditional: boolean;
  applicableRule: string | null;
}[] = [
  {
    name: 'Identity Document',
    description:
      'At least one of: California Driver License, California State ID, U.S. Passport, or U.S. Birth Certificate.',
    conditional: false,
    applicableRule: null,
  },
  {
    name: 'Social Security Card',
    description: 'A copy of your Social Security card.',
    conditional: false,
    applicableRule: null,
  },
  /** Split out from Identity Document (docs/client/NFCAP_LMS_Production_Scope_Summary_Client.md
   * journey step 3 names "right to work" as its own checklist item, distinct from "ID") — matches
   * the real Tri-Valley Career Center packet's own separate "Proof of Right-to-Work" section. */
  {
    name: 'Proof of Right-to-Work',
    description:
      'At least one of: California Driver License AND Social Security Card, unexpired U.S. Passport, U.S. Birth Certificate, or Permanent Resident Card.',
    conditional: false,
    applicableRule: null,
  },
  /** Scope-committed (NFCAP_LMS_Production_Scope_Summary_Client.md journey step 3: "proof of
   * residency") — was entirely missing from this template set. No profile field encodes "lived in
   * this county N months," so this follows the same conditional:false precedent as Selective
   * Service below: always created, staff/learner mark Not Applicable when it doesn't apply. */
  {
    name: 'Proof of Residency',
    description:
      'Proof of residency or employment in the service area within the last 6 months — a valid CA driver license/ID with your current address, a recent (within 30 days) utility, financial, health, or W-2 form with your current address, or a layoff letter/paystub showing your name and employer address.',
    conditional: false,
    applicableRule: null,
  },
  {
    name: 'Selective Service Verification',
    description: 'Proof of Selective Service registration, where applicable under WIOA rules.',
    conditional: false,
    applicableRule: null,
  },
  {
    name: EDD_REQUIREMENT_NAME,
    description:
      'Required if you filed for, are receiving, or exhausted Unemployment Insurance within the last 6 months.',
    conditional: true,
    applicableRule: "unemploymentInsuranceStatus is not 'Not applicable'",
  },
  /** Scope-committed (same journey-step-3 list: "resume"). No learnerProfile field to condition
   * on, so non-conditional like Identity/Right-to-Work/Residency above. */
  {
    name: 'Resume',
    description: 'A copy of your current resume.',
    conditional: false,
    applicableRule: null,
  },
  /** Scope-committed (same journey-step-3 list: "veteran status"). No veteran-status field exists
   * on LearnerProfile (unlike unemploymentInsuranceStatus for the EDD letter above), so this can't
   * be conditioned automatically the way EDD is — follows the same conditional:false precedent as
   * Selective Service: always created, marked Not Applicable by staff/learner when it doesn't apply. */
  {
    name: 'Proof of Veteran Status',
    description: 'DD-214, if you have been discharged from active military duty.',
    conditional: false,
    applicableRule: null,
  },
  {
    name: 'CalJOBS Account',
    description: 'Confirmation that you have created a CalJOBS account.',
    conditional: false,
    applicableRule: null,
  },
];

/** Evaluates the one conditional requirement rule this prototype needs (see
 * WioaDocumentRequirement.applicableRule doc comment in schema.prisma — no general rule engine,
 * just this hardcoded check against the learner's profile). */
export function shouldRequireEdd(unemploymentInsuranceStatus: string | null): boolean {
  return !!unemploymentInsuranceStatus && unemploymentInsuranceStatus !== 'Not applicable';
}
