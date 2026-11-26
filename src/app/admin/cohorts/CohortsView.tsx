'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { Cohort, CohortMember } from '@/lib/data/cohorts';
import type { LearnerRecord } from '@/lib/data/learners';
import { setLearnerCohort } from '@/lib/actions/cohorts';
import { Badge, DataTableCard, ProgressBar, StateCard } from '@/components/ui';
import { Icon } from '@/components/icons';
import { Button } from '@/components/admin-ui/button';
import { NewCohortDialog } from '@/components/admin-shell/quick-create/NewCohortDialog';

function formatDate(iso: string): string {
  // Pinned to 'en-US' — see the comment in src/app/admin/DashboardView.tsx: the environment's
  // default locale (`undefined`) can differ between server and browser, causing a real
  // SSR/hydration mismatch (React error #418).
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const STATUS_BADGE: Record<
  CohortMember['status'],
  { tone: 'success' | 'info' | 'neutral'; label: string }
> = {
  complete: { tone: 'success', label: 'Complete' },
  active: { tone: 'info', label: 'Active' },
  'not-started': { tone: 'neutral', label: 'Not started' },
};

export function CohortsView({
  cohorts,
  membersByCohort,
  pathwayId,
  learners,
}: {
  cohorts: Cohort[];
  membersByCohort: Record<string, CohortMember[]>;
  pathwayId: string | null;
  learners: LearnerRecord[];
}) {
  const [selectedId, setSelectedId] = useState<string | null>(cohorts[0]?.id ?? null);
  const [newOpen, setNewOpen] = useState(false);
  const selected = cohorts.find((c) => c.id === selectedId) ?? null;
  const members = selectedId ? (membersByCohort[selectedId] ?? []) : [];

  return (
    <div className="flex flex-col gap-4">
      <div className="pagehdr">
        <div>
          <h1>Cohorts</h1>
          <p>Track intake groups and completion by cohort.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flex: 'none' }}>
          <Button size="sm" onClick={() => setNewOpen(true)}>
            + New Cohort
          </Button>
        </div>
      </div>

      {cohorts.length === 0 ? (
        <StateCard
          icon={<Icon name="users" className="h-5 w-5" />}
          title="No cohorts yet"
          description="Create a cohort to group learners by intake term and track their completion together."
          action={
            <Button size="sm" onClick={() => setNewOpen(true)}>
              + New Cohort
            </Button>
          }
        />
      ) : (
        <>
          <div
            style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16 }}
          >
            {cohorts.map((cohort) => (
              <button
                key={cohort.id}
                type="button"
                onClick={() => setSelectedId(cohort.id)}
                className="panel"
                style={{
                  textAlign: 'left',
                  cursor: 'pointer',
                  outline: cohort.id === selectedId ? '2px solid var(--nfcap-accent)' : undefined,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 10,
                  }}
                >
                  <span style={{ fontWeight: 700, fontSize: 15 }}>{cohort.name}</span>
                  <Badge tone={cohort.memberCount === 0 ? 'neutral' : 'info'}>
                    {cohort.memberCount === 0 ? 'Not started' : 'Active'}
                  </Badge>
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--ink-muted)', marginBottom: 12 }}>
                  Started {formatDate(cohort.startDate)} · {cohort.memberCount} learner
                  {cohort.memberCount === 1 ? '' : 's'}
                </div>
                {cohort.memberCount > 0 ? (
                  <>
                    <ProgressBar value={cohort.avgCompletion} className="mb-1.5" />
                    <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
                      {cohort.avgCompletion}% average completion
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
                    No learners assigned to this cohort yet.
                  </div>
                )}
              </button>
            ))}
          </div>

          {selected && (
            <DataTableCard style={{ padding: 0 }}>
              <div
                style={{
                  padding: '16px 20px',
                  borderBottom: '1px solid var(--nfcap-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  flexWrap: 'wrap',
                }}
              >
                <span style={{ fontWeight: 600, fontSize: 14.5 }}>{selected.name} — learners</span>
                <AddLearnerControl
                  cohortId={selected.id}
                  cohortName={selected.name}
                  candidates={learners.filter(
                    (l) => !members.some((m) => m.id === l.id),
                  )}
                />
              </div>
              {members.length === 0 ? (
                <div style={{ padding: '32px 0', textAlign: 'center' }}>
                  <StateCard
                    icon={<Icon name="users" className="h-5 w-5" />}
                    title="No learners in this cohort yet"
                    description="Add a learner above to get started."
                  />
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Learner</th>
                      <th>Pathway progress</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((member) => {
                      const badge = STATUS_BADGE[member.status];
                      return (
                        <tr key={member.id}>
                          <td>{member.name}</td>
                          <td>{member.progressPercent}%</td>
                          <td>
                            <Badge tone={badge.tone}>{badge.label}</Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </DataTableCard>
          )}
        </>
      )}

      <NewCohortDialog open={newOpen} onOpenChange={setNewOpen} pathwayId={pathwayId} />
    </div>
  );
}

/** ADM13-Cohorts' missing half — the empty state used to tell the admin to "add learners from
 * their profile's Enrollment tab," but nothing there could do it either (see
 * docs/plans — cohort-assignment fix). Calls the same addLearnerToCohort action as that tab. */
function AddLearnerControl({
  cohortId,
  cohortName,
  candidates,
}: {
  cohortId: string;
  cohortName: string;
  candidates: LearnerRecord[];
}) {
  const router = useRouter();
  const [learnerId, setLearnerId] = useState('');
  const [pending, startTransition] = useTransition();

  function handleAdd() {
    if (!learnerId) return;
    startTransition(async () => {
      try {
        await setLearnerCohort(learnerId, cohortId);
        const added = candidates.find((l) => l.id === learnerId);
        toast.success(`${added?.name ?? 'Learner'} added to ${cohortName}`);
        setLearnerId('');
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Could not add learner.');
      }
    });
  }

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <select
        className="ov-select"
        value={learnerId}
        onChange={(e) => setLearnerId(e.target.value)}
        disabled={pending || candidates.length === 0}
        aria-label={`Add a learner to ${cohortName}`}
      >
        <option value="">
          {candidates.length === 0 ? 'No learners to add' : 'Search learners by name…'}
        </option>
        {candidates.map((l) => (
          <option key={l.id} value={l.id}>
            {l.name}
          </option>
        ))}
      </select>
      <Button size="sm" onClick={handleAdd} disabled={!learnerId || pending}>
        {pending ? 'Adding…' : '+ Add learner'}
      </Button>
    </div>
  );
}
