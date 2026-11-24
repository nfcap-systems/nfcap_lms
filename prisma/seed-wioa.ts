import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { WIOA_DOCUMENT_REQUIREMENT_TEMPLATES } from '../src/lib/wioa/documents';

// Standalone client for the seed script (not src/lib/prisma.ts's app-runtime singleton) — this
// runs once via `npx tsx prisma/seed-wioa.ts`, outside the Next.js process.
const pool = new Pool({ connectionString: process.env.DIRECT_URL! });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

// California-only prototype scope (docs/wioa/WIOA_INTEGRATION_PLAN.md Section 6/9). A handful of
// counties/ZIPs — enough to prove the ZIP -> board -> AJCC -> contact matching engine genuinely
// works (docs/build/WIOA_BUILD_WORKFLOW.md Phase 1), not full statewide coverage.
type SeedContact = {
  name: string;
  title: string;
  email: string;
  phone: string;
  contactType: 'PRIMARY' | 'SECONDARY' | 'GENERAL';
  priority: number;
};

type SeedBoard = {
  name: string;
  county: string;
  serviceArea: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  orientationUrl: string;
  applicationUrl: string;
  ajcc: {
    name: string;
    address: string;
    phone: string;
    website: string;
    intakeInstructions: string;
  };
  contacts: SeedContact[];
  zips: { zip: string; city: string }[];
};

// Single-board prototype scope (user decision, 2026-11-24): only the one real board we have an
// actual packet for (Tri-Valley Career Center / Alameda County) stays seeded. The other 4 sample
// boards (LA, San Diego, Sacramento, Fresno) were removed from both this file and the live
// database — confirmed zero WioaCase rows referenced any of them before deletion.
const boards: SeedBoard[] = [
  {
    name: 'Alameda County Workforce Development Board',
    county: 'Alameda',
    serviceArea: 'Alameda County (non-city-specific areas)',
    phone: '(510) 555-0410',
    email: 'intake@alamedawdb.example.gov',
    website: 'https://alamedawdb.example.gov',
    address: '24100 Amador St, Hayward, CA 94544',
    orientationUrl: 'https://alamedawdb.example.gov/orientation',
    applicationUrl: 'https://caljobs.ca.gov',
    ajcc: {
      name: 'Eden Area America’s Job Center of California',
      address: '24100 Amador St, Hayward, CA 94544',
      phone: '(510) 555-0420',
      website: 'https://alamedawdb.example.gov/ajcc/eden',
      intakeInstructions: 'Walk-ins Mon–Fri 8:30am–4:30pm.',
    },
    contacts: [
      {
        name: 'Tyler Nakamura',
        title: 'WIOA Case Manager',
        email: 'tyler.nakamura@alamedawdb.example.gov',
        phone: '(510) 555-0421',
        contactType: 'PRIMARY',
        priority: 0,
      },
      {
        name: 'AJCC General Intake',
        title: 'General Intake',
        email: 'intake@alamedawdb.example.gov',
        phone: '(510) 555-0410',
        contactType: 'GENERAL',
        priority: 1,
      },
    ],
    zips: [
      { zip: '94544', city: 'Hayward' },
      { zip: '94601', city: 'Oakland' },
      { zip: '94566', city: 'Pleasanton' },
    ],
  },
];

async function main() {
  for (const b of boards) {
    const board = await prisma.workforceBoard.create({
      data: {
        name: b.name,
        county: b.county,
        serviceArea: b.serviceArea,
        phone: b.phone,
        email: b.email,
        website: b.website,
        address: b.address,
        orientationUrl: b.orientationUrl,
        applicationUrl: b.applicationUrl,
      },
    });

    const ajcc = await prisma.ajccCenter.create({
      data: {
        workforceBoardId: board.id,
        name: b.ajcc.name,
        address: b.ajcc.address,
        phone: b.ajcc.phone,
        website: b.ajcc.website,
        intakeInstructions: b.ajcc.intakeInstructions,
      },
    });

    for (const c of b.contacts) {
      await prisma.workforceContact.create({
        data: {
          workforceBoardId: board.id,
          ajccCenterId: ajcc.id,
          name: c.name,
          title: c.title,
          email: c.email,
          phone: c.phone,
          contactType: c.contactType,
          priority: c.priority,
          lastVerifiedDate: new Date(),
        },
      });
    }

    for (const z of b.zips) {
      await prisma.workforceJurisdiction.create({
        data: {
          zip: z.zip,
          city: z.city,
          county: b.county,
          workforceBoardId: board.id,
          ajccCenterId: ajcc.id,
        },
      });
    }

    // Phase 2 — the standard CA document requirement set (docs/build/WIOA_BUILD_WORKFLOW.md Phase 2),
    // scoped per board since WioaDocumentRequirement.workforceBoardId requires it. Same template
    // set for every seeded board — no board-specific documents in this prototype.
    for (const t of WIOA_DOCUMENT_REQUIREMENT_TEMPLATES) {
      await prisma.wioaDocumentRequirement.create({
        data: {
          workforceBoardId: board.id,
          name: t.name,
          description: t.description,
          conditional: t.conditional,
          applicableRule: t.applicableRule,
        },
      });
    }

    console.log(`Seeded board: ${b.name} (${b.zips.length} ZIPs)`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
