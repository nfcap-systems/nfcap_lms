import { test as base, expect } from '@playwright/test';
import { prisma } from '@/lib/prisma';
import { resetDatabase } from '../../setup/db-reset';

/** Truncates the test database before every test (including retries), so fixtures created by an
 * earlier test or a failed attempt never leak into the next one — e.g. two RESTRICTED courses
 * both showing a "Grant access" button on the admin learner page. */
export const test = base.extend<{ resetDb: void }>({
  resetDb: [
    async ({}, use) => {
      await resetDatabase(prisma);
      await use();
    },
    { auto: true },
  ],
});

export { expect };
