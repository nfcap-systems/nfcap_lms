'use client';

import { useMemo, useState } from 'react';
import { updateUserRole } from '@/lib/actions/roles';
import { setUserActive } from '@/lib/actions/users';
import { ALL_ROLES, ROLE_DISPLAY_LABEL, type Role } from '@/lib/roles';
import type { UserRecord } from '@/lib/data/users';
import { Icon } from '@/components/icons';
import { Pagination } from '@/components/ui';

type ActionMessage = { type: 'error' | 'success'; text: string } | null;

const PAGE_SIZE = 20;

function RoleRow({ user, isSelf }: { user: UserRecord; isSelf: boolean }) {
  const [role, setRole] = useState<Role | ''>(user.role ?? '');
  const [rolePending, setRolePending] = useState(false);
  const [roleMessage, setRoleMessage] = useState<ActionMessage>(null);

  const [active, setActive] = useState(user.active);
  const [activePending, setActivePending] = useState(false);
  const [activeMessage, setActiveMessage] = useState<ActionMessage>(null);

  const roleDirty = role !== (user.role ?? '');

  async function handleRoleChange(nextRole: Role) {
    setRole(nextRole);
    setRoleMessage(null);
    // The board implies an auto-saving role select with no separate confirmation step — a role
    // change grants real permissions, so an explicit Save (below) stays as a deliberate safety
    // choice, not a blind conform to the board's own simplified mockup.
  }

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
    <>
      <tr style={!active ? { opacity: 0.55 } : undefined}>
        <td className="tcol-check">
          <span className="tcheck" aria-label="Select row" />
        </td>
        <td>
          {user.name}
          {isSelf && (
            <span style={{ fontSize: 11.5, color: 'var(--ink-muted)', marginLeft: 6 }}>(you)</span>
          )}
        </td>
        <td style={{ color: 'var(--ink-muted)' }}>{user.email}</td>
        <td>
          <select
            className="field-select"
            style={{ height: 34, width: 150 }}
            value={role || '__unassigned__'}
            onChange={(e) => {
              const v = e.target.value;
              handleRoleChange(v === '__unassigned__' ? ('' as Role) : (v as Role));
            }}
            aria-label={`Role for ${user.name}`}
          >
            {!user.role && <option value="__unassigned__">Unassigned</option>}
            {ALL_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_DISPLAY_LABEL[r]}
              </option>
            ))}
          </select>
          {roleDirty && (
            <button
              type="button"
              className="btn-primary btn-sm"
              style={{ marginLeft: 8 }}
              onClick={handleSaveRole}
              disabled={rolePending || !role}
            >
              {rolePending ? 'Saving…' : 'Save'}
            </button>
          )}
        </td>
        <td>
          <span className={active ? 'badge-complete' : 'badge-neutral'}>
            {active ? 'Active' : 'Deactivated'}
          </span>
        </td>
        <td style={{ textAlign: 'right' }}>
          <button
            type="button"
            onClick={handleToggleActive}
            disabled={activePending}
            style={{
              fontSize: 12.5,
              fontWeight: 600,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: active ? 'var(--status-problem)' : 'var(--nfcap-accent)',
            }}
          >
            {activePending ? 'Saving…' : active ? 'Deactivate' : 'Reactivate'}
          </button>
        </td>
      </tr>
      {(roleMessage || activeMessage) && (
        <tr>
          <td />
          <td colSpan={5} style={{ paddingTop: 0, paddingBottom: 10 }}>
            {roleMessage && (
              <p
                style={{
                  fontSize: 12,
                  margin: 0,
                  color:
                    roleMessage.type === 'error'
                      ? 'var(--status-problem)'
                      : 'var(--status-complete)',
                }}
              >
                {roleMessage.text}
              </p>
            )}
            {activeMessage && (
              <p
                style={{
                  fontSize: 12,
                  margin: 0,
                  color:
                    activeMessage.type === 'error'
                      ? 'var(--status-problem)'
                      : 'var(--status-complete)',
                }}
              >
                {activeMessage.text}
              </p>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

export function RoleManagementTable({
  users,
  currentUserId,
}: {
  users: UserRecord[];
  currentUserId: string;
}) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return users;
    return users.filter(
      (u) => u.name.toLowerCase().includes(query) || u.email.toLowerCase().includes(query),
    );
  }, [users, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="flex flex-col gap-4">
      <div className="toolbar">
        <div className="dtsearch" style={{ maxWidth: 320 }}>
          <Icon name="search" className="h-3.5 w-3.5" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search name or email..."
            aria-label="Search users"
          />
        </div>
      </div>

      <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th className="tcol-check">
                <span className="tcheck" aria-label="Select all" />
              </th>
              <th>User</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--ink-muted)' }}
                >
                  No users found.
                </td>
              </tr>
            ) : (
              pageRows.map((user) => (
                <RoleRow key={user.id} user={user} isSelf={user.id === currentUserId} />
              ))
            )}
          </tbody>
        </table>
        <div className="table-footer">
          <span>
            Showing {pageRows.length} of {filtered.length}
          </span>
          <span>
            Rows per page: {PAGE_SIZE} · Page {page} of {pageCount}
          </span>
        </div>
      </div>

      {pageCount > 1 && <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />}
    </div>
  );
}
