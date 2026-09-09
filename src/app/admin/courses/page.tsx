import { getAllCourses } from '@/lib/data/courses';
import { AdminCoursesView } from './AdminCoursesView';

export default async function AdminCoursesPage() {
  const courses = await getAllCourses();
  return <AdminCoursesView courses={courses} />;
}
