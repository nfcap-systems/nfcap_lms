import { getWioaEmailTemplate } from '@/lib/data/wioa-email-template';
import { WioaEmailTemplateAdminView } from './WioaEmailTemplateAdminView';

export default async function AdminWioaEmailTemplatePage() {
  const template = await getWioaEmailTemplate();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-brand-heading">WIOA Email Template</h1>
        <p className="mt-1 text-sm text-text-secondary">
          The outreach email a learner reviews before sending to their matched workforce board.
          Editing here replaces prisma/seed-wioa-email-template.ts&apos;s seeded row as the source
          of truth.
        </p>
      </div>

      <WioaEmailTemplateAdminView template={template} />
    </div>
  );
}
