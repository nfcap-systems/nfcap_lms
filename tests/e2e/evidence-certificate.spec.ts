import { test, expect } from './setup/base';
import { prisma } from '@/lib/prisma';
import { createCourseWithOneLesson, enrollAndCompleteLesson } from '../setup/fixtures';
import { E2eTestUser } from './setup/supabase-test-user';
import { loginAs } from './setup/login';

test.describe('evidence → certificate', () => {
  test('submitting and approving evidence issues a certificate', async (
    { page, browser },
    testInfo,
  ) => {
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
      // The admin-ui-parity-dashboard-learners-audit redesign split the old single Overview tab
      // into a slimmer Overview (Program details/Record status/Upcoming/Last activity only) and
      // a separate Enrollment tab (EnrollmentTab, LearnerProfileView.tsx) that now owns the
      // per-course cards, including the inline Approve/Reject controls for a course with zero
      // criteria — the "Evidence" tab is still the separate per-criterion review flow.
      await adminPage.getByRole('tab', { name: 'Enrollment' }).click();
      try {
        // A short explicit timeout here, well under the 45s test timeout, so a failure leaves
        // enough budget for the diagnostics below to actually run before the whole test is torn
        // down — the previous attempt's catch never fired because the test's own timeout pre-empted
        // it mid-click, with no trace captured (adminPage isn't the traced `page` fixture).
        await adminPage.getByRole('button', { name: 'Approve' }).click({ timeout: 15_000 });
        await expect(
          adminPage.getByRole('button', { name: /Change to Rejected/i }),
        ).toBeVisible({ timeout: 10_000 });
      } catch (err) {
        // adminPage comes from browser.newContext(), not the project's traced `page` fixture, so
        // it leaves no error-context/trace on failure by default — attach the DOM directly instead
        // of guessing blind again at what's actually rendered here.
        await testInfo.attach('admin-page-html', {
          body: await adminPage.content(),
          contentType: 'text/html',
        });
        await testInfo.attach('admin-page-screenshot', {
          body: await adminPage.screenshot(),
          contentType: 'image/png',
        });
        throw err;
      }
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
