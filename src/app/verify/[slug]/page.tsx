import { VerifyCredentialView } from '@/components/learner/VerifyCredentialView';
import { getPublicCredentialBySlug } from '@/lib/data/credentials';

export const metadata = { title: 'Verify Credential — NFCAP' };

export default async function VerifyCredentialPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const credential = await getPublicCredentialBySlug(slug);
  return <VerifyCredentialView credential={credential} />;
}
