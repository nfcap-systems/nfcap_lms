import { getAllCourses, getPublishedCourses } from './courses';
import { getCredentialsForLearner } from './credentials';

export type SearchResultType = 'course' | 'lesson' | 'certificate' | 'portfolio';

export type SearchResult = {
  type: SearchResultType;
  title: string;
  subtitle: string;
  href: string;
};

const RESULT_LIMIT = 8;

/** Global learner search across the Course Catalog, lesson titles, and the learner's own earned
 * credentials — feeds the navbar search bar. Unauthenticated callers still get catalog matches. */
export async function searchLearnerContent(
  learnerId: string | undefined,
  query: string,
): Promise<SearchResult[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const courses = await getPublishedCourses();
  const results: SearchResult[] = [];

  for (const course of courses) {
    if (course.title.toLowerCase().includes(q) || course.description.toLowerCase().includes(q)) {
      results.push({
        type: 'course',
        title: course.title,
        subtitle: course.category,
        href: `/learner/courses/${course.id}`,
      });
    }
    for (const section of course.sections) {
      for (const lesson of section.lessons) {
        if (lesson.title.toLowerCase().includes(q)) {
          results.push({
            type: 'lesson',
            title: lesson.title,
            subtitle: course.title,
            href: `/learner/courses/${course.id}`,
          });
        }
      }
    }
  }

  if (learnerId) {
    const allCourses = await getAllCourses();
    const credentials = await getCredentialsForLearner(learnerId, allCourses);
    for (const credential of credentials) {
      if (credential.course.title.toLowerCase().includes(q)) {
        results.push({
          type: 'certificate',
          title: `${credential.course.title} certificate`,
          subtitle: `Certificate ${credential.certificateId}`,
          href: '/learner/certificates',
        });
        results.push({
          type: 'portfolio',
          title: credential.course.title,
          subtitle: 'Verified evidence in your portfolio',
          href: '/learner/portfolio',
        });
      }
    }
  }

  return results.slice(0, RESULT_LIMIT);
}
