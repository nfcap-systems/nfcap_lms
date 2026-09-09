import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { WIOA_DOCUMENT_REQUIREMENT_TEMPLATES } from '../src/lib/wioa/documents';

// Separate from seed-wioa.ts (which creates boards unconditionally and would duplicate them on
// a rerun) — this only adds the Phase 2 document requirement set to boards that don't have one
// yet, so it's safe to run again after seed-wioa.ts has already seeded boards/ZIPs.
const pool = new Pool({ connectionString: process.env.DIRECT_URL! });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const boards = await prisma.workforceBoard.findMany({
    include: { _count: { select: { documentRequirements: true } } },
  });

  for (const board of boards) {
    if (board._count.documentRequirements > 0) {
      console.log(`Skipping ${board.name} — already has document requirements.`);
      continue;
    }
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
    console.log(`Seeded document requirements for: ${board.name}`);
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
