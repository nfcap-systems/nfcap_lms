import type { Page } from '@playwright/test';
import type { E2eTestUser } from './supabase-test-user';

export async function loginAs(page: Page, user: E2eTestUser): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Work email').fill(user.email);
  // isRequired appends a " ∙ Required" marker into the label's accessible name (FieldLabel.tsx),
  // so an exact match no longer works — anchor to the start instead. A plain substring match
  // would also catch the "Show/Hide password" toggle button's aria-label, which contains
  // "password" case-insensitively but never starts with "Password".
  await page.getByLabel(/^Password/).fill(user.password);
  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15_000 }),
    page.getByRole('button', { name: /sign in/i }).click(),
  ]);
}
