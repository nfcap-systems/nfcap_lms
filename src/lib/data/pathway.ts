import { getAllCourses } from './courses';
import { getLearnerRoster } from './learners';
import { getProgressByLearner } from './progress';

export type PathwaySummary = {
  courseCount: number;
  restrictedCount: number;
  /** Learners enrolled in at least one course in the pathway. */
  totalLearners: number;
  /** % of those learners who hold a certificate for every course in the pathway. */
  completionRate: number;
};

/** There is exactly one pathway in this prototype (docs/product/PRODUCT_CONTEXT.md Section 5) —
 * this summarizes it from existing course/progress data rather than a dedicated Pathway table. */
export async function getPathwaySummary(): Promise<PathwaySummary> {
  const [courses, learners] = await Promise.all([getAllCourses(), getLearnerRoster()]);
  const progressByLearner = await getProgressByLearner(learners.map((l) => l.id));

  let totalLearners = 0;
  let completedLearners = 0;

  for (const learner of learners) {
    const progress = progressByLearner[learner.id] ?? {};
    const enrolledAny = courses.some((c) => progress[c.id]?.enrolled);
    if (!enrolledAny) continue;
    totalLearners++;
    const completedAll = courses.every((c) => Boolean(progress[c.id]?.certificateId));
    if (completedAll) completedLearners++;
  }

  return {
    courseCount: courses.length,
    restrictedCount: courses.filter((c) => c.access === 'restricted').length,
    totalLearners,
    completionRate: totalLearners === 0 ? 0 : Math.round((completedLearners / totalLearners) * 100),
  };
}
