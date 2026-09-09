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

const boards: SeedBoard[] = [
  {
    name: 'Los Angeles County Workforce Development Board',
    county: 'Los Angeles',
    serviceArea: 'Los Angeles County (non-city-specific areas)',
    phone: '(213) 555-0110',
    email: 'intake@lacountywdb.example.gov',
    website: 'https://lacountywdb.example.gov',
    address: '3175 W. 6th St, Los Angeles, CA 90020',
    orientationUrl: 'https://lacountywdb.example.gov/orientation',
    applicationUrl: 'https://caljobs.ca.gov',
    ajcc: {
      name: 'Metro LA America’s Job Center of California',
      address: '2323 S. Union Ave, Los Angeles, CA 90007',
      phone: '(213) 555-0120',
      website: 'https://lacountywdb.example.gov/ajcc/metro',
      intakeInstructions: 'Walk-ins welcome Mon–Fri 8am–5pm, or schedule intake online.',
    },
    contacts: [
      {
        name: 'Dana Whitfield',
        title: 'WIOA Case Manager',
        email: 'dana.whitfield@lacountywdb.example.gov',
        phone: '(213) 555-0121',
        contactType: 'PRIMARY',
        priority: 0,
      },
      {
        name: 'Marcus Ibarra',
        title: 'Intake Coordinator',
        email: 'marcus.ibarra@lacountywdb.example.gov',
        phone: '(213) 555-0122',
        contactType: 'SECONDARY',
        priority: 1,
      },
      {
        name: 'AJCC General Intake',
        title: 'General Intake',
        email: 'intake@lacountywdb.example.gov',
        phone: '(213) 555-0110',
        contactType: 'GENERAL',
        priority: 2,
      },
    ],
    zips: [
      { zip: '90007', city: 'Los Angeles' },
      { zip: '90020', city: 'Los Angeles' },
      { zip: '90650', city: 'Norwalk' },
      { zip: '91331', city: 'Pacoima' },
    ],
  },
  {
    name: 'San Diego Workforce Partnership',
    county: 'San Diego',
    serviceArea: 'San Diego County',
    phone: '(619) 555-0210',
    email: 'intake@sdworkforce.example.org',
    website: 'https://sdworkforce.example.org',
    address: '3910 University Ave, San Diego, CA 92105',
    orientationUrl: 'https://sdworkforce.example.org/orientation',
    applicationUrl: 'https://caljobs.ca.gov',
    ajcc: {
      name: 'City Heights America’s Job Center of California',
      address: '4181 Home Ave, San Diego, CA 92105',
      phone: '(619) 555-0220',
      website: 'https://sdworkforce.example.org/ajcc/city-heights',
      intakeInstructions: 'Bring photo ID to your first appointment; walk-ins accepted Tue/Thu.',
    },
    contacts: [
      {
        name: 'Priya Chandrasekaran',
        title: 'WIOA Case Manager',
        email: 'priya.c@sdworkforce.example.org',
        phone: '(619) 555-0221',
        contactType: 'PRIMARY',
        priority: 0,
      },
      {
        name: 'Jorge Villalobos',
        title: 'Eligibility Specialist',
        email: 'jorge.v@sdworkforce.example.org',
        phone: '(619) 555-0222',
        contactType: 'SECONDARY',
        priority: 1,
      },
      {
        name: 'AJCC General Intake',
        title: 'General Intake',
        email: 'intake@sdworkforce.example.org',
        phone: '(619) 555-0210',
        contactType: 'GENERAL',
        priority: 2,
      },
    ],
    zips: [
      { zip: '92101', city: 'San Diego' },
      { zip: '92105', city: 'San Diego' },
      { zip: '91910', city: 'Chula Vista' },
      { zip: '92025', city: 'Escondido' },
    ],
  },
  {
    name: 'Sacramento Employment and Training Agency',
    county: 'Sacramento',
    serviceArea: 'Sacramento County',
    phone: '(916) 555-0310',
    email: 'intake@sacwdb.example.gov',
    website: 'https://sacwdb.example.gov',
    address: '925 Del Paso Blvd, Sacramento, CA 95815',
    orientationUrl: 'https://sacwdb.example.gov/orientation',
    applicationUrl: 'https://caljobs.ca.gov',
    ajcc: {
      name: 'North Sacramento America’s Job Center of California',
      address: '925 Del Paso Blvd, Sacramento, CA 95815',
      phone: '(916) 555-0320',
      website: 'https://sacwdb.example.gov/ajcc/north',
      intakeInstructions: 'Schedule your intake appointment online or call ahead.',
    },
    contacts: [
      {
        name: 'Renee Okafor',
        title: 'WIOA Case Manager',
        email: 'renee.okafor@sacwdb.example.gov',
        phone: '(916) 555-0321',
        contactType: 'PRIMARY',
        priority: 0,
      },
      {
        name: 'AJCC General Intake',
        title: 'General Intake',
        email: 'intake@sacwdb.example.gov',
        phone: '(916) 555-0310',
        contactType: 'GENERAL',
        priority: 1,
      },
    ],
    zips: [
      { zip: '95815', city: 'Sacramento' },
      { zip: '95823', city: 'Sacramento' },
      { zip: '95605', city: 'West Sacramento' },
    ],
  },
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
  {
    name: 'Fresno Regional Workforce Development Board',
    county: 'Fresno',
    serviceArea: 'Fresno County',
    phone: '(559) 555-0510',
    email: 'intake@fresnowdb.example.gov',
    website: 'https://fresnowdb.example.gov',
    address: '1900 Mariposa Mall, Fresno, CA 93721',
    orientationUrl: 'https://fresnowdb.example.gov/orientation',
    applicationUrl: 'https://caljobs.ca.gov',
    ajcc: {
      name: 'Downtown Fresno America’s Job Center of California',
      address: '1900 Mariposa Mall, Fresno, CA 93721',
      phone: '(559) 555-0520',
      website: 'https://fresnowdb.example.gov/ajcc/downtown',
      intakeInstructions: 'Call to schedule; same-week appointments usually available.',
    },
    contacts: [
      {
        name: 'Alicia Reyes',
        title: 'WIOA Case Manager',
        email: 'alicia.reyes@fresnowdb.example.gov',
        phone: '(559) 555-0521',
        contactType: 'PRIMARY',
        priority: 0,
      },
      {
        name: 'AJCC General Intake',
        title: 'General Intake',
        email: 'intake@fresnowdb.example.gov',
        phone: '(559) 555-0510',
        contactType: 'GENERAL',
        priority: 1,
      },
    ],
    zips: [
      { zip: '93721', city: 'Fresno' },
      { zip: '93706', city: 'Fresno' },
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
