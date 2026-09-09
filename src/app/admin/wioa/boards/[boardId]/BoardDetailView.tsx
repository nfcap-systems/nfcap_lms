'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge, Button, Card, CardContent, Drawer, Field, Input, Select } from '@/components/ui';
import { Icon } from '@/components/icons';
import {
  updateWorkforceBoard,
  setWorkforceBoardActive,
  createAjccCenter,
  updateAjccCenter,
  setAjccCenterActive,
  createWorkforceJurisdiction,
  updateWorkforceJurisdiction,
  setWorkforceJurisdictionActive,
  createWorkforceContact,
  updateWorkforceContact,
  setWorkforceContactActive,
} from '@/lib/actions/wioa-boards';
import type {
  WorkforceBoardDetail,
  AjccCenterRecord,
  WorkforceJurisdictionRecord,
  WorkforceContactRecord,
} from '@/lib/data/wioa-boards';
import type { ContactType } from '@/generated/prisma/enums';

type Tab = 'board' | 'ajcc' | 'zips' | 'contacts';

export function BoardDetailView({ board }: { board: WorkforceBoardDetail }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('board');

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'board', label: 'Board details' },
    { key: 'ajcc', label: 'AJCC Centers', count: board.ajccCenters.length },
    { key: 'zips', label: 'ZIP Jurisdictions', count: board.jurisdictions.length },
    { key: 'contacts', label: 'Contacts', count: board.contacts.length },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2 border-b border-border-subtle">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              tab === t.key
                ? 'border-brand-primary text-brand-primary'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            {t.label}
            {t.count !== undefined && <span className="ml-1 text-xs text-text-muted">({t.count})</span>}
          </button>
        ))}
      </div>

      {tab === 'board' && <BoardFieldsTab board={board} onSaved={() => router.refresh()} />}
      {tab === 'ajcc' && <AjccTab board={board} onChanged={() => router.refresh()} />}
      {tab === 'zips' && <JurisdictionTab board={board} onChanged={() => router.refresh()} />}
      {tab === 'contacts' && <ContactTab board={board} onChanged={() => router.refresh()} />}
    </div>
  );
}

