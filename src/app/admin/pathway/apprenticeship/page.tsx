import { connection } from 'next/server';
import { getAllCourses } from '@/lib/data/courses';
import { getPathwaySummary } from '@/lib/data/pathway';
import { PathwayDetailView } from './PathwayDetailView';

export default async function AdminPathwayDetailPage() {
  // getPathwaySummary folds in the learner roster (src/lib/data/learners.ts), which comes from
  // Supabase Auth directly and has no revalidatePath hook on signup — see src/app/admin/page.tsx.
  await connection();
  const [courses, summary] = await Promise.all([getAllCourses(), getPathwaySummary()]);
  return <PathwayDetailView courses={courses} summary={summary} />;
}
