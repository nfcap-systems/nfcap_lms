import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import { uploadWioaDocument, allowAnotherWioaDocumentUpload } from '@/lib/actions/wioa';
import { mockAuthUser } from '../setup/auth-mock';
import {
  createDocumentRequirement,
  createWioaMasterCase,
  createWorkforceBoard,
  fakeUserId,
} from '../setup/fixtures';

// uploadWioaDocument must never reach Storage once the cap has fired (CAP-5) -- the whole reason
// the cap check runs before uploadWioaDocumentFile is to avoid writing an orphaned storage object
// for an upload that's about to be refused. Stubbed so the assertion below can prove it, same
// pattern as tests/unit/legacy-evidence-regression.test.ts stubbing evidence-storage.
vi.mock('@/lib/supabase/wioa-storage', () => ({
  uploadWioaDocumentFile: vi.fn(async () => undefined),
  getWioaDocumentSignedUrl: vi.fn(async () => 'https://example.test/signed'),
}));

import { uploadWioaDocumentFile } from '@/lib/supabase/wioa-storage';

function fakeFile(name = 'id.pdf'): File {
  return new File([Buffer.from('%PDF-1.4 fake')], name, { type: 'application/pdf' });
}

describe('uploadWioaDocument — upload cap (CAP-5)', () => {
  let learnerId: string;
  let documentId: string;

  beforeEach(async () => {
    vi.mocked(uploadWioaDocumentFile).mockClear();

    learnerId = fakeUserId();
    mockAuthUser('LEARNER', learnerId);

    const board = await createWorkforceBoard();
    const requirement = await createDocumentRequirement(board.id, 'Proof of ID');
    const masterCase = await createWioaMasterCase({ learnerId, workforceBoardId: board.id });

    const doc = await prisma.wioaDocument.create({
      data: { masterCaseId: masterCase.id, requirementId: requirement.id, status: 'MISSING' },
    });
    documentId = doc.id;
  });

  it('refuses the upload once 10 total uploads have already happened, without touching storage', async () => {
    // 9 archived versions + the 1 live file on the document row = 10 total uploads already.
    await prisma.wioaDocumentVersion.createMany({
      data: Array.from({ length: 9 }, (_, i) => ({
        documentId,
        fileName: `old-${i}.pdf`,
        storagePath: `fake/path-${i}.pdf`,
        uploadedAt: new Date(),
        status: 'REJECTED' as const,
      })),
    });
    await prisma.wioaDocument.update({
      where: { id: documentId },
      data: { fileName: 'current.pdf', storagePath: 'fake/current.pdf', uploadedAt: new Date() },
    });

    const result = await uploadWioaDocument(documentId, fakeFile());

    expect(result).toEqual({
      ok: false,
      error: expect.stringMatching(/case manager/i),
    });
    expect(uploadWioaDocumentFile).not.toHaveBeenCalled();

    const auditRows = await prisma.auditLog.findMany({
      where: { action: 'WIOA_DOCUMENT_UPLOAD_CAP_REACHED', targetId: documentId },
    });
    expect(auditRows).toHaveLength(1);
  });

  it('still succeeds at 9 total prior uploads — the 10th upload is allowed', async () => {
    // 8 archived versions + the 1 live file = 9 total uploads so far; this upload is the 10th,
    // which the cap must still allow (an off-by-one would refuse it instead).
    await prisma.wioaDocumentVersion.createMany({
      data: Array.from({ length: 8 }, (_, i) => ({
        documentId,
        fileName: `old-${i}.pdf`,
        storagePath: `fake/path-${i}.pdf`,
        uploadedAt: new Date(),
        status: 'REJECTED' as const,
      })),
    });
    await prisma.wioaDocument.update({
      where: { id: documentId },
      data: { fileName: 'current.pdf', storagePath: 'fake/current.pdf', uploadedAt: new Date() },
    });

    const result = await uploadWioaDocument(documentId, fakeFile());

    expect(result).toEqual({ ok: true });
    expect(uploadWioaDocumentFile).toHaveBeenCalledTimes(1);
  });
});

describe('allowAnotherWioaDocumentUpload (CAP-4)', () => {
  let coordinatorId: string;
  let learnerId: string;
  let documentId: string;

  beforeEach(async () => {
    vi.mocked(uploadWioaDocumentFile).mockClear();

    learnerId = fakeUserId();
    coordinatorId = fakeUserId();

    const board = await createWorkforceBoard();
    const requirement = await createDocumentRequirement(board.id, 'Proof of ID');
    const masterCase = await createWioaMasterCase({ learnerId, workforceBoardId: board.id });

    const doc = await prisma.wioaDocument.create({
      data: { masterCaseId: masterCase.id, requirementId: requirement.id, status: 'MISSING' },
    });
    documentId = doc.id;

    // 9 archived versions + the 1 live file = 10 total uploads, the standard cap.
    await prisma.wioaDocumentVersion.createMany({
      data: Array.from({ length: 9 }, (_, i) => ({
        documentId,
        fileName: `old-${i}.pdf`,
        storagePath: `fake/path-${i}.pdf`,
        uploadedAt: new Date(),
        status: 'REJECTED' as const,
      })),
    });
    await prisma.wioaDocument.update({
      where: { id: documentId },
      data: { fileName: 'current.pdf', storagePath: 'fake/current.pdf', uploadedAt: new Date() },
    });
  });

  it('raises the limit by exactly one, letting the next upload through and the one after it fail again', async () => {
    mockAuthUser('WIOA_COORDINATOR', coordinatorId);

    const result = await allowAnotherWioaDocumentUpload(documentId);
    expect(result).toEqual({ ok: true });

    mockAuthUser('LEARNER', learnerId);
    const firstRetry = await uploadWioaDocument(documentId, fakeFile());
    expect(firstRetry).toEqual({ ok: true });

    const secondRetry = await uploadWioaDocument(documentId, fakeFile());
    expect(secondRetry).toEqual({
      ok: false,
      error: expect.stringMatching(/case manager/i),
    });
  });

  it('refuses when the document has not actually reached its current limit', async () => {
    mockAuthUser('WIOA_COORDINATOR', coordinatorId);
    await allowAnotherWioaDocumentUpload(documentId); // raises the override to 11

    const result = await allowAnotherWioaDocumentUpload(documentId);
    expect(result).toEqual({
      ok: false,
      error: expect.stringMatching(/not reached/i),
    });
  });

  it('logs an audit event distinct from the learner-facing cap-reached event', async () => {
    mockAuthUser('WIOA_COORDINATOR', coordinatorId);
    await allowAnotherWioaDocumentUpload(documentId);

    const auditRows = await prisma.auditLog.findMany({
      where: { action: 'WIOA_DOCUMENT_UPLOAD_LIMIT_RAISED', targetId: documentId },
    });
    expect(auditRows).toHaveLength(1);
  });
});
