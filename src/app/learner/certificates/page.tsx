import { getAllCourses } from '@/lib/data/courses';
import { getCredentialsForLearner } from '@/lib/data/credentials';
import { getAuthUser } from '@/lib/supabase/server';
import { CertificatesView } from './CertificatesView';

export default async function CertificatesPage() {
  const user = await getAuthUser();
  const courses = await getAllCourses();
  const credentials = user ? await getCredentialsForLearner(user.id, courses) : [];
  const learnerName =
    typeof user?.user_metadata?.name === 'string' ? user.user_metadata.name : 'You';

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-brand-heading">Certificates</h1>
        <p className="mt-1 max-w-2xl text-sm text-text-secondary">
          Credentials earned as you complete courses in the apprenticeship program — issued once
          NFCAP staff verify your Practical Evidence.
        </p>
      </div>

      <CertificatesView credentials={credentials} learnerName={learnerName} />
    </div>
  );
}
