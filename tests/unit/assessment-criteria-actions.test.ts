import { beforeEach, describe, expect, it } from 'vitest';
import {
  addCriterion,
  deleteCriterion,
  moveCriterion,
  updateCriterion,
} from '@/lib/actions/curriculum';
import { getAssessmentCriteria } from '@/lib/data/courses';
import { mockAuthUser } from '../setup/auth-mock';
import { createCourse, fakeUserId } from '../setup/fixtures';

describe('assessment criteria authoring actions', () => {
  beforeEach(() => {
    mockAuthUser('ADMIN', fakeUserId());
  });

  it('adds criteria in append order', async () => {
    const course = await createCourse();

    await addCriterion(course.slug, {
      title: 'First',
      guidance: 'Guidance 1',
      photoRequired: true,
      mandatoryForCertification: true,
    });
    await addCriterion(course.slug, {
      title: 'Second',
      guidance: 'Guidance 2',
      photoRequired: false,
      mandatoryForCertification: false,
    });

    const criteria = await getAssessmentCriteria(course.slug);
    expect(criteria.map((c) => c.title)).toEqual(['First', 'Second']);
  });

  it('updates a criterion in place', async () => {
    const course = await createCourse();
    await addCriterion(course.slug, {
      title: 'Original',
      guidance: 'Original guidance',
      photoRequired: true,
      mandatoryForCertification: true,
    });
    const [criterion] = await getAssessmentCriteria(course.slug);

    await updateCriterion(course.slug, criterion.id, {
      title: 'Updated',
      guidance: 'Updated guidance',
      photoRequired: false,
      mandatoryForCertification: false,
    });

    const [updated] = await getAssessmentCriteria(course.slug);
    expect(updated).toMatchObject({
      title: 'Updated',
      guidance: 'Updated guidance',
      photoRequired: false,
      mandatoryForCertification: false,
    });
  });

  it('deletes a criterion', async () => {
    const course = await createCourse();
    await addCriterion(course.slug, {
      title: 'To delete',
      guidance: 'Guidance',
      photoRequired: true,
      mandatoryForCertification: true,
    });
    const [criterion] = await getAssessmentCriteria(course.slug);

    await deleteCriterion(course.slug, criterion.id);

    expect(await getAssessmentCriteria(course.slug)).toEqual([]);
  });

  it('swaps order when moving a criterion up or down', async () => {
    const course = await createCourse();
    await addCriterion(course.slug, {
      title: 'A',
      guidance: 'g',
      photoRequired: true,
      mandatoryForCertification: true,
    });
    await addCriterion(course.slug, {
      title: 'B',
      guidance: 'g',
      photoRequired: true,
      mandatoryForCertification: true,
    });
    const [a, b] = await getAssessmentCriteria(course.slug);

    await moveCriterion(course.slug, b.id, 'up');

    expect((await getAssessmentCriteria(course.slug)).map((c) => c.title)).toEqual(['B', 'A']);

    await moveCriterion(course.slug, a.id, 'up');
    expect((await getAssessmentCriteria(course.slug)).map((c) => c.title)).toEqual(['A', 'B']);
  });

  it('is a no-op moving the first criterion up or the last one down', async () => {
    const course = await createCourse();
    await addCriterion(course.slug, {
      title: 'A',
      guidance: 'g',
      photoRequired: true,
      mandatoryForCertification: true,
    });
    await addCriterion(course.slug, {
      title: 'B',
      guidance: 'g',
      photoRequired: true,
      mandatoryForCertification: true,
    });
    const [a, b] = await getAssessmentCriteria(course.slug);

    await moveCriterion(course.slug, a.id, 'up');
    await moveCriterion(course.slug, b.id, 'down');

    expect((await getAssessmentCriteria(course.slug)).map((c) => c.title)).toEqual(['A', 'B']);
  });

  it('requires admin to add a criterion', async () => {
    mockAuthUser('LEARNER', fakeUserId());
    const course = await createCourse();

    await expect(
      addCriterion(course.slug, {
        title: 'Nope',
        guidance: 'g',
        photoRequired: true,
        mandatoryForCertification: true,
      }),
    ).rejects.toThrow();
  });
});
