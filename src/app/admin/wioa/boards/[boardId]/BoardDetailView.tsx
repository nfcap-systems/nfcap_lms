'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
import type { ContactType } from '@/generated/prisma/enums';
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

export function BoardDetailView({ board }: { board: WorkforceBoardDetail }) {
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
        <BoardFieldsTab board={board} onSaved={() => router.refresh()} />
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
              if (existing) {
                await updateAjccCenter(boardId, existing.id, fields);
              } else {
                await createAjccCenter(boardId, fields);
              }
              setSubmitting(false);
              onOpenChange(false);
              onSaved();
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
              if (existing) {
                await updateWorkforceJurisdiction(boardId, existing.id, fields);
              } else {
                await createWorkforceJurisdiction(boardId, fields);
              }
              setSubmitting(false);
              onOpenChange(false);
              onSaved();
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
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{c.contactType}</Badge>
                  <Badge variant={c.active ? 'success' : 'outline'}>
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
              if (existing) {
                await updateWorkforceContact(boardId, existing.id, fields);
              } else {
                await createWorkforceContact(boardId, fields);
              }
              setSubmitting(false);
              onOpenChange(false);
              onSaved();
            }}
          >
            {existing ? 'Save changes' : 'Add contact'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EmptyRow({ text }: { text: string }) {
  return (
    <Card>
      <div className="py-8 text-center text-sm text-muted-foreground">{text}</div>
    </Card>
  );
}
