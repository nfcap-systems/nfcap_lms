'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { createWorkforceBoard } from '@/lib/actions/wioa-boards';
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

const emptyForm = {
  name: '',
  county: '',
  serviceArea: '',
  phone: '',
  email: '',
  website: '',
  address: '',
  orientationUrl: '',
  applicationUrl: '',
};

export function NewWorkforceBoardDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const set = (key: keyof typeof emptyForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const valid =
    form.name.trim().length > 0 &&
    form.county.trim().length > 0 &&
    form.serviceArea.trim().length > 0 &&
    form.phone.trim().length > 0 &&
    form.email.trim().length > 0 &&
    form.address.trim().length > 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setForm(emptyForm);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New WIOA board</DialogTitle>
          <DialogDescription>
            AJCC centers, ZIP jurisdictions, and contacts are added next, from the board&apos;s
            detail page.
          </DialogDescription>
        </DialogHeader>
        <div className="flex max-h-96 flex-col gap-3 overflow-y-auto pr-1">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="quick-create-board-name">Board name</Label>
            <Input
              id="quick-create-board-name"
              value={form.name}
              onChange={set('name')}
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="quick-create-board-county">County</Label>
            <Input id="quick-create-board-county" value={form.county} onChange={set('county')} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="quick-create-board-service-area">Service area</Label>
            <Input
              id="quick-create-board-service-area"
              value={form.serviceArea}
              onChange={set('serviceArea')}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="quick-create-board-phone">Phone</Label>
            <Input id="quick-create-board-phone" value={form.phone} onChange={set('phone')} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="quick-create-board-email">Email</Label>
            <Input
              id="quick-create-board-email"
              type="email"
              value={form.email}
              onChange={set('email')}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="quick-create-board-address">Address</Label>
            <Input id="quick-create-board-address" value={form.address} onChange={set('address')} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="quick-create-board-website">Website (optional)</Label>
            <Input id="quick-create-board-website" value={form.website} onChange={set('website')} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="quick-create-board-orientation-url">Orientation URL (optional)</Label>
            <Input
              id="quick-create-board-orientation-url"
              value={form.orientationUrl}
              onChange={set('orientationUrl')}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="quick-create-board-application-url">Application URL (optional)</Label>
            <Input
              id="quick-create-board-application-url"
              value={form.applicationUrl}
              onChange={set('applicationUrl')}
            />
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
                const { id } = await createWorkforceBoard({
                  name: form.name.trim(),
                  county: form.county.trim(),
                  serviceArea: form.serviceArea.trim(),
                  phone: form.phone.trim(),
                  email: form.email.trim(),
                  website: form.website.trim() || null,
                  address: form.address.trim(),
                  orientationUrl: form.orientationUrl.trim() || null,
                  applicationUrl: form.applicationUrl.trim() || null,
                });
                toast.success('Workforce board created');
                onOpenChange(false);
                setForm(emptyForm);
                router.push(`/admin/wioa/boards/${id}`);
              } catch (e) {
                toast.error(e instanceof Error ? e.message : 'Could not create the board.');
              } finally {
                setSubmitting(false);
              }
            }}
          >
            Create board
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
