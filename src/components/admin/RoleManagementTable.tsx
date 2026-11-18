'use client';

import { useState } from 'react';
import { updateUserRole } from '@/lib/actions/roles';
import { setUserActive } from '@/lib/actions/users';
import { ALL_ROLES, ROLE_DISPLAY_LABEL, type Role } from '@/lib/roles';
import type { UserRecord } from '@/lib/data/users';
import { Badge } from '@/components/admin-ui/badge';
import { Button } from '@/components/admin-ui/button';
import { Card } from '@/components/admin-ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/admin-ui/select';

type ActionMessage = { type: 'error' | 'success'; text: string } | null;

function InlineMessage({ message }: { message: ActionMessage }) {
  if (!message) return null;
  return (
    <p
      className={
        message.type === 'error'
          ? 'text-xs text-destructive sm:basis-full'
          : 'text-xs text-green-600 sm:basis-full'
      }
    >
      {message.text}
    </p>
  );
}

function RoleRow({ user, isSelf }: { user: UserRecord; isSelf: boolean }) {
  const [role, setRole] = useState<Role | ''>(user.role ?? '');
  const [rolePending, setRolePending] = useState(false);
  const [roleMessage, setRoleMessage] = useState<ActionMessage>(null);

  const [active, setActive] = useState(user.active);
  const [activePending, setActivePending] = useState(false);
  const [activeMessage, setActiveMessage] = useState<ActionMessage>(null);

  const roleDirty = role !== (user.role ?? '');

  async function handleSaveRole() {
    if (!role) return;
    setRolePending(true);
    setRoleMessage(null);
    const result = await updateUserRole(user.id, role);
    setRolePending(false);
    if ('error' in result) {
      setRoleMessage({ type: 'error', text: result.error });
    } else {
      setRoleMessage({ type: 'success', text: 'Role updated.' });
    }
  }

  async function handleToggleActive() {
    const nextActive = !active;
    setActivePending(true);
    setActiveMessage(null);
    const result = await setUserActive(user.id, nextActive);
    setActivePending(false);
    if ('error' in result) {
      setActiveMessage({ type: 'error', text: result.error });
    } else {
      setActive(nextActive);
      setActiveMessage({
        type: 'success',
        text: nextActive ? 'Account reactivated.' : 'Account deactivated.',
      });
    }
  }

  return (
    <div className="flex flex-col gap-3 border-b p-4 last:border-b-0">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 truncate text-sm font-medium text-foreground">
            {user.name}
            {isSelf && <span className="text-xs font-normal text-muted-foreground">(you)</span>}
            <Badge variant={active ? 'success' : 'outline'}>
              {active ? 'Active' : 'Deactivated'}
            </Badge>
          </p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
          <Select
            value={role || '__unassigned__'}
            onValueChange={(v) => {
              setRole(v === '__unassigned__' ? '' : (v as Role));
              setRoleMessage(null);
            }}
          >
            <SelectTrigger className="h-9 w-44" aria-label={`Role for ${user.name}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {!user.role && <SelectItem value="__unassigned__">Unassigned</SelectItem>}
              {ALL_ROLES.map((r) => (
                <SelectItem key={r} value={r}>
                  {ROLE_DISPLAY_LABEL[r]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={handleSaveRole} disabled={!roleDirty || rolePending || !role}>
            {rolePending ? 'Saving…' : 'Save'}
          </Button>
          <Button
            size="sm"
            variant={active ? 'destructive' : 'outline'}
            onClick={handleToggleActive}
            disabled={activePending}
          >
            {activePending ? 'Saving…' : active ? 'Deactivate' : 'Reactivate'}
          </Button>
        </div>
      </div>

      <InlineMessage message={roleMessage} />
      <InlineMessage message={activeMessage} />
    </div>
  );
}

export function RoleManagementTable({
  users,
  currentUserId,
}: {
  users: UserRecord[];
  currentUserId: string;
}) {
  return (
    <Card className="py-0">
      {users.map((user) => (
        <RoleRow key={user.id} user={user} isSelf={user.id === currentUserId} />
      ))}
    </Card>
  );
}
