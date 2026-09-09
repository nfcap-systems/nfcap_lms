import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { WIOA_STATUS_ORDER } from '../src/lib/wioa/status';
import type { WioaCaseStatus } from '../src/generated/prisma/enums';

// QC helper for Phase 4 verification (docs/build/WIOA_BUILD_WORKFLOW.md). Walks the open WIOA case
// forward through the linear 18-status pipeline by direct DB writes (status + WioaStatusHistory
// row per step), stopping at a target status. Default target is TRAINING_AUTHORIZATION_PENDING
// so the final TUITION_APPROVED transition — the one that fires the CourseUnlock — is still done
// through the real coordinator UI / advanceWioaCaseStatus action, not simulated here.
//
// Usage:
//   npm run wioa-fast-forward-case                         (-> TRAINING_AUTHORIZATION_PENDING)
//   npm run wioa-fast-forward-case -- WIOA_ELIGIBLE
//   npm run wioa-fast-forward-case -- <caseId> TUITION_APPROVED

const pool = new Pool({ connectionString: process.env.DIRECT_URL! });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const args = process.argv.slice(2);
  let caseId: string | undefined;
  let target: WioaCaseStatus = 'TRAINING_AUTHORIZATION_PENDING';

  for (const a of args) {
    if ((WIOA_STATUS_ORDER as string[]).includes(a)) target = a as WioaCaseStatus;
    else caseId = a;
  }

  const wioaCase = caseId
    ? await prisma.wioaCase.findUniqueOrThrow({ where: { id: caseId } })
    : await prisma.wioaCase.findFirstOrThrow({
        where: { closedAt: null },
        orderBy: { createdAt: 'desc' },
      });

  const fromIdx = WIOA_STATUS_ORDER.indexOf(wioaCase.status);
  const toIdx = WIOA_STATUS_ORDER.indexOf(target);
  if (toIdx <= fromIdx) {
    console.log(
      `Case ${wioaCase.id} is already at ${wioaCase.status} (>= ${target}). Nothing to do.`,
    );
    return;
  }

  const steps = WIOA_STATUS_ORDER.slice(fromIdx + 1, toIdx + 1).filter(
    (s) => s !== 'CLOSED_INELIGIBLE',
  );

  for (const status of steps) {
    await prisma.wioaCase.update({ where: { id: wioaCase.id }, data: { status } });
    await prisma.wioaStatusHistory.create({
      data: { wioaCaseId: wioaCase.id, status, changedBy: 'qc-fast-forward-script' },
    });
    console.log(`  -> ${status}`);
  }

  console.log(
    `\nCase ${wioaCase.id} now at ${target}.` +
      (target !== 'TUITION_APPROVED'
        ? `\nDo the final step (Advance to "Tuition Approved") in the coordinator UI to exercise the real CourseUnlock wiring.`
        : ''),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
