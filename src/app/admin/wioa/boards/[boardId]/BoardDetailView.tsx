'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';

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
import type { ContactType, WioaEligibilityStatus } from '@/generated/prisma/enums';
import { Icon } from '@/components/icons';
import { WIOA_STATUS_LABEL } from '@/lib/wioa/status';
import { Badge } from '@/components/admin-ui/badge';
import { Button } from '@/components/admin-ui/button';
import { Card, CardContent } from '@/components/admin-ui/card';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/admin-ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/admin-ui/tabs';

/** Spec Section 17: "flag stale contacts for review" (docs/plans/wioa-spec-alignment-kickoff.md
 * #5). 180 days is a prototype default, same as the 14-day stalled-case threshold elsewhere in
 * this module — not a value the client has confirmed, just a sane one until they do. A contact
 * that's never been verified at all is stale by definition. */
const STALE_CONTACT_DAYS = 180;
function isContactStale(lastVerifiedDate: Date | null): boolean {
  if (!lastVerifiedDate) return true;
  const days = (Date.now() - new Date(lastVerifiedDate).getTime()) / 86_400_000;
  return days >= STALE_CONTACT_DAYS;
}

export function BoardDetailView({
  board,
  activeCases,
}: {
  board: WorkforceBoardDetail;
  activeCases: { id: string; learnerName: string; status: WioaEligibilityStatus }[];
}) {
  const router = useRouter();

  return (
    <Tabs defaultValue="board">
      <TabsList>
        <TabsTrigger value="board">Board details</TabsTrigger>
        <TabsTrigger value="ajcc">AJCC Centers ({board.ajccCenters.length})</TabsTrigger>
        <TabsTrigger value="zips">ZIP Jurisdictions ({board.jurisdictions.length})</TabsTrigger>
        <TabsTrigger value="contacts">Contacts ({board.contacts.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="board" className="pt-4">
        <div className="flex gap-4">
          <div className="flex-[1.1]">
            <BoardFieldsTab board={board} onSaved={() => router.refresh()} />
          </div>
          <div className="flex-1">
            <ActiveCasesPanel cases={activeCases} />
          </div>
        </div>
      </TabsContent>
      <TabsContent value="ajcc" className="pt-4">
        <AjccTab board={board} onChanged={() => router.refresh()} />
      </TabsContent>
      <TabsContent value="zips" className="pt-4">
        <JurisdictionTab board={board} onChanged={() => router.refresh()} />
      </TabsContent>
      <TabsContent value="contacts" className="pt-4">
        <ContactTab board={board} onChanged={() => router.refresh()} />
      </TabsContent>
    </Tabs>
  );
}

function BoardFieldsTab({ board, onSaved }: { board: WorkforceBoardDetail; onSaved: () => void }) {
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
    try {
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
      toast.success('Board details saved');
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save board details.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive() {
    setSaving(true);
    try {
      await setWorkforceBoardActive(board.id, !board.active);
      toast.success(board.active ? 'Board deactivated' : 'Board activated');
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not update the board.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <Badge variant={board.active ? 'success' : 'outline'}>
            {board.active ? 'Active' : 'Inactive'}
          </Badge>
          <Button size="sm" variant="outline" onClick={toggleActive} disabled={saving}>
            {board.active ? 'Deactivate board' : 'Activate board'}
          </Button>
        </div>
        <LabeledInput label="Board name" id="edit-board-name" value={name} onChange={setName} />
        <LabeledInput label="County" id="edit-board-county" value={county} onChange={setCounty} />
        <LabeledInput
          label="Service area"
          id="edit-board-service-area"
          value={serviceArea}
          onChange={setServiceArea}
        />
        <LabeledInput label="Phone" id="edit-board-phone" value={phone} onChange={setPhone} />
        <LabeledInput label="Email" id="edit-board-email" value={email} onChange={setEmail} />
        <LabeledInput
          label="Address"
          id="edit-board-address"
          value={address}
          onChange={setAddress}
        />
        <LabeledInput
          label="Website (optional)"
          id="edit-board-website"
          value={website}
          onChange={setWebsite}
        />
        <LabeledInput
          label="Orientation URL (optional)"
          id="edit-board-orientation-url"
          value={orientationUrl}
          onChange={setOrientationUrl}
        />
        <LabeledInput
          label="Application URL (optional)"
          id="edit-board-application-url"
          value={applicationUrl}
          onChange={setApplicationUrl}
        />
        <Button size="sm" onClick={save} disabled={saving} className="w-fit">
          {saving ? 'Saving…' : 'Save changes'}
        </Button>
      </CardContent>
    </Card>
  );
}

function LabeledInput({
  label,
  id,
  value,
  onChange,
  type,
}: {
  label: string;
  id: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function AjccTab({ board, onChanged }: { board: WorkforceBoardDetail; onChanged: () => void }) {
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<AjccCenterRecord | null>(null);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="size-4" />
          Add AJCC Center
        </Button>
      </div>

      {board.ajccCenters.length === 0 ? (
        <EmptyRow text="No AJCC centers yet." />
      ) : (
        <Card className="py-0">
          <div className="divide-y divide-border">
            {board.ajccCenters.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-4 p-4">
                <div>
                  <p className="text-sm font-medium text-foreground">{a.name}</p>
                  <p className="text-xs text-muted-foreground">{a.address}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={a.active ? 'success' : 'outline'}>
                    {a.active ? 'Active' : 'Inactive'}
                  </Badge>
                  <Button size="sm" variant="outline" onClick={() => setEditing(a)}>
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      try {
                        await setAjccCenterActive(board.id, a.id, !a.active);
                        toast.success(a.active ? 'AJCC center deactivated' : 'AJCC center activated');
                        onChanged();
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : 'Could not update the center.');
                      }
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

      <AjccDialog
        key={editing?.id ?? 'new'}
        boardId={board.id}
        open={addOpen || editing !== null}
        existing={editing}
        onOpenChange={(open) => {
          if (!open) {
            setAddOpen(false);
            setEditing(null);
          }
        }}
        onSaved={onChanged}
      />
    </div>
  );
}

function AjccDialog({
  boardId,
  open,
  existing,
  onOpenChange,
  onSaved,
}: {
  boardId: string;
  open: boolean;
  existing: AjccCenterRecord | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(existing?.name ?? '');
  const [address, setAddress] = useState(existing?.address ?? '');
  const [phone, setPhone] = useState(existing?.phone ?? '');
  const [website, setWebsite] = useState(existing?.website ?? '');
  const [intakeInstructions, setIntakeInstructions] = useState(existing?.intakeInstructions ?? '');
  const [submitting, setSubmitting] = useState(false);

  const valid = name.trim().length > 0 && address.trim().length > 0 && phone.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existing ? 'Edit AJCC center' : 'Add AJCC center'}</DialogTitle>
        </DialogHeader>
        <div className="flex max-h-96 flex-col gap-3 overflow-y-auto pr-1">
          <LabeledInput label="Name" id="ajcc-name" value={name} onChange={setName} />
          <LabeledInput label="Address" id="ajcc-address" value={address} onChange={setAddress} />
          <LabeledInput label="Phone" id="ajcc-phone" value={phone} onChange={setPhone} />
          <LabeledInput
            label="Website (optional)"
            id="ajcc-website"
            value={website}
            onChange={setWebsite}
          />
          <LabeledInput
            label="Intake instructions (optional)"
            id="ajcc-intake"
            value={intakeInstructions}
            onChange={setIntakeInstructions}
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
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
              try {
                if (existing) {
                  await updateAjccCenter(boardId, existing.id, fields);
                } else {
                  await createAjccCenter(boardId, fields);
                }
                toast.success(existing ? 'AJCC center updated' : 'AJCC center added');
                onOpenChange(false);
                onSaved();
              } catch (e) {
                toast.error(e instanceof Error ? e.message : 'Could not save the center.');
              } finally {
                setSubmitting(false);
              }
            }}
          >
            {existing ? 'Save changes' : 'Add center'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
          <Plus className="size-4" />
          Add ZIP
        </Button>
      </div>

      {board.jurisdictions.length === 0 ? (
        <EmptyRow text="No ZIPs mapped to this board yet." />
      ) : (
        <Card className="py-0">
          <div className="divide-y divide-border">
            {board.jurisdictions.map((j) => (
              <div key={j.id} className="flex items-center justify-between gap-4 p-4">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {j.zip} — {j.city}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {ajccName(j.ajccCenterId) ?? 'No AJCC assigned'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={j.active ? 'success' : 'outline'}>
                    {j.active ? 'Active' : 'Inactive'}
                  </Badge>
                  <Button size="sm" variant="outline" onClick={() => setEditing(j)}>
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      try {
                        await setWorkforceJurisdictionActive(board.id, j.id, !j.active);
                        toast.success(j.active ? 'ZIP deactivated' : 'ZIP activated');
                        onChanged();
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : 'Could not update the ZIP.');
                      }
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

      <JurisdictionDialog
        key={editing?.id ?? 'new'}
        boardId={board.id}
        ajccCenters={board.ajccCenters}
        open={addOpen || editing !== null}
        existing={editing}
        onOpenChange={(open) => {
          if (!open) {
            setAddOpen(false);
            setEditing(null);
          }
        }}
        onSaved={onChanged}
      />
    </div>
  );
}

function JurisdictionDialog({
  boardId,
  ajccCenters,
  open,
  existing,
  onOpenChange,
  onSaved,
}: {
  boardId: string;
  ajccCenters: AjccCenterRecord[];
  open: boolean;
  existing: WorkforceJurisdictionRecord | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [zip, setZip] = useState(existing?.zip ?? '');
  const [city, setCity] = useState(existing?.city ?? '');
  const [county, setCounty] = useState(existing?.county ?? '');
  const [ajccCenterId, setAjccCenterId] = useState(existing?.ajccCenterId ?? '');
  const [submitting, setSubmitting] = useState(false);

  const valid = zip.trim().length > 0 && city.trim().length > 0 && county.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existing ? 'Edit ZIP jurisdiction' : 'Add ZIP jurisdiction'}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <LabeledInput label="ZIP code" id="jur-zip" value={zip} onChange={setZip} />
          <LabeledInput label="City" id="jur-city" value={city} onChange={setCity} />
          <LabeledInput label="County" id="jur-county" value={county} onChange={setCounty} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="jur-ajcc">AJCC Center (optional)</Label>
            <Select
              value={ajccCenterId || '__none__'}
              onValueChange={(v) => setAjccCenterId(v === '__none__' ? '' : v)}
            >
              <SelectTrigger id="jur-ajcc" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {ajccCenters.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              const fields = {
                zip: zip.trim(),
                city: city.trim(),
                county: county.trim(),
                ajccCenterId: ajccCenterId || null,
              };
              try {
                if (existing) {
                  await updateWorkforceJurisdiction(boardId, existing.id, fields);
                } else {
                  await createWorkforceJurisdiction(boardId, fields);
                }
                toast.success(existing ? 'ZIP jurisdiction updated' : 'ZIP jurisdiction added');
                onOpenChange(false);
                onSaved();
              } catch (e) {
                toast.error(e instanceof Error ? e.message : 'Could not save the jurisdiction.');
              } finally {
                setSubmitting(false);
              }
            }}
          >
            {existing ? 'Save changes' : 'Add ZIP'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
          <Plus className="size-4" />
          Add Contact
        </Button>
      </div>

      {board.contacts.length === 0 ? (
        <EmptyRow text="No contacts yet." />
      ) : (
        <Card className="py-0">
          <div className="divide-y divide-border">
            {board.contacts.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-4 p-4">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {c.name} {c.title && <span className="text-muted-foreground">· {c.title}</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {c.email} · {c.phone} · {ajccName(c.ajccCenterId) ?? 'Board-level'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {c.lastVerifiedDate
                      ? `Last verified ${new Date(c.lastVerifiedDate).toLocaleDateString()}`
                      : 'Never verified'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{c.contactType}</Badge>
                  <Badge variant={c.active ? 'success' : 'outline'}>
                    {c.active ? 'Active' : 'Inactive'}
                  </Badge>
                  {isContactStale(c.lastVerifiedDate) && <Badge variant="warning">Stale</Badge>}
                  <Button size="sm" variant="outline" onClick={() => setEditing(c)}>
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      try {
                        await setWorkforceContactActive(board.id, c.id, !c.active);
                        toast.success(c.active ? 'Contact deactivated' : 'Contact activated');
                        onChanged();
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : 'Could not update the contact.');
                      }
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

      <ContactDialog
        key={editing?.id ?? 'new'}
        boardId={board.id}
        ajccCenters={board.ajccCenters}
        open={addOpen || editing !== null}
        existing={editing}
        onOpenChange={(open) => {
          if (!open) {
            setAddOpen(false);
            setEditing(null);
          }
        }}
        onSaved={onChanged}
      />
    </div>
  );
}

function ContactDialog({
  boardId,
  ajccCenters,
  open,
  existing,
  onOpenChange,
  onSaved,
}: {
  boardId: string;
  ajccCenters: AjccCenterRecord[];
  open: boolean;
  existing: WorkforceContactRecord | null;
  onOpenChange: (open: boolean) => void;
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

  const valid = name.trim().length > 0 && email.trim().length > 0 && phone.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existing ? 'Edit contact' : 'Add contact'}</DialogTitle>
          <DialogDescription>
            Matching picks the lowest-priority PRIMARY contact first, falling back to SECONDARY then
            GENERAL.
          </DialogDescription>
        </DialogHeader>
        <div className="flex max-h-96 flex-col gap-3 overflow-y-auto pr-1">
          <LabeledInput label="Name" id="contact-name" value={name} onChange={setName} />
          <LabeledInput
            label="Title (optional)"
            id="contact-title"
            value={title}
            onChange={setTitle}
          />
          <LabeledInput label="Email" id="contact-email" value={email} onChange={setEmail} />
          <LabeledInput label="Phone" id="contact-phone" value={phone} onChange={setPhone} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="contact-type">Contact type</Label>
            <Select value={contactType} onValueChange={(v) => setContactType(v as ContactType)}>
              <SelectTrigger id="contact-type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONTACT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <LabeledInput
            label="Priority (lower = tried first)"
            id="contact-priority"
            type="number"
            value={priority}
            onChange={(v) => setPriority(Number(v))}
          />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="contact-ajcc">AJCC Center (optional)</Label>
            <Select
              value={ajccCenterId || '__none__'}
              onValueChange={(v) => setAjccCenterId(v === '__none__' ? '' : v)}
            >
              <SelectTrigger id="contact-ajcc" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Board-level (no specific center)</SelectItem>
                {ajccCenters.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              const fields = {
                name: name.trim(),
                title: title.trim() || null,
                email: email.trim(),
                phone: phone.trim(),
                contactType,
                priority,
                ajccCenterId: ajccCenterId || null,
              };
              try {
                if (existing) {
                  await updateWorkforceContact(boardId, existing.id, fields);
                } else {
                  await createWorkforceContact(boardId, fields);
                }
                toast.success(existing ? 'Contact updated' : 'Contact added');
                onOpenChange(false);
                onSaved();
              } catch (e) {
                toast.error(e instanceof Error ? e.message : 'Could not save the contact.');
              } finally {
                setSubmitting(false);
              }
            }}
          >
            {existing ? 'Save changes' : 'Add contact'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const FUNDED_CASE_STATUSES: WioaEligibilityStatus[] = ['WIOA_ELIGIBLE'];

const CASES_PAGE_SIZE = 10;

/** WIOA02-BoardDetail's "Active cases" + "Contracts on file" panel. The case list is real (every
 * open WioaCase matched to this board); the contract-file section is disclosed rather than
 * fabricated — no file-upload feature exists anywhere for a board's own service agreement yet. */
function ActiveCasesPanel({
  cases,
}: {
  cases: { id: string; learnerName: string; status: WioaEligibilityStatus }[];
}) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(cases.length / CASES_PAGE_SIZE));
  const pageRows = cases.slice((page - 1) * CASES_PAGE_SIZE, page * CASES_PAGE_SIZE);

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div style={{ fontWeight: 600, fontSize: 14.5 }}>Active cases — {cases.length}</div>
        {cases.length === 0 ? (
          <p className="text-sm text-muted-foreground">No open cases matched to this board.</p>
        ) : (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Learner</th>
                  <th>Stage</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((c) => (
                  <tr key={c.id}>
                    <td>{c.learnerName}</td>
                    <td>
                      <span
                        className={
                          FUNDED_CASE_STATUSES.includes(c.status)
                            ? 'badge-complete'
                            : 'badge-pending'
                        }
                      >
                        {WIOA_STATUS_LABEL[c.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="table-footer">
              <span>
                Showing {pageRows.length} of {cases.length}
              </span>
              <span>
                Page {page} of {pageCount}
              </span>
            </div>
            {pageCount > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
                <button
                  type="button"
                  className="dtbtn"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="dtbtn"
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                  disabled={page === pageCount}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}

        <div style={{ borderTop: '1px solid var(--nfcap-border)', paddingTop: 14, marginTop: 2 }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Contracts on file</div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 12.5,
              color: 'var(--ink-faint)',
            }}
          >
            <Icon name="file-text" className="h-3.5 w-3.5" />
            Not yet built — no file-upload feature exists for a board&apos;s service agreement.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyRow({ text }: { text: string }) {
  return (
    <Card>
      <div className="py-8 text-center text-sm text-muted-foreground">{text}</div>
    </Card>
  );
}
