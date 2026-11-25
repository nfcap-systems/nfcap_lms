import { getAllCourses, getPublishedCourses } from './courses';
import { getCredentialsForLearner } from './credentials';
import { getLearnerRoster } from './learners';
import { getWioaCases } from './wioa';
import type { SessionContext } from '@/lib/db/rls';

export type SearchResultType = 'course' | 'lesson' | 'certificate' | 'portfolio' | 'learner' | 'case';

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

/** Admin's navbar search — the whole course catalog (including drafts, unlike the learner-facing
 * search above which only surfaces published courses) plus the learner roster by name/email. */
export async function searchAdminContent(query: string): Promise<SearchResult[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const [courses, learners] = await Promise.all([getAllCourses(), getLearnerRoster()]);
  const results: SearchResult[] = [];

  for (const course of courses) {
    if (course.title.toLowerCase().includes(q) || course.description.toLowerCase().includes(q)) {
      results.push({
        type: 'course',
        title: course.title,
        subtitle: course.category,
        href: `/admin/courses/${course.id}`,
      });
    }
  }

  for (const learner of learners) {
    if (learner.name.toLowerCase().includes(q) || learner.email.toLowerCase().includes(q)) {
      results.push({
        type: 'learner',
        title: learner.name,
        subtitle: learner.email,
        href: `/admin/learners/${learner.id}`,
      });
    }
  }

  return results.slice(0, RESULT_LIMIT);
}

/** Coordinator/Partner Staff's navbar search — WIOA cases by the assigned learner's name/email or
 * course title. `opts.assignedPartnerStaffId` scopes it the same way getWioaCases's callers
 * already do (PartnerRosterView) — Coordinator gets every case, Partner Staff only their own. */
export async function searchStaffCases(
  viewer: SessionContext,
  query: string,
  basePath: '/coordinator' | '/partner',
  opts?: { assignedPartnerStaffId?: string },
): Promise<SearchResult[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const cases = await getWioaCases(viewer, opts);
  const results: SearchResult[] = [];

  for (const c of cases) {
    if (
      c.learnerName.toLowerCase().includes(q) ||
      c.learnerEmail.toLowerCase().includes(q) ||
      (c.courseTitle?.toLowerCase().includes(q) ?? false)
    ) {
      results.push({
        type: 'case',
        title: c.learnerName,
        subtitle: c.courseTitle ?? 'No funding request yet',
        href: `${basePath}/${c.id}`,
      });
    }
  }

  return results.slice(0, RESULT_LIMIT);
}
