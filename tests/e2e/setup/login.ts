import type { Page } from '@playwright/test';
import type { E2eTestUser } from './supabase-test-user';

export async function loginAs(page: Page, user: E2eTestUser): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email address').fill(user.email);
  await page.getByLabel('Password').fill(user.password);
  await page.getByRole('button', { name: /sign in/i }).click();
}
