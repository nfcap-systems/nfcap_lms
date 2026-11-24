import Link from 'next/link';
import { Icon } from '@/components/icons';
import type { WioaAppointmentRecord } from '@/lib/data/wioa';
import type { AppointmentType } from '@/generated/prisma/enums';

const APPOINTMENT_ORDER: AppointmentType[] = ['ORIENTATION', 'INTAKE', 'FOLLOWUP'];

const APPOINTMENT_LABEL: Record<AppointmentType, string> = {
  ORIENTATION: 'Orientation',
  INTAKE: 'Intake appointment',
  FOLLOWUP: 'Follow-up',
};

const APPOINTMENT_COPY: Record<AppointmentType, string> = {
  ORIENTATION: 'Group orientation covering the WIOA process and what’s expected next.',
  INTAKE:
    'One-on-one with your case manager — bring the documents from your checklist, even ones still under review.',
  FOLLOWUP: 'Scheduled only if the board needs anything further after intake.',
};

/** LRN10i-Appointments — a dedicated screen, not the thin embedded card WioaCaseFeed used to be
 * the only place this data showed. The board always shows all three appointment types in a fixed
 * order (Completed / Upcoming / Not scheduled), not just the ones that happen to have a row. */
export function AppointmentsView({
  courseTitle,
  appointments,
}: {
  courseTitle: string;
  appointments: WioaAppointmentRecord[];
}) {
  const byType = new Map(appointments.map((a) => [a.type, a]));

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      <div>
        <div style={{ fontSize: 12.5, color: 'var(--ink-muted)', marginBottom: 6 }}>
          <Link href="/learner/funding" style={{ color: 'var(--ink-muted)' }}>
            Your WIOA funding
          </Link>
          <span style={{ margin: '0 6px' }}>›</span>
          Appointments
        </div>
        <div style={{ fontSize: 26, fontWeight: 700, fontFamily: 'var(--font-display)' }}>
          Appointments
        </div>
        <div style={{ fontSize: 13.5, color: 'var(--ink-muted)', marginTop: 4 }}>
          Orientation and intake happen with {courseTitle ? 'your workforce board' : 'the board'},
          outside NFCAP — these are scheduled and tracked here.
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 22 }}>
        {APPOINTMENT_ORDER.map((type) => {
          const appt = byType.get(type);
          const completed = Boolean(appt?.completedAt);
          const upcoming = Boolean(appt) && !completed;

          return (
            <div
              key={type}
              className="apt"
              style={{
                display: 'flex',
                gap: 14,
                alignItems: 'flex-start',
                border: '1px solid var(--nfcap-border)',
                borderRadius: 'var(--nfcap-radius-lg)',
                padding: '16px 18px',
                ...(upcoming
                  ? { borderColor: '#bfdbfe', background: '#eff6ff' }
                  : !appt
                    ? { opacity: 0.6 }
                    : {}),
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 'var(--nfcap-radius-md)',
                  background: completed
                    ? 'var(--status-complete-bg)'
                    : upcoming
                      ? '#dbeafe'
                      : 'var(--surface-muted)',
                  color: completed
                    ? 'var(--status-complete)'
                    : upcoming
                      ? 'var(--nfcap-accent)'
                      : 'var(--ink-faint)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Icon name="clipboard" className="h-5 w-5" />
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <b style={{ fontSize: 14.5 }}>{APPOINTMENT_LABEL[type]}</b>
                  {completed ? (
                    <span className="badge-complete">Completed</span>
                  ) : upcoming ? (
                    <span className="badge-accent">Upcoming</span>
                  ) : (
                    <span className="badge-neutral">Not scheduled</span>
                  )}
                </div>
                {appt && (
                  <div style={{ fontSize: 12.5, color: 'var(--ink-muted)', marginTop: 2 }}>
                    {new Date(appt.scheduledAt).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </div>
                )}
                <div style={{ fontSize: 13, color: 'var(--ink-muted)', marginTop: 6 }}>
                  {appt?.notes ?? APPOINTMENT_COPY[type]}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
