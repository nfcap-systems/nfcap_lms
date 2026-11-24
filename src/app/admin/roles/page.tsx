import { getAuthUser } from '@/lib/supabase/server';
import { getAllUsersWithRoles } from '@/lib/data/users';
import { RoleManagementTable } from '@/components/admin/RoleManagementTable';

export default async function AdminRolesPage() {
  const user = await getAuthUser();
  const users = await getAllUsersWithRoles();

  return (
    <div className="flex flex-col gap-4">
      <div className="pagehdr">
        <div>
          <h1>Roles &amp; Access</h1>
          <p>New accounts start as Learner.</p>
        </div>
      </div>

      <RoleManagementTable users={users} currentUserId={user?.id ?? ''} />
    </div>
  );
}
