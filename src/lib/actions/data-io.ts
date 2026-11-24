'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from './guard';
import { logAuditEvent, getAuditLog } from './audit';
import { getAllCourses } from '@/lib/data/courses';
import { getLearnerRoster } from '@/lib/data/learners';
import { getProgressByLearner } from '@/lib/data/progress';
import { getAllUsersWithRoles } from '@/lib/data/users';
import { getWioaCases } from '@/lib/data/wioa';

/** ADM15-DataInOut — no backend existed for this board at all (docs/MOCKUP-INDEX.md's routing-gaps
 * list). Exports are read-only CSV generation over existing data; bulk-enroll only enrolls
 * EXISTING learner accounts matched by email into the pathway's OPEN courses — it does not create
 * new Supabase Auth accounts (no admin-initiated learner-creation flow exists anywhere in this
 * app; "Add Learner" is disabled everywhere else for the same reason, see DashboardView/
 * LearnersRosterView). Restricted courses stay gated through CourseUnlock/WioaCase exactly as
 * everywhere else — bulk CSV enrollment deliberately can't bypass that. */

function csvEscape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function toCsv(headers: string[], rows: string[][]): string {
  return [headers, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
}

export async function exportLearnersCsv(): Promise<string> {
  const admin = await requireAdmin();
  const [courses, learners, pathway] = await Promise.all([
    getAllCourses(),
    getLearnerRoster(),
    prisma.pathway.findFirst({ where: { isDefault: true }, select: { name: true } }),
  ]);
  const progressByLearner = await getProgressByLearner(learners.map((l) => l.id));

  const rows = learners.map((learner) => {
    const progress = progressByLearner[learner.id] ?? {};
    const enrolledAny = courses.some((c) => progress[c.id]?.enrolled);
    const completed = courses.filter((c) => Boolean(progress[c.id]?.certificateId)).length;
    const status = !enrolledAny
      ? 'not-started'
      : completed === courses.length
        ? 'complete'
        : 'active';
    return [learner.name, learner.email, pathway?.name ?? '', status];
  });

  await logAuditEvent({
    actor: admin,
    action: 'EXPORT_DATA',
    targetType: 'Learner',
    metadata: { export: 'all-learners', rowCount: rows.length },
  });
  return toCsv(['Name', 'Email', 'Pathway', 'Status'], rows);
}

export async function exportEvidenceReviewHistoryCsv(): Promise<string> {
  const admin = await requireAdmin();
  const entries = await getAuditLog(admin, 1000);
  const reviews = entries.filter((e) => e.action === 'REVIEW_EVIDENCE');

  const [actors, learners] = await Promise.all([getAllUsersWithRoles(), getLearnerRoster()]);
  const actorById = new Map(actors.map((a) => [a.id, a.name]));
  const learnerById = new Map(learners.map((l) => [l.id, l.name]));

  const rows = reviews.map((e) => {
    const meta = e.metadata as { status?: string; learnerId?: string; courseSlug?: string } | null;
    const learnerId = meta?.learnerId ?? '';
    return [
      learnerById.get(learnerId) ?? learnerId,
      meta?.courseSlug ?? '',
      meta?.status ?? '',
      actorById.get(e.actorId) ?? e.actorId,
      e.createdAt.toISOString(),
    ];
  });

  await logAuditEvent({
    actor: admin,
    action: 'EXPORT_DATA',
    targetType: 'EvidenceSubmission',
    metadata: { export: 'evidence-review-history', rowCount: rows.length },
  });
  return toCsv(['Learner', 'Course', 'Decision', 'Reviewed by', 'Date'], rows);
}

export async function exportWioaCasesCsv(): Promise<string> {
  const admin = await requireAdmin();
  const cases = await getWioaCases({ userId: admin.id, role: 'ADMIN' });
  const rows = cases.map((c) => [
    c.learnerName,
    c.courseTitle,
    c.status,
    c.boardName ?? '',
    c.createdAt.toISOString(),
  ]);

  await logAuditEvent({
    actor: admin,
    action: 'EXPORT_DATA',
    targetType: 'WioaCase',
    metadata: { export: 'wioa-funding-cases', rowCount: rows.length },
  });
  return toCsv(['Learner', 'Course', 'Status', 'Board', 'Opened'], rows);
}

export type BulkEnrollRow = { name: string; email: string };
export type BulkEnrollOutcome = { email: string; name: string; status: 'enrolled' | 'not-found' };
export type BulkEnrollResult = {
  outcomes: BulkEnrollOutcome[];
  enrolledCount: number;
  notFoundCount: number;
};

/** One batched createMany for every matched-learner × open-course pair, not a query per row
 * (CLAUDE.md performance conventions — "no per-entity queries in a loop"), which matters once a
 * CSV has up to the board's stated 500-row cap. */
export async function bulkEnrollLearners(rows: BulkEnrollRow[]): Promise<BulkEnrollResult> {
  const admin = await requireAdmin();
  const [roster, openCourses] = await Promise.all([
    getLearnerRoster(),
    prisma.course.findMany({ where: { access: 'OPEN' }, select: { id: true } }),
  ]);
  const rosterByEmail = new Map(roster.map((l) => [l.email.toLowerCase(), l]));

  const outcomes: BulkEnrollOutcome[] = [];
  const enrollmentData: { learnerId: string; courseId: string }[] = [];

  for (const row of rows) {
    const learner = rosterByEmail.get(row.email.trim().toLowerCase());
    if (!learner) {
      outcomes.push({ email: row.email, name: row.name, status: 'not-found' });
      continue;
    }
    outcomes.push({ email: row.email, name: learner.name, status: 'enrolled' });
    for (const course of openCourses) {
      enrollmentData.push({ learnerId: learner.id, courseId: course.id });
    }
  }

  if (enrollmentData.length > 0) {
    await prisma.enrollment.createMany({ data: enrollmentData, skipDuplicates: true });
  }

  const enrolledCount = outcomes.filter((o) => o.status === 'enrolled').length;
  await logAuditEvent({
    actor: admin,
    action: 'BULK_ENROLL',
    targetType: 'Enrollment',
    metadata: { rowCount: rows.length, enrolledCount },
  });
  revalidatePath('/admin/learners');

  return {
    outcomes,
    enrolledCount,
    notFoundCount: outcomes.length - enrolledCount,
  };
}
