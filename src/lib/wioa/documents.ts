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
