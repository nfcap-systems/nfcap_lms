import { test, expect } from './setup/base';
import { prisma } from '@/lib/prisma';
import { createCourse } from '../setup/fixtures';
import { E2eTestUser } from './setup/supabase-test-user';
import { loginAs } from './setup/login';

test.describe('enrollment gating', () => {
  test('a learner can enroll in an OPEN course', async ({ page }) => {
    const course = await createCourse({ access: 'OPEN' });
    const learner = await E2eTestUser.create('LEARNER');

    try {
      await loginAs(page, learner);
      await page.goto(`/learner/courses/${course.slug}`);
      await page.getByRole('button', { name: 'Enroll in Course' }).click();

      await expect
        .poll(() =>
          prisma.enrollment.findUnique({
            where: { learnerId_courseId: { learnerId: learner.id, courseId: course.id } },
          }),
        )
        .not.toBeNull();
    } finally {
      await learner.delete();
    }
  });

  test('a RESTRICTED course has no enroll control until an admin grants access', async ({
    page,
    browser,
  }) => {
    const course = await createCourse({ access: 'RESTRICTED' });
    const learner = await E2eTestUser.create('LEARNER');
    const admin = await E2eTestUser.create('ADMIN');

    try {
      await loginAs(page, learner);
      await page.goto(`/learner/courses/${course.slug}`);
      await expect(page.getByRole('button', { name: 'Enroll in Course' })).not.toBeVisible();
      await expect(page.getByText(/restricted/i)).toBeVisible();

      const adminContext = await browser.newContext();
      const adminPage = await adminContext.newPage();
      await loginAs(adminPage, admin);
      await adminPage.goto(`/admin/learners/${learner.id}`);
      await adminPage.getByRole('button', { name: 'Grant access' }).click();
      // exact: true — otherwise this also matches the "Unlocked via Admin assignment" caption.
      await expect(adminPage.getByText('Unlocked', { exact: true })).toBeVisible();
      await adminContext.close();

      await page.reload();
      await page.getByRole('button', { name: 'Enroll in Course' }).click();

      await expect
        .poll(() =>
          prisma.enrollment.findUnique({
            where: { learnerId_courseId: { learnerId: learner.id, courseId: course.id } },
          }),
        )
        .not.toBeNull();
    } finally {
      await learner.delete();
      await admin.delete();
    }
  });
});
