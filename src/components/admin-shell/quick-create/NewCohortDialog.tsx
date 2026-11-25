'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { createCohort } from '@/lib/actions/cohorts';
import { Button } from '@/components/admin-ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/admin-ui/dialog';
import { Input } from '@/components/admin-ui/input';
import { Label } from '@/components/admin-ui/label';

/** ADM13-Cohorts' "+ New Cohort". Auto-assigns the apprenticeship pathway — PRODUCT_CONTEXT.md
 * §5: exactly one pathway exists, so a dropdown here would imply a choice that isn't real. */
export function NewCohortDialog({
  open,
  onOpenChange,
  pathwayId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pathwayId: string | null;
}) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const valid = name.trim().length > 0 && startDate.length > 0;

  const reset = () => {
    setName('');
    setStartDate('');
    setEndDate('');
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New cohort</DialogTitle>
          <DialogDescription>Track an intake group&apos;s progress together.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-cohort-name">Cohort name</Label>
            <Input
              id="new-cohort-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Fall 2026 Intake"
              autoFocus
            />
          </div>
          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="new-cohort-start">Start date</Label>
              <Input
                id="new-cohort-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="new-cohort-end">End date (optional)</Label>
              <Input
                id="new-cohort-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!valid || submitting}
            onClick={async () => {
              setSubmitting(true);
              try {
                await createCohort({
                  name: name.trim(),
                  pathwayId,
                  startDate: new Date(startDate),
                  endDate: endDate ? new Date(endDate) : null,
                });
                toast.success('Cohort created');
                onOpenChange(false);
                reset();
                router.refresh();
              } catch (e) {
                toast.error(e instanceof Error ? e.message : 'Could not create the cohort.');
              } finally {
                setSubmitting(false);
              }
            }}
          >
            Create cohort
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
