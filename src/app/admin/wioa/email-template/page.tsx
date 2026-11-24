import { getWioaEmailTemplate } from '@/lib/data/wioa-email-template';
import { WioaEmailTemplateAdminView } from './WioaEmailTemplateAdminView';

export default async function AdminWioaEmailTemplatePage() {
  const template = await getWioaEmailTemplate();
  return <WioaEmailTemplateAdminView template={template} />;
}
