import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { WIOA_FUNDING_STATUS_ORDER } from '../src/lib/wioa/status';
import type { WioaFundingStatus } from '../src/generated/prisma/enums';

// QC helper for Phase 4 verification (docs/build/WIOA_BUILD_WORKFLOW.md). Walks an open course-
// case's funding pipeline forward by direct DB writes (status + WioaFundingStatusHistory row per
// step), stopping at a target status — assumes the learner's master case is already
// WIOA_ELIGIBLE (docs/plans/wioa-spec-alignment-kickoff.md #1, full split; use
// advanceWioaEligibilityStatus / the coordinator UI to get there first). Default target is
// TRAINING_AUTHORIZATION_PENDING so the final TUITION_APPROVED transition — the one that fires
// the CourseUnlock — is still done through the real coordinator UI / advanceWioaFundingStatus
// action, not simulated here.
//
// Usage:
//   npm run wioa-fast-forward-case                         (-> TRAINING_AUTHORIZATION_PENDING)
//   npm run wioa-fast-forward-case -- <caseId> TUITION_APPROVED

const pool = new Pool({ connectionString: process.env.DIRECT_URL! });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const args = process.argv.slice(2);
  let caseId: string | undefined;
  let target: WioaFundingStatus = 'TRAINING_AUTHORIZATION_PENDING';

  for (const a of args) {
    if ((WIOA_FUNDING_STATUS_ORDER as string[]).includes(a)) target = a as WioaFundingStatus;
    else caseId = a;
  }

  const courseCase = caseId
    ? await prisma.wioaCourseCase.findUniqueOrThrow({ where: { id: caseId } })
    : await prisma.wioaCourseCase.findFirstOrThrow({
        where: { closedAt: null },
        orderBy: { createdAt: 'desc' },
      });

  const fromIdx = WIOA_FUNDING_STATUS_ORDER.indexOf(courseCase.status);
  const toIdx = WIOA_FUNDING_STATUS_ORDER.indexOf(target);
  if (toIdx <= fromIdx) {
    console.log(
      `Case ${courseCase.id} is already at ${courseCase.status} (>= ${target}). Nothing to do.`,
    );
    return;
  }

  const steps = WIOA_FUNDING_STATUS_ORDER.slice(fromIdx + 1, toIdx + 1).filter(
    (s) => s !== 'FUNDING_DECLINED',
  );

  for (const status of steps) {
    await prisma.wioaCourseCase.update({ where: { id: courseCase.id }, data: { status } });
    await prisma.wioaFundingStatusHistory.create({
      data: { courseCaseId: courseCase.id, status, changedBy: 'qc-fast-forward-script' },
    });
    console.log(`  -> ${status}`);
  }

  console.log(
    `\nCase ${courseCase.id} now at ${target}.` +
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
