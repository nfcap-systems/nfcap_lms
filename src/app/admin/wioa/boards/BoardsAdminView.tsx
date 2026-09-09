'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge, Button, Card, CardContent, Drawer, Field, Input } from '@/components/ui';
import { Icon } from '@/components/icons';
import { createWorkforceBoard } from '@/lib/actions/wioa-boards';
import type { WorkforceBoardSummary } from '@/lib/data/wioa-boards';

export function BoardsAdminView({ boards }: { boards: WorkforceBoardSummary[] }) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Icon name="plus" className="size-4" />
          Add Board
        </Button>
      </div>

      {boards.length === 0 ? (
        <Card>
          <div className="py-10 text-center text-sm text-text-secondary">
            No workforce boards yet — add one to start routing learners by ZIP.
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {boards.map((b) => (
            <Card
              key={b.id}
              className="cursor-pointer transition-colors hover:bg-bg-subtle"
              onClick={() => router.push(`/admin/wioa/boards/${b.id}`)}
            >
              <CardContent className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-base font-semibold text-brand-heading">{b.name}</h3>
                  <Badge tone={b.active ? 'success' : 'neutral'}>
                    {b.active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <p className="text-sm text-text-secondary">{b.serviceArea}</p>
                <div className="flex items-center gap-4 text-xs text-text-muted">
                  <span>{b.ajccCount} AJCC{b.ajccCount === 1 ? '' : 's'}</span>
                  <span>{b.jurisdictionCount} ZIP{b.jurisdictionCount === 1 ? '' : 's'}</span>
                  <span>{b.contactCount} contact{b.contactCount === 1 ? '' : 's'}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AddBoardDrawer
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={(id) => router.push(`/admin/wioa/boards/${id}`)}
      />
    </div>
  );
}

function AddBoardDrawer({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (boardId: string) => void;
}) {
  const [name, setName] = useState('');
  const [county, setCounty] = useState('');
  const [serviceArea, setServiceArea] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [address, setAddress] = useState('');
  const [orientationUrl, setOrientationUrl] = useState('');
  const [applicationUrl, setApplicationUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setName('');
    setCounty('');
    setServiceArea('');
    setPhone('');
    setEmail('');
    setWebsite('');
    setAddress('');
    setOrientationUrl('');
    setApplicationUrl('');
  };

  const valid =
    name.trim().length > 0 &&
    county.trim().length > 0 &&
    serviceArea.trim().length > 0 &&
    phone.trim().length > 0 &&
    email.trim().length > 0 &&
    address.trim().length > 0;

  return (
    <Drawer
      open={open}
      onClose={() => {
        onClose();
        reset();
      }}
      title="Add Workforce Board"
      description="AJCC centers, ZIP jurisdictions, and contacts are added next, from the board's detail page."
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={!valid || submitting}
            onClick={async () => {
              setSubmitting(true);
              const { id } = await createWorkforceBoard({
                name: name.trim(),
                county: county.trim(),
                serviceArea: serviceArea.trim(),
                phone: phone.trim(),
                email: email.trim(),
                website: website.trim() || null,
                address: address.trim(),
                orientationUrl: orientationUrl.trim() || null,
                applicationUrl: applicationUrl.trim() || null,
              });
              setSubmitting(false);
              onClose();
              reset();
              onCreated(id);
            }}
          >
            Add Board
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Board name" htmlFor="board-name">
          <Input id="board-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </Field>
        <Field label="County" htmlFor="board-county">
          <Input id="board-county" value={county} onChange={(e) => setCounty(e.target.value)} />
        </Field>
        <Field label="Service area" htmlFor="board-service-area">
          <Input
            id="board-service-area"
            value={serviceArea}
            onChange={(e) => setServiceArea(e.target.value)}
          />
        </Field>
        <Field label="Phone" htmlFor="board-phone">
          <Input id="board-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <Field label="Email" htmlFor="board-email">
          <Input
            id="board-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label="Address" htmlFor="board-address">
          <Input id="board-address" value={address} onChange={(e) => setAddress(e.target.value)} />
        </Field>
        <Field label="Website (optional)" htmlFor="board-website">
          <Input id="board-website" value={website} onChange={(e) => setWebsite(e.target.value)} />
        </Field>
        <Field label="Orientation URL (optional)" htmlFor="board-orientation-url">
          <Input
            id="board-orientation-url"
            value={orientationUrl}
            onChange={(e) => setOrientationUrl(e.target.value)}
          />
        </Field>
        <Field label="Application URL (optional)" htmlFor="board-application-url">
          <Input
            id="board-application-url"
            value={applicationUrl}
            onChange={(e) => setApplicationUrl(e.target.value)}
          />
        </Field>
      </div>
    </Drawer>
  );
}
