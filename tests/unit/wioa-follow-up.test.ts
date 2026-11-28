import { describe, expect, it } from 'vitest';
import { determineWioaFollowUpReason } from '@/lib/wioa/follow-up';

// Pure function, no DB — unlike wioa-upload-cap.test.ts / wioa-status.test.ts this one can
// actually run in this sandbox (no Docker Postgres required).
describe('determineWioaFollowUpReason (NOTIF-3)', () => {
  const base = {
    status: 'AWAITING_RESPONSE' as const,
    updatedAt: new Date('2026-11-20T09:00:00Z'), // a Friday
    hasRejectedDocument: false,
    hasCappedDocument: false,
    courseCaseCount: 0,
    nextAppointmentAt: null,
  };

  it('does not flag a Friday outreach as stalled by Monday (the calendar-day bug this fixes)', () => {
    const monday = new Date('2026-11-23T09:00:00Z');
    expect(determineWioaFollowUpReason({ ...base, now: monday })).toBeNull();
  });

  it('flags after 3 business days have actually elapsed (Wednesday)', () => {
    const wednesday = new Date('2026-11-25T09:00:00Z');
    expect(determineWioaFollowUpReason({ ...base, now: wednesday })).toEqual({
      code: 'NO_RESPONSE',
      reason: 'No response 3+ business days after outreach',
    });
  });

  it('a rejected document outranks every other trigger', () => {
    const result = determineWioaFollowUpReason({
      ...base,
      hasRejectedDocument: true,
      now: new Date('2026-11-25T09:00:00Z'),
    });
    expect(result?.code).toBe('DOCUMENT_REJECTED');
  });

  it('a capped document outranks a plain rejected document (CAP-3)', () => {
    const result = determineWioaFollowUpReason({
      ...base,
      hasRejectedDocument: true,
      hasCappedDocument: true,
      now: new Date('2026-11-25T09:00:00Z'),
    });
    expect(result).toEqual({
      code: 'UPLOAD_CAP_REACHED',
      reason: 'Document upload limit reached — needs staff action',
    });
  });

  it('a capped document outranks every other trigger even alone', () => {
    const result = determineWioaFollowUpReason({
      ...base,
      hasCappedDocument: true,
      now: new Date('2026-11-25T09:00:00Z'),
    });
    expect(result?.code).toBe('UPLOAD_CAP_REACHED');
  });

  it('flags documents pending 5+ calendar days (unchanged, not business-day gated)', () => {
    const result = determineWioaFollowUpReason({
      status: 'DOCUMENTS_PENDING',
      updatedAt: new Date('2026-11-20T09:00:00Z'),
      hasRejectedDocument: false,
      hasCappedDocument: false,
      courseCaseCount: 0,
      nextAppointmentAt: null,
      now: new Date('2026-11-25T09:00:01Z'),
    });
    expect(result?.code).toBe('DOCUMENTS_PENDING');
  });

  it('flags eligible-with-no-funding-request', () => {
    const result = determineWioaFollowUpReason({
      status: 'WIOA_ELIGIBLE',
      updatedAt: new Date('2026-11-25T09:00:00Z'),
      hasRejectedDocument: false,
      hasCappedDocument: false,
      courseCaseCount: 0,
      nextAppointmentAt: null,
      now: new Date('2026-11-25T10:00:00Z'),
    });
    expect(result?.code).toBe('ELIGIBLE_NO_FUNDING');
  });

  it('does not flag eligible-with-no-funding-request once a course case exists', () => {
    const result = determineWioaFollowUpReason({
      status: 'WIOA_ELIGIBLE',
      updatedAt: new Date('2026-11-25T09:00:00Z'),
      hasRejectedDocument: false,
      hasCappedDocument: false,
      courseCaseCount: 1,
      nextAppointmentAt: null,
      now: new Date('2026-11-25T10:00:00Z'),
    });
    expect(result).toBeNull();
  });

  it('flags an appointment scheduled within 48 hours', () => {
    const now = new Date('2026-11-25T09:00:00Z');
    const result = determineWioaFollowUpReason({
      status: 'REGISTERED',
      updatedAt: now,
      hasRejectedDocument: false,
      hasCappedDocument: false,
      courseCaseCount: 0,
      nextAppointmentAt: new Date('2026-11-26T09:00:00Z'),
      now,
    });
    expect(result?.code).toBe('APPOINTMENT_UPCOMING');
  });

  it('does not flag an appointment more than 48 hours out', () => {
    const now = new Date('2026-11-25T09:00:00Z');
    const result = determineWioaFollowUpReason({
      status: 'REGISTERED',
      updatedAt: now,
      hasRejectedDocument: false,
      hasCappedDocument: false,
      courseCaseCount: 0,
      nextAppointmentAt: new Date('2026-11-29T09:00:00Z'),
      now,
    });
    expect(result).toBeNull();
  });

  it('does not flag a past, missed appointment', () => {
    const now = new Date('2026-11-25T09:00:00Z');
    const result = determineWioaFollowUpReason({
      status: 'REGISTERED',
      updatedAt: now,
      hasRejectedDocument: false,
      hasCappedDocument: false,
      courseCaseCount: 0,
      nextAppointmentAt: new Date('2026-11-24T09:00:00Z'),
      now,
    });
    expect(result).toBeNull();
  });

  it('returns null when nothing is wrong', () => {
    const result = determineWioaFollowUpReason({
      status: 'REGISTERED',
      updatedAt: new Date('2026-11-25T09:00:00Z'),
      hasRejectedDocument: false,
      hasCappedDocument: false,
      courseCaseCount: 0,
      nextAppointmentAt: null,
      now: new Date('2026-11-25T10:00:00Z'),
    });
    expect(result).toBeNull();
  });
});
