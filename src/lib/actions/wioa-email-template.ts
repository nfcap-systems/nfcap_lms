'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from './guard';

export type WioaEmailTemplateFields = {
  subject: string;
  body: string;
};

/** Admin edit of the singleton WIOA outreach email template. Updates the existing row if one
 * exists (there should be exactly one, from the seed script), otherwise creates it — covers a
 * DB that was never seeded without needing a separate "create" action. */
export async function updateWioaEmailTemplate(fields: WioaEmailTemplateFields): Promise<void> {
  await requireAdmin();

  const existing = await prisma.wioaEmailTemplate.findFirst();
  if (existing) {
    await prisma.wioaEmailTemplate.update({ where: { id: existing.id }, data: fields });
  } else {
    await prisma.wioaEmailTemplate.create({ data: fields });
  }

  revalidatePath('/admin/wioa/email-template');
}
