import { getAuthUser } from '@/lib/supabase/server';
import { getAllUsersWithRoles } from '@/lib/data/users';
import { RoleManagementTable } from '@/components/admin/RoleManagementTable';

export default async function AdminRolesPage() {
  const user = await getAuthUser();
  const users = await getAllUsersWithRoles();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Role Management</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Assign or change a user&apos;s role, or deactivate an account that&apos;s leaving. New
          accounts start as Learner at signup.
        </p>
      </div>

      <RoleManagementTable users={users} currentUserId={user?.id ?? ''} />
    </div>
  );
}
