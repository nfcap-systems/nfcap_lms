import { describe, expect, it } from 'vitest';
import { prisma } from '@/lib/prisma';

describe('test database infra', () => {
  it('connects and can query a model', async () => {
    const count = await prisma.course.count();
    expect(count).toBe(0);
  });
});
