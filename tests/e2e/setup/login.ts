import type { Page } from '@playwright/test';
import type { E2eTestUser } from './supabase-test-user';

export async function loginAs(page: Page, user: E2eTestUser): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email address').fill(user.email);
  // exact: true — otherwise this also matches the "Show password" toggle button's aria-label,
  // which contains "password" as a case-insensitive substring.
  await page.getByLabel('Password', { exact: true }).fill(user.password);
  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15_000 }),
    page.getByRole('button', { name: /sign in/i }).click(),
  ]);
}
