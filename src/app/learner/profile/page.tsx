import { getAllCourses } from '@/lib/data/courses';
import { getLearnerProgressMap } from '@/lib/data/progress';
import { getCredentialsForLearner } from '@/lib/data/credentials';
import { getAuthUser } from '@/lib/supabase/server';
import { ProfileView } from './ProfileView';

export default async function LearnerProfilePage() {
  const user = await getAuthUser();
  const courses = await getAllCourses();
  const progressMap = user ? await getLearnerProgressMap(user.id) : {};
  const credentials = user ? await getCredentialsForLearner(user.id, courses) : [];

  const name = typeof user?.user_metadata?.name === 'string' ? user.user_metadata.name : 'You';
  const email = user?.email ?? 'you@example.com';
  // proxy.ts guarantees a session on this route, so `created_at` is always present in practice —
  // the fallback only covers the type-level possibility of a missing user.
  const memberSince = new Date(user?.created_at ?? 0).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-brand-heading">Profile</h1>
        <p className="mt-1 text-sm text-text-secondary">Your account and training summary.</p>
      </div>

      <ProfileView
        courses={courses}
        progressMap={progressMap}
        credentials={credentials}
        name={name}
        email={email}
        memberSince={memberSince}
      />
    </div>
  );
}
