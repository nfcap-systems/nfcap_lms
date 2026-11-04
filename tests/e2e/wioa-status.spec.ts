import { test, expect } from './setup/base';
import { prisma } from '@/lib/prisma';
import {
  createCourse,
  createDocumentRequirement,
  createWioaCase,
  createWorkforceBoard,
  fakeUserId,
} from '../setup/fixtures';
import { WIOA_STATUS_LABEL } from '@/lib/wioa/status';
import { E2eTestUser } from './setup/supabase-test-user';
import { loginAs } from './setup/login';

test.describe('WIOA funding status changes', () => {
  test('a coordinator can advance a case to the next status', async ({ page }) => {
    const course = await createCourse({ access: 'RESTRICTED' });
    const coordinator = await E2eTestUser.create('WIOA_COORDINATOR');
    const wioaCase = await createWioaCase({
      learnerId: fakeUserId(),
      courseId: course.id,
      status: 'REGISTERED',
    });

    try {
      await loginAs(page, coordinator);
      await page.goto(`/coordinator/${wioaCase.id}`);

      await page
        .getByLabel('Advance to')
        .selectOption({ label: WIOA_STATUS_LABEL.WORKFORCE_BOARD_MATCHED });
      await page.getByRole('button', { name: 'Confirm status change' }).click();

      await expect
        .poll(
          async () =>
            (await prisma.wioaCase.findUniqueOrThrow({ where: { id: wioaCase.id } })).status,
        )
        .toBe('WORKFORCE_BOARD_MATCHED');

      const history = await prisma.wioaStatusHistory.findMany({
        where: { wioaCaseId: wioaCase.id },
      });
      expect(history).toHaveLength(1);
      expect(history[0].changedBy).toBe(coordinator.id);
    } finally {
      await coordinator.delete();
    }
  });

  test('a case with unresolved documents cannot be moved to WIOA Eligible', async ({ page }) => {
    const course = await createCourse({ access: 'RESTRICTED' });
    const board = await createWorkforceBoard();
    const coordinator = await E2eTestUser.create('WIOA_COORDINATOR');
    const wioaCase = await createWioaCase({
      learnerId: fakeUserId(),
      courseId: course.id,
      workforceBoardId: board.id,
      status: 'ELIGIBILITY_UNDER_REVIEW',
    });
    const requirement = await createDocumentRequirement(board.id, 'Proof of ID');
    await prisma.wioaDocument.create({
      data: { wioaCaseId: wioaCase.id, requirementId: requirement.id, status: 'MISSING' },
    });

    try {
      await loginAs(page, coordinator);
      await page.goto(`/coordinator/${wioaCase.id}`);

      await expect(
        page
          .getByLabel('Advance to')
          .locator('option', { hasText: WIOA_STATUS_LABEL.WIOA_ELIGIBLE }),
      ).toHaveCount(1);
      await page.getByLabel('Advance to').selectOption({ label: WIOA_STATUS_LABEL.WIOA_ELIGIBLE });
      await page.getByRole('button', { name: 'Confirm status change' }).click();

      // Don't assert the exact server error text — Next.js may redact a thrown Server Action
      // error's message in a production build, so the UI text isn't a reliable signal here. The
      // invariant that actually matters is the DB write being blocked.
      await expect(page.locator('p.text-status-danger-text')).toBeVisible();

      await expect
        .poll(
          async () =>
            (await prisma.wioaCase.findUniqueOrThrow({ where: { id: wioaCase.id } })).status,
        )
        .toBe('ELIGIBILITY_UNDER_REVIEW');
    } finally {
      await coordinator.delete();
    }
  });
});
