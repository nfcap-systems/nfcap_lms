import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/prisma';
import { advanceWioaCaseStatus } from '@/lib/actions/wioa';
import { nextStatusOptions } from '@/lib/wioa/status';
import { mockAuthUser } from '../setup/auth-mock';
import {
  createCourse,
  createDocumentRequirement,
  createWioaCase,
  createWorkforceBoard,
  fakeUserId,
} from '../setup/fixtures';

describe('nextStatusOptions (pure transition graph)', () => {
  it('offers exactly one step forward plus CLOSED_INELIGIBLE from an open status', () => {
    expect(nextStatusOptions('REGISTERED')).toEqual([
      'WORKFORCE_BOARD_MATCHED',
      'CLOSED_INELIGIBLE',
    ]);
  });

  it('offers no options from a terminal status', () => {
    expect(nextStatusOptions('CLOSED_INELIGIBLE')).toEqual([]);
    expect(nextStatusOptions('APPRENTICESHIP_ENROLLMENT_COMPLETE')).toEqual([]);
  });

  it('does not duplicate CLOSED_INELIGIBLE when it is already the forward step', () => {
    expect(nextStatusOptions('APPRENTICESHIP_ENROLLMENT_COMPLETE')).not.toContain(
      'CLOSED_INELIGIBLE',
    );
  });
});

describe('advanceWioaCaseStatus', () => {
  let coordinatorId: string;

  beforeEach(() => {
    coordinatorId = fakeUserId();
    mockAuthUser('WIOA_COORDINATOR', coordinatorId);
  });

  async function setupCase(
    status: Parameters<typeof createWioaCase>[0]['status'] = 'DOCUMENTS_SUBMITTED',
  ) {
    const course = await createCourse({ access: 'RESTRICTED' });
    const board = await createWorkforceBoard();
    const learnerId = fakeUserId();
    const wioaCase = await createWioaCase({
      learnerId,
      courseId: course.id,
      workforceBoardId: board.id,
      status,
    });
    return { course, board, learnerId, wioaCase };
  }

  it('rejects a transition that is not the next step in the order', async () => {
    const { wioaCase } = await setupCase('REGISTERED');

    await expect(advanceWioaCaseStatus(wioaCase.id, 'WIOA_ELIGIBLE')).rejects.toThrow(
      /cannot move/i,
    );
  });

  it('allows the linear next-step transition and records status history', async () => {
    const { wioaCase } = await setupCase('REGISTERED');

    await advanceWioaCaseStatus(wioaCase.id, 'WORKFORCE_BOARD_MATCHED');

    const updated = await prisma.wioaCase.findUniqueOrThrow({
      where: { id: wioaCase.id },
      include: { statusHistory: true },
    });
    expect(updated.status).toBe('WORKFORCE_BOARD_MATCHED');
    expect(updated.statusHistory).toHaveLength(1);
    expect(updated.statusHistory[0].changedBy).toBe(coordinatorId);
  });

  it('blocks WIOA_ELIGIBLE while a required document is unresolved', async () => {
    const { wioaCase, board } = await setupCase('ELIGIBILITY_UNDER_REVIEW');
    const requirement = await createDocumentRequirement(board.id, 'Proof of ID');
    await prisma.wioaDocument.create({
      data: { wioaCaseId: wioaCase.id, requirementId: requirement.id, status: 'MISSING' },
    });

    await expect(advanceWioaCaseStatus(wioaCase.id, 'WIOA_ELIGIBLE')).rejects.toThrow(
      /Proof of ID/,
    );

    const unchanged = await prisma.wioaCase.findUniqueOrThrow({ where: { id: wioaCase.id } });
    expect(unchanged.status).toBe('ELIGIBILITY_UNDER_REVIEW');
  });

  it('allows WIOA_ELIGIBLE once every document is accepted or not applicable', async () => {
    const { wioaCase, board } = await setupCase('ELIGIBILITY_UNDER_REVIEW');
    const accepted = await createDocumentRequirement(board.id, 'Proof of ID');
    const notApplicable = await createDocumentRequirement(board.id, 'EDD Award Letter');
    await prisma.wioaDocument.create({
      data: { wioaCaseId: wioaCase.id, requirementId: accepted.id, status: 'ACCEPTED' },
    });
    await prisma.wioaDocument.create({
      data: { wioaCaseId: wioaCase.id, requirementId: notApplicable.id, status: 'NOT_APPLICABLE' },
    });

    await advanceWioaCaseStatus(wioaCase.id, 'WIOA_ELIGIBLE');

    const updated = await prisma.wioaCase.findUniqueOrThrow({ where: { id: wioaCase.id } });
    expect(updated.status).toBe('WIOA_ELIGIBLE');
  });

  it('TUITION_APPROVED unlocks the restricted course with source WIOA_FUNDING', async () => {
    const { wioaCase, learnerId, course } = await setupCase('TRAINING_AUTHORIZATION_PENDING');

    await advanceWioaCaseStatus(wioaCase.id, 'TUITION_APPROVED');

    const unlock = await prisma.courseUnlock.findUnique({
      where: { learnerId_courseId: { learnerId, courseId: course.id } },
    });
    expect(unlock).not.toBeNull();
    expect(unlock?.source).toBe('WIOA_FUNDING');
  });

  it('preserves an existing ADMIN_ASSIGNMENT unlock instead of overwriting its source', async () => {
    const { wioaCase, learnerId, course } = await setupCase('TRAINING_AUTHORIZATION_PENDING');
    await prisma.courseUnlock.create({
      data: { learnerId, courseId: course.id, source: 'ADMIN_ASSIGNMENT', grantedBy: fakeUserId() },
    });

    await advanceWioaCaseStatus(wioaCase.id, 'TUITION_APPROVED');

    const unlock = await prisma.courseUnlock.findUniqueOrThrow({
      where: { learnerId_courseId: { learnerId, courseId: course.id } },
    });
    expect(unlock.source).toBe('ADMIN_ASSIGNMENT');
  });

  it('a partner staff member not assigned to the case cannot advance it', async () => {
    const { wioaCase } = await setupCase('REGISTERED');
    mockAuthUser('PARTNER_STAFF', fakeUserId());

    await expect(advanceWioaCaseStatus(wioaCase.id, 'WORKFORCE_BOARD_MATCHED')).rejects.toThrow(
      /not your assigned case/i,
    );
  });

  it('the partner staff member assigned to the case can advance it', async () => {
    const partnerStaffId = fakeUserId();
    const course = await createCourse({ access: 'RESTRICTED' });
    const board = await createWorkforceBoard();
    const learnerId = fakeUserId();
    const wioaCase = await createWioaCase({
      learnerId,
      courseId: course.id,
      workforceBoardId: board.id,
      status: 'REGISTERED',
      assignedPartnerStaffId: partnerStaffId,
    });
    mockAuthUser('PARTNER_STAFF', partnerStaffId);

    await advanceWioaCaseStatus(wioaCase.id, 'WORKFORCE_BOARD_MATCHED');

    const updated = await prisma.wioaCase.findUniqueOrThrow({ where: { id: wioaCase.id } });
    expect(updated.status).toBe('WORKFORCE_BOARD_MATCHED');
  });
});
