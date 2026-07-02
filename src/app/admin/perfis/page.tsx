import { requirePagePermission } from "@/lib/auth";
import { listRolePermissionManagement } from "@/lib/services/roles";
import { RolePermissionManager } from "@/components/admin/role-permission-manager";

export default async function RolesPage() {
  await requirePagePermission("roles.view");
  const dashboard = await listRolePermissionManagement();

  return <RolePermissionManager permissions={dashboard.permissions} roles={dashboard.roles} />;
}
