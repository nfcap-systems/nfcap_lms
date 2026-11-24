export type LessonType = 'video' | 'text' | 'image' | 'resource';

export type ContentBlockType =
  | 'text'
  | 'bullet-list'
  | 'numbered-list'
  | 'header-1'
  | 'header-2'
  | 'header-3'
  | 'image'
  | 'video';

export type ContentBlock = {
  id: string;
  type: ContentBlockType;
  /** Plain text for text/header-*; caption for image/video. */
  content: string;
  /** Populated only for bullet-list/numbered-list. */
  items: string[];
  /** Populated only for image/video. */
  url?: string;
  order: number;
};

export type Lesson = {
  id: string;
  title: string;
  type: LessonType;
  durationMinutes: number;
  blocks: ContentBlock[];
};

export type Section = {
  id: string;
  title: string;
  lessons: Lesson[];
};

export type CourseAccess = 'open' | 'restricted';

export type QuizQuestion = {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
};

export type Assessment = {
  id: string;
  /** Fraction of questions (0-1) a learner must answer correctly to pass. */
  passThreshold: number;
  /** Null means unlimited attempts (Quiz Engine Depth, Layer 1 — enforced server-side in
   * recordQuizAttempt; surfaced here only for display, e.g. LRN05-QuizPre's facts card). */
  maxAttempts: number | null;
  questions: QuizQuestion[];
};

// Per-course criteria a trainee must demonstrate for certification (docs/client/
// NFCAP_LMS_Feature_Detail_Client.md, "Per-Course Assessment Criteria"). Deliberately not nested
// on `Course` below — authoring (feature #4) and per-criterion review (feature #7) aren't built
// yet, so nothing needs it on every course fetch; see `getAssessmentCriteria` in
// src/lib/data/courses.ts for the narrow fetch this uses instead.
export type AssessmentCriterion = {
  id: string;
  title: string;
  guidance: string;
  /** Whether this criterion must be demonstrated with a photo, vs. satisfied by description alone. */
  photoRequired: boolean;
  /** Whether a Certificate requires this criterion to be marked Met (feature #7). */
  mandatoryForCertification: boolean;
};

export type Course = {
  id: string;
  title: string;
  description: string;
  category: string;
  access: CourseAccess;
  /** Position in the apprenticeship pathway, for display ordering only. */
  pathwayOrder: number;
  sections: Section[];
  /** Knowledge Assessment taken after all lessons are complete (PRODUCT_CONTEXT.md Section 5). */
  assessment: Assessment;
  /** Instructions shown on the Practical Evidence submission step, unlocked after passing the assessment. */
  evidencePrompt: string;
};

export function courseLessonCount(course: Course): number {
  return course.sections.reduce((sum, section) => sum + section.lessons.length, 0);
}

export function courseDurationMinutes(course: Course): number {
  return course.sections.reduce(
    (sum, section) => sum + section.lessons.reduce((s, lesson) => s + lesson.durationMinutes, 0),
    0,
  );
}

export type FlatLesson = {
  lesson: Lesson;
  sectionId: string;
  sectionTitle: string;
  index: number;
};

export function flattenLessons(course: Course): FlatLesson[] {
  const flat: FlatLesson[] = [];
  for (const section of course.sections) {
    for (const lesson of section.lessons) {
      flat.push({ lesson, sectionId: section.id, sectionTitle: section.title, index: flat.length });
    }
  }
  return flat;
}
