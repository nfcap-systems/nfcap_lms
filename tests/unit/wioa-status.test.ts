import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/prisma';
import { advanceWioaEligibilityStatus, advanceWioaFundingStatus } from '@/lib/actions/wioa';
import { nextEligibilityStatusOptions } from '@/lib/wioa/status';
import { mockAuthUser } from '../setup/auth-mock';
import {
  createCourse,
  createDocumentRequirement,
  createWioaMasterCase,
  createWioaCourseCase,
  createWorkforceBoard,
  fakeUserId,
} from '../setup/fixtures';

describe('nextEligibilityStatusOptions (pure transition graph)', () => {
  it('offers exactly one step forward plus CLOSED_INELIGIBLE from an open status', () => {
    expect(nextEligibilityStatusOptions('REGISTERED')).toEqual([
      'WORKFORCE_BOARD_MATCHED',
      'CLOSED_INELIGIBLE',
    ]);
  });

  it('offers no options from a terminal status', () => {
    expect(nextEligibilityStatusOptions('CLOSED_INELIGIBLE')).toEqual([]);
    expect(nextEligibilityStatusOptions('WIOA_ELIGIBLE')).toEqual([]);
  });
});

describe('advanceWioaEligibilityStatus', () => {
  let coordinatorId: string;

  beforeEach(() => {
    coordinatorId = fakeUserId();
    mockAuthUser('WIOA_COORDINATOR', coordinatorId);
  });

  async function setupMasterCase(
    status: Parameters<typeof createWioaMasterCase>[0]['status'] = 'DOCUMENTS_SUBMITTED',
  ) {
    const board = await createWorkforceBoard();
    const learnerId = fakeUserId();
    const masterCase = await createWioaMasterCase({
      learnerId,
      workforceBoardId: board.id,
      status,
    });
    return { board, learnerId, masterCase };
  }

  it('refuses a transition that is not the next step in the order', async () => {
    const { masterCase } = await setupMasterCase('REGISTERED');

    const result = await advanceWioaEligibilityStatus(masterCase.id, 'WIOA_ELIGIBLE');

    expect(result).toEqual({ ok: false, error: expect.stringMatching(/cannot move/i) });
  });

  it('allows the linear next-step transition and records status history', async () => {
    const { masterCase } = await setupMasterCase('REGISTERED');

    await advanceWioaEligibilityStatus(masterCase.id, 'WORKFORCE_BOARD_MATCHED');

    const updated = await prisma.wioaCase.findUniqueOrThrow({
      where: { id: masterCase.id },
      include: { statusHistory: true },
    });
    expect(updated.status).toBe('WORKFORCE_BOARD_MATCHED');
    expect(updated.statusHistory).toHaveLength(1);
    expect(updated.statusHistory[0].changedBy).toBe(coordinatorId);
  });

  it('blocks WIOA_ELIGIBLE while a required document is unresolved', async () => {
    const { masterCase, board } = await setupMasterCase('ELIGIBILITY_UNDER_REVIEW');
    const requirement = await createDocumentRequirement(board.id, 'Proof of ID');
    await prisma.wioaDocument.create({
      data: { masterCaseId: masterCase.id, requirementId: requirement.id, status: 'MISSING' },
    });

    const result = await advanceWioaEligibilityStatus(masterCase.id, 'WIOA_ELIGIBLE');

    expect(result).toEqual({ ok: false, error: expect.stringMatching(/Proof of ID/) });

    const unchanged = await prisma.wioaCase.findUniqueOrThrow({ where: { id: masterCase.id } });
    expect(unchanged.status).toBe('ELIGIBILITY_UNDER_REVIEW');
  });

  it('allows WIOA_ELIGIBLE once every document is accepted or not applicable', async () => {
    const { masterCase, board } = await setupMasterCase('ELIGIBILITY_UNDER_REVIEW');
    const accepted = await createDocumentRequirement(board.id, 'Proof of ID');
    const notApplicable = await createDocumentRequirement(board.id, 'EDD Award Letter');
    await prisma.wioaDocument.create({
      data: { masterCaseId: masterCase.id, requirementId: accepted.id, status: 'ACCEPTED' },
    });
    await prisma.wioaDocument.create({
      data: {
        masterCaseId: masterCase.id,
        requirementId: notApplicable.id,
        status: 'NOT_APPLICABLE',
      },
    });

    await advanceWioaEligibilityStatus(masterCase.id, 'WIOA_ELIGIBLE');

    const updated = await prisma.wioaCase.findUniqueOrThrow({ where: { id: masterCase.id } });
    expect(updated.status).toBe('WIOA_ELIGIBLE');
  });

  it('a partner staff member not assigned to the case cannot advance it', async () => {
    const { masterCase } = await setupMasterCase('REGISTERED');
    mockAuthUser('PARTNER_STAFF', fakeUserId());

    await expect(
      advanceWioaEligibilityStatus(masterCase.id, 'WORKFORCE_BOARD_MATCHED'),
    ).rejects.toThrow(/not your assigned case/i);
  });

  it('the partner staff member assigned to the case can advance it', async () => {
    const partnerStaffId = fakeUserId();
    const board = await createWorkforceBoard();
    const learnerId = fakeUserId();
    const masterCase = await createWioaMasterCase({
      learnerId,
      workforceBoardId: board.id,
      status: 'REGISTERED',
      assignedPartnerStaffId: partnerStaffId,
    });
    mockAuthUser('PARTNER_STAFF', partnerStaffId);

    await advanceWioaEligibilityStatus(masterCase.id, 'WORKFORCE_BOARD_MATCHED');

    const updated = await prisma.wioaCase.findUniqueOrThrow({ where: { id: masterCase.id } });
    expect(updated.status).toBe('WORKFORCE_BOARD_MATCHED');
  });
});

