import { requireAdmin } from '@/lib/actions/guard';
import {
  getAllBankQuestions,
  getAssessmentSettingsByCourse,
  getCoursesWithAssessment,
} from '@/lib/data/quiz-bank';
import { QuizBankView } from './QuizBankView';

export default async function AdminQuizBankPage() {
  await requireAdmin();
  const [courses, questions, settingsByCourse] = await Promise.all([
    getCoursesWithAssessment(),
    getAllBankQuestions(),
    getAssessmentSettingsByCourse(),
  ]);

  return (
    <QuizBankView courses={courses} questions={questions} settingsByCourse={settingsByCourse} />
  );
}