function BoardFieldsTab({
  board,
  onSaved,
}: {
  board: WorkforceBoardDetail;
  onSaved: () => void;
}) {
  const [name, setName] = useState(board.name);
  const [county, setCounty] = useState(board.county);
  const [serviceArea, setServiceArea] = useState(board.serviceArea);
  const [phone, setPhone] = useState(board.phone);
  const [email, setEmail] = useState(board.email);
  const [website, setWebsite] = useState(board.website ?? '');
  const [address, setAddress] = useState(board.address);
  const [orientationUrl, setOrientationUrl] = useState(board.orientationUrl ?? '');
  const [applicationUrl, setApplicationUrl] = useState(board.applicationUrl ?? '');
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await updateWorkforceBoard(board.id, {
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
    setSaving(false);
    onSaved();
  }

  async function toggleActive() {
    setSaving(true);
    await setWorkforceBoardActive(board.id, !board.active);
    setSaving(false);
    onSaved();
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <Badge tone={board.active ? 'success' : 'neutral'}>
            {board.active ? 'Active' : 'Inactive'}
          </Badge>
          <Button size="sm" variant="outline" onClick={toggleActive} disabled={saving}>
            {board.active ? 'Deactivate board' : 'Activate board'}
          </Button>
        </div>
        <Field label="Board name" htmlFor="edit-board-name">
          <Input id="edit-board-name" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="County" htmlFor="edit-board-county">
          <Input id="edit-board-county" value={county} onChange={(e) => setCounty(e.target.value)} />
        </Field>
        <Field label="Service area" htmlFor="edit-board-service-area">
          <Input
            id="edit-board-service-area"
            value={serviceArea}
            onChange={(e) => setServiceArea(e.target.value)}
          />
        </Field>
        <Field label="Phone" htmlFor="edit-board-phone">
          <Input id="edit-board-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <Field label="Email" htmlFor="edit-board-email">
          <Input id="edit-board-email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Address" htmlFor="edit-board-address">
          <Input
            id="edit-board-address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </Field>
        <Field label="Website (optional)" htmlFor="edit-board-website">
          <Input
            id="edit-board-website"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </Field>
        <Field label="Orientation URL (optional)" htmlFor="edit-board-orientation-url">
          <Input
            id="edit-board-orientation-url"
            value={orientationUrl}
            onChange={(e) => setOrientationUrl(e.target.value)}
          />
        </Field>
        <Field label="Application URL (optional)" htmlFor="edit-board-application-url">
          <Input
            id="edit-board-application-url"
            value={applicationUrl}
            onChange={(e) => setApplicationUrl(e.target.value)}
          />
        </Field>
        <Button size="sm" onClick={save} disabled={saving} className="w-fit">
          {saving ? 'Saving…' : 'Save changes'}
        </Button>
      </CardContent>
    </Card>
  );
}

function AjccTab({ board, onChanged }: { board: WorkforceBoardDetail; onChanged: () => void }) {
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<AjccCenterRecord | null>(null);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Icon name="plus" className="size-4" />
          Add AJCC Center
        </Button>
      </div>

      {board.ajccCenters.length === 0 ? (
        <EmptyRow text="No AJCC centers yet." />
      ) : (
        <Card>
          <div className="divide-y divide-border-subtle">
            {board.ajccCenters.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-4 p-4">
                <div>
                  <p className="text-sm font-medium text-text-primary">{a.name}</p>
                  <p className="text-xs text-text-muted">{a.address}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={a.active ? 'success' : 'neutral'}>
                    {a.active ? 'Active' : 'Inactive'}
                  </Badge>
                  <Button size="sm" variant="outline" onClick={() => setEditing(a)}>
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      await setAjccCenterActive(board.id, a.id, !a.active);
                      onChanged();
                    }}
                  >
                    {a.active ? 'Deactivate' : 'Activate'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <AjccDrawer
        key={editing?.id ?? 'new'}
        boardId={board.id}
        open={addOpen || editing !== null}
        existing={editing}
        onClose={() => {
          setAddOpen(false);
          setEditing(null);
        }}
        onSaved={onChanged}
      />
    </div>
  );
}

function AjccDrawer({
  boardId,
  open,
  existing,
  onClose,
  onSaved,
}: {
  boardId: string;
  open: boolean;
  existing: AjccCenterRecord | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(existing?.name ?? '');
  const [address, setAddress] = useState(existing?.address ?? '');
  const [phone, setPhone] = useState(existing?.phone ?? '');
  const [website, setWebsite] = useState(existing?.website ?? '');
  const [intakeInstructions, setIntakeInstructions] = useState(existing?.intakeInstructions ?? '');
  const [submitting, setSubmitting] = useState(false);

  // Re-seed the form fields whenever the drawer opens for a (possibly different) record — this
  // component is remounted on every open/close via the `key` the parent passes, so a plain
  // useState initializer is enough (no useEffect needed).
  if (!open) return null;

  const valid = name.trim().length > 0 && address.trim().length > 0 && phone.trim().length > 0;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={existing ? 'Edit AJCC Center' : 'Add AJCC Center'}
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
              const fields = {
                name: name.trim(),
                address: address.trim(),
                phone: phone.trim(),
                website: website.trim() || null,
                intakeInstructions: intakeInstructions.trim() || null,
              };
              if (existing) {
                await updateAjccCenter(boardId, existing.id, fields);
              } else {
                await createAjccCenter(boardId, fields);
              }
              setSubmitting(false);
              onClose();
              onSaved();
            }}
          >
            {existing ? 'Save changes' : 'Add Center'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Name" htmlFor="ajcc-name">
          <Input id="ajcc-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </Field>
        <Field label="Address" htmlFor="ajcc-address">
          <Input id="ajcc-address" value={address} onChange={(e) => setAddress(e.target.value)} />
        </Field>
        <Field label="Phone" htmlFor="ajcc-phone">
          <Input id="ajcc-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <Field label="Website (optional)" htmlFor="ajcc-website">
          <Input id="ajcc-website" value={website} onChange={(e) => setWebsite(e.target.value)} />
        </Field>
        <Field label="Intake instructions (optional)" htmlFor="ajcc-intake">
          <Input
            id="ajcc-intake"
            value={intakeInstructions}
            onChange={(e) => setIntakeInstructions(e.target.value)}
          />
        </Field>
      </div>
    </Drawer>
  );
}

function JurisdictionTab({
  board,
  onChanged,
}: {
  board: WorkforceBoardDetail;
  onChanged: () => void;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<WorkforceJurisdictionRecord | null>(null);
  const ajccName = (id: string | null) => board.ajccCenters.find((a) => a.id === id)?.name ?? null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Icon name="plus" className="size-4" />
          Add ZIP
        </Button>
      </div>

      {board.jurisdictions.length === 0 ? (
        <EmptyRow text="No ZIPs mapped to this board yet." />
      ) : (
        <Card>
          <div className="divide-y divide-border-subtle">
            {board.jurisdictions.map((j) => (
              <div key={j.id} className="flex items-center justify-between gap-4 p-4">
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    {j.zip} — {j.city}
                  </p>
                  <p className="text-xs text-text-muted">
                    {ajccName(j.ajccCenterId) ?? 'No AJCC assigned'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={j.active ? 'success' : 'neutral'}>
                    {j.active ? 'Active' : 'Inactive'}
                  </Badge>
                  <Button size="sm" variant="outline" onClick={() => setEditing(j)}>
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      await setWorkforceJurisdictionActive(board.id, j.id, !j.active);
                      onChanged();
                    }}
                  >
                    {j.active ? 'Deactivate' : 'Activate'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <JurisdictionDrawer
        key={editing?.id ?? 'new'}
        boardId={board.id}
        ajccCenters={board.ajccCenters}
        open={addOpen || editing !== null}
        existing={editing}
        onClose={() => {
          setAddOpen(false);
          setEditing(null);
        }}
        onSaved={onChanged}
      />
    </div>
  );
}

function JurisdictionDrawer({
  boardId,
  ajccCenters,
  open,
  existing,
  onClose,
  onSaved,
}: {
  boardId: string;
  ajccCenters: AjccCenterRecord[];
  open: boolean;
  existing: WorkforceJurisdictionRecord | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [zip, setZip] = useState(existing?.zip ?? '');
  const [city, setCity] = useState(existing?.city ?? '');
  const [county, setCounty] = useState(existing?.county ?? '');
  const [ajccCenterId, setAjccCenterId] = useState(existing?.ajccCenterId ?? '');
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const valid = zip.trim().length > 0 && city.trim().length > 0 && county.trim().length > 0;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={existing ? 'Edit ZIP Jurisdiction' : 'Add ZIP Jurisdiction'}
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
              const fields = {
                zip: zip.trim(),
                city: city.trim(),
                county: county.trim(),
                ajccCenterId: ajccCenterId || null,
              };
              if (existing) {
                await updateWorkforceJurisdiction(boardId, existing.id, fields);
              } else {
                await createWorkforceJurisdiction(boardId, fields);
              }
              setSubmitting(false);
              onClose();
              onSaved();
            }}
          >
            {existing ? 'Save changes' : 'Add ZIP'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="ZIP code" htmlFor="jur-zip">
          <Input id="jur-zip" value={zip} onChange={(e) => setZip(e.target.value)} autoFocus />
        </Field>
        <Field label="City" htmlFor="jur-city">
          <Input id="jur-city" value={city} onChange={(e) => setCity(e.target.value)} />
        </Field>
        <Field label="County" htmlFor="jur-county">
          <Input id="jur-county" value={county} onChange={(e) => setCounty(e.target.value)} />
        </Field>
        <Field label="AJCC Center (optional)" htmlFor="jur-ajcc">
          <Select
            id="jur-ajcc"
            value={ajccCenterId}
            onChange={(e) => setAjccCenterId(e.target.value)}
          >
            <option value="">None</option>
            {ajccCenters.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
    </Drawer>
  );
}

const CONTACT_TYPES: ContactType[] = ['PRIMARY', 'SECONDARY', 'GENERAL'];

function ContactTab({ board, onChanged }: { board: WorkforceBoardDetail; onChanged: () => void }) {
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<WorkforceContactRecord | null>(null);
  const ajccName = (id: string | null) => board.ajccCenters.find((a) => a.id === id)?.name ?? null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Icon name="plus" className="size-4" />
          Add Contact
        </Button>
      </div>

      {board.contacts.length === 0 ? (
        <EmptyRow text="No contacts yet." />
      ) : (
        <Card>
          <div className="divide-y divide-border-subtle">
            {board.contacts.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-4 p-4">
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    {c.name} {c.title && <span className="text-text-muted">· {c.title}</span>}
                  </p>
                  <p className="text-xs text-text-muted">
                    {c.email} · {c.phone} · {ajccName(c.ajccCenterId) ?? 'Board-level'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone="info">{c.contactType}</Badge>
                  <Badge tone={c.active ? 'success' : 'neutral'}>
                    {c.active ? 'Active' : 'Inactive'}
                  </Badge>
                  <Button size="sm" variant="outline" onClick={() => setEditing(c)}>
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      await setWorkforceContactActive(board.id, c.id, !c.active);
                      onChanged();
                    }}
                  >
                    {c.active ? 'Deactivate' : 'Activate'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <ContactDrawer
        key={editing?.id ?? 'new'}
        boardId={board.id}
        ajccCenters={board.ajccCenters}
        open={addOpen || editing !== null}
        existing={editing}
        onClose={() => {
          setAddOpen(false);
          setEditing(null);
        }}
        onSaved={onChanged}
      />
    </div>
  );
}

function ContactDrawer({
  boardId,
  ajccCenters,
  open,
  existing,
  onClose,
  onSaved,
}: {
  boardId: string;
  ajccCenters: AjccCenterRecord[];
  open: boolean;
  existing: WorkforceContactRecord | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(existing?.name ?? '');
  const [title, setTitle] = useState(existing?.title ?? '');
  const [email, setEmail] = useState(existing?.email ?? '');
  const [phone, setPhone] = useState(existing?.phone ?? '');
  const [contactType, setContactType] = useState<ContactType>(existing?.contactType ?? 'PRIMARY');
  const [priority, setPriority] = useState(existing?.priority ?? 0);
  const [ajccCenterId, setAjccCenterId] = useState(existing?.ajccCenterId ?? '');
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const valid = name.trim().length > 0 && email.trim().length > 0 && phone.trim().length > 0;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={existing ? 'Edit Contact' : 'Add Contact'}
      description="Matching picks the lowest-priority PRIMARY contact first, falling back to SECONDARY then GENERAL."
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
              const fields = {
                name: name.trim(),
                title: title.trim() || null,
                email: email.trim(),
                phone: phone.trim(),
                contactType,
                priority,
                ajccCenterId: ajccCenterId || null,
              };
              if (existing) {
                await updateWorkforceContact(boardId, existing.id, fields);
              } else {
                await createWorkforceContact(boardId, fields);
              }
              setSubmitting(false);
              onClose();
              onSaved();
            }}
          >
            {existing ? 'Save changes' : 'Add Contact'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Name" htmlFor="contact-name">
          <Input id="contact-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </Field>
        <Field label="Title (optional)" htmlFor="contact-title">
          <Input id="contact-title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="Email" htmlFor="contact-email">
          <Input id="contact-email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Phone" htmlFor="contact-phone">
          <Input id="contact-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <Field label="Contact type" htmlFor="contact-type">
          <Select
            id="contact-type"
            value={contactType}
            onChange={(e) => setContactType(e.target.value as ContactType)}
          >
            {CONTACT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Priority (lower = tried first)" htmlFor="contact-priority">
          <Input
            id="contact-priority"
            type="number"
            value={priority}
            onChange={(e) => setPriority(Number(e.target.value))}
          />
        </Field>
        <Field label="AJCC Center (optional)" htmlFor="contact-ajcc">
          <Select
            id="contact-ajcc"
            value={ajccCenterId}
            onChange={(e) => setAjccCenterId(e.target.value)}
          >
            <option value="">Board-level (no specific center)</option>
            {ajccCenters.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
    </Drawer>
  );
}

function EmptyRow({ text }: { text: string }) {
  return (
    <Card>
      <div className="py-8 text-center text-sm text-text-secondary">{text}</div>
    </Card>
  );
}
