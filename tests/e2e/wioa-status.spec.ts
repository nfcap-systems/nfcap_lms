import { test, expect } from './setup/base';
import { prisma } from '@/lib/prisma';
import {
  createCourse,
  createDocumentRequirement,
  createWioaMasterCase,
  createWorkforceBoard,
  fakeUserId,
} from '../setup/fixtures';
import { WIOA_ELIGIBILITY_STATUS_LABEL } from '@/lib/wioa/status';
import { E2eTestUser } from './setup/supabase-test-user';
import { loginAs } from './setup/login';

test.describe('WIOA eligibility status changes', () => {
  test('a coordinator can advance a case to the next status', async ({ page }) => {
    await createCourse({ access: 'RESTRICTED' });
    const coordinator = await E2eTestUser.create('WIOA_COORDINATOR');
    const masterCase = await createWioaMasterCase({
      learnerId: fakeUserId(),
      status: 'REGISTERED',
    });

    try {
      await loginAs(page, coordinator);
      await page.goto(`/coordinator/${masterCase.id}`);
      // The status-change control (StatusCard, WioaCaseDetailView.tsx) lives under the "Status
      // history" tab, not the default "Overview" tab.
      await page.getByRole('tab', { name: 'Status history' }).click();

      await page
        .getByLabel('New status')
        .selectOption({ label: WIOA_ELIGIBILITY_STATUS_LABEL.WORKFORCE_BOARD_MATCHED });
      await page.getByRole('button', { name: 'Save status' }).click();

      await expect
        .poll(
          async () => (await prisma.wioaCase.findUniqueOrThrow({ where: { id: masterCase.id } })).status,
        )
        .toBe('WORKFORCE_BOARD_MATCHED');

      const history = await prisma.wioaStatusHistory.findMany({
        where: { masterCaseId: masterCase.id },
      });
      expect(history).toHaveLength(1);
      expect(history[0].changedBy).toBe(coordinator.id);
    } finally {
      await coordinator.delete();
    }
  });

  test('a case with unresolved documents cannot be moved to WIOA Eligible', async ({ page }) => {
    const board = await createWorkforceBoard();
    const coordinator = await E2eTestUser.create('WIOA_COORDINATOR');
    const masterCase = await createWioaMasterCase({
      learnerId: fakeUserId(),
      workforceBoardId: board.id,
      status: 'ELIGIBILITY_UNDER_REVIEW',
    });
    const requirement = await createDocumentRequirement(board.id, 'Proof of ID');
    await prisma.wioaDocument.create({
      data: { masterCaseId: masterCase.id, requirementId: requirement.id, status: 'MISSING' },
    });

    try {
      await loginAs(page, coordinator);
      await page.goto(`/coordinator/${masterCase.id}`);
      await page.getByRole('tab', { name: 'Status history' }).click();

      await expect(
        page
          .getByLabel('New status')
          .locator('option', { hasText: WIOA_ELIGIBILITY_STATUS_LABEL.WIOA_ELIGIBLE }),
      ).toHaveCount(1);
      await page
        .getByLabel('New status')
        .selectOption({ label: WIOA_ELIGIBILITY_STATUS_LABEL.WIOA_ELIGIBLE });
      await page.getByRole('button', { name: 'Save status' }).click();

      // Don't assert the exact server error text — Next.js may redact a thrown Server Action
      // error's message in a production build, so the UI text isn't a reliable signal here. The
      // invariant that actually matters is the DB write being blocked.
      await expect(page.locator('p.field-error')).toBeVisible();

      await expect
        .poll(
          async () => (await prisma.wioaCase.findUniqueOrThrow({ where: { id: masterCase.id } })).status,
        )
        .toBe('ELIGIBILITY_UNDER_REVIEW');
    } finally {
      await coordinator.delete();
    }
  });
});
