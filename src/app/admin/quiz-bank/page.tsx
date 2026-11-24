import { requireAdmin } from '@/lib/actions/guard';
import { getCoursesWithAssessment, getQuizBankForCourse } from '@/lib/data/quiz-bank';
import { QuizBankView } from './QuizBankView';

export default async function AdminQuizBankPage({
  searchParams,
}: {
  searchParams: Promise<{ course?: string }>;
}) {
  await requireAdmin();
  const { course: courseParam } = await searchParams;
  const courses = await getCoursesWithAssessment();
  const selectedSlug = courseParam ?? courses[0]?.slug ?? null;
  const bank = selectedSlug ? await getQuizBankForCourse(selectedSlug) : null;

  return <QuizBankView courses={courses} selectedSlug={selectedSlug} bank={bank} />;
}
