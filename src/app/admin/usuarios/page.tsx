import { requirePagePermission } from "@/lib/auth";
import { listUserManagement } from "@/lib/services/users";
import { UserManager } from "@/components/admin/user-manager";

export default async function UsersPage() {
  await requirePagePermission("users.view");
  const dashboard = await listUserManagement();

  return <UserManager roles={dashboard.roles} users={dashboard.users} />;
}
