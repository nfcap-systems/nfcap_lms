import { prisma } from '@/lib/prisma';

export type MatchedOffice = {
  board: {
    id: string;
    name: string;
    county: string;
    phone: string;
    email: string;
    website: string | null;
    address: string;
  };
  ajcc: {
    id: string;
    name: string;
    address: string;
    phone: string;
    website: string | null;
    intakeInstructions: string | null;
  } | null;
  contact: {
    id: string;
    name: string;
    title: string | null;
    email: string;
    phone: string;
    contactType: 'PRIMARY' | 'SECONDARY' | 'GENERAL';
  } | null;
};

/** ZIP-only lookup (docs/build/WIOA_BUILD_WORKFLOW.md "Open decisions" — no city/county fallback in
 * the prototype). Contact precedence: PRIMARY, falling back to SECONDARY, falling back to
 * GENERAL, matching WIOA_INTEGRATION_PLAN.md Section 5's escalation. Returns null when no
 * seeded jurisdiction covers the ZIP — the caller shows the no-match recovery screen. */
export async function matchWorkforceOffice(zip: string): Promise<MatchedOffice | null> {
  const jurisdiction = await prisma.workforceJurisdiction.findFirst({
    where: { zip, active: true },
    include: {
      workforceBoard: true,
      ajccCenter: true,
    },
  });
  if (!jurisdiction) return null;

  const contact = await prisma.workforceContact.findFirst({
    where: { workforceBoardId: jurisdiction.workforceBoardId, active: true },
    orderBy: { priority: 'asc' },
  });

  return {
    board: {
      id: jurisdiction.workforceBoard.id,
      name: jurisdiction.workforceBoard.name,
      county: jurisdiction.workforceBoard.county,
      phone: jurisdiction.workforceBoard.phone,
      email: jurisdiction.workforceBoard.email,
      website: jurisdiction.workforceBoard.website,
      address: jurisdiction.workforceBoard.address,
    },
    ajcc: jurisdiction.ajccCenter
      ? {
          id: jurisdiction.ajccCenter.id,
          name: jurisdiction.ajccCenter.name,
          address: jurisdiction.ajccCenter.address,
          phone: jurisdiction.ajccCenter.phone,
          website: jurisdiction.ajccCenter.website,
          intakeInstructions: jurisdiction.ajccCenter.intakeInstructions,
        }
      : null,
    contact: contact
      ? {
          id: contact.id,
          name: contact.name,
          title: contact.title,
          email: contact.email,
          phone: contact.phone,
          contactType: contact.contactType,
        }
      : null,
  };
}
