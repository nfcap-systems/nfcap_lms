import { test, expect } from './setup/base';
import { prisma } from '@/lib/prisma';
import { createCourseWithOneLesson, enrollAndCompleteLesson } from '../setup/fixtures';
import { E2eTestUser } from './setup/supabase-test-user';
import { loginAs } from './setup/login';

test.describe('evidence → certificate', () => {
  test('submitting and approving evidence issues a certificate', async ({ page, browser }) => {
    const { course, lesson } = await createCourseWithOneLesson({ access: 'OPEN' });
    const learner = await E2eTestUser.create('LEARNER');
    const admin = await E2eTestUser.create('ADMIN');

    try {
      await enrollAndCompleteLesson(learner.id, course.id, lesson.id);

      await loginAs(page, learner);
      await page.goto(`/learner/courses/${course.slug}`);
      // Evidence submission lives on its own route (EvidenceView.tsx), reached via the overview
      // page's "Continue" CTA — not inline on the overview itself.
      await page.getByRole('button', { name: 'Continue — Practical Evidence' }).click();
      await page.getByLabel('Description').fill('Finished the flooring section, photo attached.');
      await page.getByRole('button', { name: 'Submit Evidence' }).click();

      await expect
        .poll(async () => {
          const enrollment = await prisma.enrollment.findUniqueOrThrow({
            where: { learnerId_courseId: { learnerId: learner.id, courseId: course.id } },
            include: { evidenceSubmissions: true },
          });
          return enrollment.evidenceSubmissions[0]?.status;
        })
        .toBe('PENDING');

      const adminContext = await browser.newContext();
      const adminPage = await adminContext.newPage();
      await loginAs(adminPage, admin);
      await adminPage.goto(`/admin/learners/${learner.id}`);
      // The inline Approve/Reject controls render under the Evidence tab (LearnerProfileView.tsx),
      // not the default Overview tab.
      await adminPage.getByRole('tab', { name: 'Evidence' }).click();
      await adminPage.getByRole('button', { name: 'Approve' }).click();
      await expect(adminPage.getByRole('button', { name: /Change to Rejected/i })).toBeVisible();
      await adminContext.close();

      const enrollment = await prisma.enrollment.findUniqueOrThrow({
        where: { learnerId_courseId: { learnerId: learner.id, courseId: course.id } },
        include: { certificate: true, evidenceSubmissions: true },
      });
      expect(enrollment.evidenceSubmissions[0].status).toBe('APPROVED');
      expect(enrollment.certificate).not.toBeNull();
    } finally {
      await learner.delete();
      await admin.delete();
    }
  });
});
