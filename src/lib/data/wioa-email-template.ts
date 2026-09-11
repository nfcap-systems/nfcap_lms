import { prisma } from '@/lib/prisma';
import { DEFAULT_WIOA_EMAIL_SUBJECT, DEFAULT_WIOA_EMAIL_BODY } from '@/lib/wioa/email-template';

export type WioaEmailTemplateRecord = {
  id: string;
  subject: string;
  body: string;
};

/** Singleton template (docs/build/WIOA_BUILD_WORKFLOW.md follow-on — admin-editable outreach
 * email, replacing src/lib/wioa/email-template.ts's hardcoded constants). Falls back to the
 * hardcoded defaults if the seed row is somehow missing, so the funding page never breaks. */
export async function getWioaEmailTemplate(): Promise<WioaEmailTemplateRecord> {
  const row = await prisma.wioaEmailTemplate.findFirst({ orderBy: { updatedAt: 'asc' } });
  if (row) return { id: row.id, subject: row.subject, body: row.body };
  return { id: '', subject: DEFAULT_WIOA_EMAIL_SUBJECT, body: DEFAULT_WIOA_EMAIL_BODY };
}
