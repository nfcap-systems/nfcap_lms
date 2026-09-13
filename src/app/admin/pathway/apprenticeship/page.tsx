import { getAllCourses } from '@/lib/data/courses';
import { getPathwaySummary } from '@/lib/data/pathway';
import { PathwayDetailView } from './PathwayDetailView';

export const dynamic = 'force-dynamic';

export default async function AdminPathwayDetailPage() {
  const [courses, summary] = await Promise.all([getAllCourses(), getPathwaySummary()]);
  return <PathwayDetailView courses={courses} summary={summary} />;
}
