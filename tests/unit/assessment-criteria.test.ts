import { describe, expect, it } from 'vitest';
import { prisma } from '@/lib/prisma';
import { getAssessmentCriteria } from '@/lib/data/courses';
import { createCourse } from '../setup/fixtures';

describe('getAssessmentCriteria', () => {
  it('returns criteria for the given course in display order', async () => {
    const course = await createCourse();
    await prisma.assessmentCriterion.createMany({
      data: [
        {
          courseId: course.id,
          title: 'Second criterion',
          guidance: 'Shown second.',
          photoRequired: true,
          mandatoryForCertification: true,
          order: 1,
        },
        {
          courseId: course.id,
          title: 'First criterion',
          guidance: 'Shown first.',
          photoRequired: false,
          mandatoryForCertification: false,
          order: 0,
        },
      ],
    });

    const criteria = await getAssessmentCriteria(course.slug);

    expect(criteria.map((c) => c.title)).toEqual(['First criterion', 'Second criterion']);
    expect(criteria[0]).toMatchObject({
      guidance: 'Shown first.',
      photoRequired: false,
      mandatoryForCertification: false,
    });
    expect(criteria[1]).toMatchObject({
      guidance: 'Shown second.',
      photoRequired: true,
      mandatoryForCertification: true,
    });
  });

  it('returns an empty array for a course with no criteria', async () => {
    const course = await createCourse();

    const criteria = await getAssessmentCriteria(course.slug);

    expect(criteria).toEqual([]);
  });

  it("does not return another course's criteria", async () => {
    const courseA = await createCourse();
    const courseB = await createCourse();
    await prisma.assessmentCriterion.create({
      data: {
        courseId: courseB.id,
        title: 'Belongs to course B',
        guidance: 'Should not leak into course A.',
        photoRequired: true,
        mandatoryForCertification: true,
        order: 0,
      },
    });

    const criteria = await getAssessmentCriteria(courseA.slug);

    expect(criteria).toEqual([]);
  });
});