describe('advanceWioaFundingStatus', () => {
  let coordinatorId: string;

  beforeEach(() => {
    coordinatorId = fakeUserId();
    mockAuthUser('WIOA_COORDINATOR', coordinatorId);
  });

  async function setupCourseCase() {
    const course = await createCourse({ access: 'RESTRICTED' });
    const board = await createWorkforceBoard();
    const learnerId = fakeUserId();
    const masterCase = await createWioaMasterCase({
      learnerId,
      workforceBoardId: board.id,
      status: 'WIOA_ELIGIBLE',
    });
    const courseCase = await createWioaCourseCase({
      learnerId,
      courseId: course.id,
      masterCaseId: masterCase.id,
      status: 'TRAINING_AUTHORIZATION_PENDING',
    });
    return { course, board, learnerId, masterCase, courseCase };
  }

  it('TUITION_APPROVED unlocks the restricted course with source WIOA_FUNDING', async () => {
    const { courseCase, learnerId, course } = await setupCourseCase();

    const result = await advanceWioaFundingStatus(courseCase.id, 'TUITION_APPROVED');

    expect(result).toEqual({ ok: true });
    const unlock = await prisma.courseUnlock.findUnique({
      where: { learnerId_courseId: { learnerId, courseId: course.id } },
    });
    expect(unlock).not.toBeNull();
    expect(unlock?.source).toBe('WIOA_FUNDING');
  });

  it('refuses a transition that is not the next step and returns a result instead of throwing', async () => {
    const { courseCase } = await setupCourseCase();

    const result = await advanceWioaFundingStatus(
      courseCase.id,
      'APPRENTICESHIP_ENROLLMENT_COMPLETE',
    );

    expect(result).toEqual({
      ok: false,
      error: expect.stringMatching(/cannot move this funding request/i),
    });

    const unchanged = await prisma.wioaCourseCase.findUniqueOrThrow({
      where: { id: courseCase.id },
    });
    expect(unchanged.status).toBe('TRAINING_AUTHORIZATION_PENDING');
  });

  it('preserves an existing ADMIN_ASSIGNMENT unlock instead of overwriting its source', async () => {
    const { courseCase, learnerId, course } = await setupCourseCase();
    await prisma.courseUnlock.create({
      data: { learnerId, courseId: course.id, source: 'ADMIN_ASSIGNMENT', grantedBy: fakeUserId() },
    });

    const result = await advanceWioaFundingStatus(courseCase.id, 'TUITION_APPROVED');
    expect(result).toEqual({ ok: true });

    const unlock = await prisma.courseUnlock.findUniqueOrThrow({
      where: { learnerId_courseId: { learnerId, courseId: course.id } },
    });
    expect(unlock.source).toBe('ADMIN_ASSIGNMENT');
  });
});
