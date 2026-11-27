-- DEMO-3/A6: guard against duplicate open course-funding cases for the same (masterCaseId,
-- courseId) pair at the database level, not just in application code
-- (requestCourseFunding's findFirst({ where: { ..., closedAt: null } }) guard in
-- src/lib/actions/wioa.ts).
--
-- A plain `@@unique([masterCaseId, courseId])` would be wrong: a learner may legitimately
-- re-request funding for a course after a previous case closed (e.g. FUNDING_DECLINED), so more
-- than one *closed* case for the same pair is expected and must stay allowed. Only one *open*
-- (closedAt IS NULL) case per pair should ever exist. Prisma's schema language has no syntax for
-- a partial unique index, so this is a hand-written migration; the index is declared in
-- schema.prisma as a comment pointing back here rather than modeled with `@@unique`, since a
-- bare `@@unique` there would misrepresent what's actually enforced.
CREATE UNIQUE INDEX "WioaCourseCase_masterCaseId_courseId_open_key"
  ON "WioaCourseCase" ("masterCaseId", "courseId")
  WHERE "closedAt" IS NULL;
