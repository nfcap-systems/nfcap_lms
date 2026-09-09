import { prisma } from '@/lib/prisma';
import type { ContactType } from '@/generated/prisma/enums';

export type WorkforceBoardSummary = {
  id: string;
  name: string;
  county: string;
  serviceArea: string;
  active: boolean;
  ajccCount: number;
  jurisdictionCount: number;
  contactCount: number;
};

/** Admin board roster (docs/build/WIOA_BUILD_WORKFLOW.md Phase 3 — replaces the hardcoded seed with a
 * no-code-change CRUD UI, per the spec's "no-code-change routing" requirement). */
export async function getWorkforceBoards(): Promise<WorkforceBoardSummary[]> {
  const boards = await prisma.workforceBoard.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { ajccCenters: true, jurisdictions: true, contacts: true } },
    },
  });

  return boards.map((b) => ({
    id: b.id,
    name: b.name,
    county: b.county,
    serviceArea: b.serviceArea,
    active: b.active,
    ajccCount: b._count.ajccCenters,
    jurisdictionCount: b._count.jurisdictions,
    contactCount: b._count.contacts,
  }));
}

export type WorkforceBoardFields = {
  name: string;
  county: string;
  serviceArea: string;
  phone: string;
  email: string;
  website: string | null;
  address: string;
  orientationUrl: string | null;
  applicationUrl: string | null;
};

export type AjccCenterRecord = {
  id: string;
  name: string;
  address: string;
  phone: string;
  website: string | null;
  intakeInstructions: string | null;
  active: boolean;
};

export type AjccCenterFields = {
  name: string;
  address: string;
  phone: string;
  website: string | null;
  intakeInstructions: string | null;
};

export type WorkforceJurisdictionRecord = {
  id: string;
  zip: string;
  city: string;
  county: string;
  ajccCenterId: string | null;
  active: boolean;
};

export type WorkforceJurisdictionFields = {
  zip: string;
  city: string;
  county: string;
  ajccCenterId: string | null;
};

export type WorkforceContactRecord = {
  id: string;
  name: string;
  title: string | null;
  email: string;
  phone: string;
  contactType: ContactType;
  priority: number;
  ajccCenterId: string | null;
  active: boolean;
};

export type WorkforceContactFields = {
  name: string;
  title: string | null;
  email: string;
  phone: string;
  contactType: ContactType;
  priority: number;
  ajccCenterId: string | null;
};

export type WorkforceBoardDetail = WorkforceBoardFields & {
  id: string;
  active: boolean;
  ajccCenters: AjccCenterRecord[];
  jurisdictions: WorkforceJurisdictionRecord[];
  contacts: WorkforceContactRecord[];
};

export async function getWorkforceBoardDetail(
  boardId: string,
): Promise<WorkforceBoardDetail | null> {
  const board = await prisma.workforceBoard.findUnique({
    where: { id: boardId },
    include: {
      ajccCenters: { orderBy: { name: 'asc' } },
      jurisdictions: { orderBy: { zip: 'asc' } },
      contacts: { orderBy: { priority: 'asc' } },
    },
  });
  if (!board) return null;

  return {
    id: board.id,
    name: board.name,
    county: board.county,
    serviceArea: board.serviceArea,
    phone: board.phone,
    email: board.email,
    website: board.website,
    address: board.address,
    orientationUrl: board.orientationUrl,
    applicationUrl: board.applicationUrl,
    active: board.active,
    ajccCenters: board.ajccCenters.map((a) => ({
      id: a.id,
      name: a.name,
      address: a.address,
      phone: a.phone,
      website: a.website,
      intakeInstructions: a.intakeInstructions,
      active: a.active,
    })),
    jurisdictions: board.jurisdictions.map((j) => ({
      id: j.id,
      zip: j.zip,
      city: j.city,
      county: j.county,
      ajccCenterId: j.ajccCenterId,
      active: j.active,
    })),
    contacts: board.contacts.map((c) => ({
      id: c.id,
      name: c.name,
      title: c.title,
      email: c.email,
      phone: c.phone,
      contactType: c.contactType,
      priority: c.priority,
      ajccCenterId: c.ajccCenterId,
      active: c.active,
    })),
  };
}
