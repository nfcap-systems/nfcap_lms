import { getAllCourses } from '@/lib/data/courses';
import { getCredentialsForLearner } from '@/lib/data/credentials';
import { getAuthUser } from '@/lib/supabase/server';
import { PortfolioView } from './PortfolioView';

export default async function PortfolioPage() {
  const user = await getAuthUser();
  const courses = await getAllCourses();
  const credentials = user ? await getCredentialsForLearner(user.id, courses) : [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-brand-heading">Portfolio</h1>
        <p className="mt-1 max-w-2xl text-sm text-text-secondary">
          Verified evidence of your demonstrated skills. Visible only to you and NFCAP staff.
        </p>
      </div>

      <PortfolioView credentials={credentials} />
    </div>
  );
}
